const fsp = require('fs/promises');
const path = require('path');
const chardet = require('chardet');
const iconv = require('iconv-lite');
const { parse } = require('csv-parse');
const { validationError, internalError } = require('../utils/errors');

let cachedTotalRowCount = null;
let cachedTotalRowCountAt = 0;
let cachedTotalRowCountDir = null;
const TOTAL_COUNT_CACHE_TTL_MS = 30000;

function getContractsDir() {
  const configured = process.env.CONTRACTS_DIR;
  if (configured && typeof configured === 'string') {
    return configured;
  }
  return path.resolve(__dirname, '..', 'contracts');
}

function isSafeFilename(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.includes('..')) return false;
  if (name.includes('/') || name.includes('\\')) return false;
  return true;
}

function normalizeEncodingName(name) {
  if (!name) return 'utf8';
  const s = String(name).trim().toLowerCase();
  if (s === 'utf-8' || s === 'utf8') return 'utf8';
  if (s === 'gbk' || s === 'gb2312') return 'gbk';
  if (s === 'gb18030') return 'gb18030';
  return s;
}

function decodeCsvBuffer(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || '');
  const detected = normalizeEncodingName(chardet.detect(buf) || 'utf8');
  const encoding = iconv.encodingExists(detected) ? detected : 'utf8';
  const text = iconv.decode(buf, encoding);
  return { text: String(text || ''), encoding };
}

function createCsvParser(text, delimiter) {
  return parse(text, {
    bom: true,
    delimiter,
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: true,
    trim: true,
  });
}

function isEmptyCell(v) {
  return !String(v == null ? '' : v).trim();
}

function isLikelyNumericCell(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return false;
  return /^[\d\s.\-/:]+$/.test(s);
}

function isLikelyTextCell(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return false;
  return /[A-Za-z\u4e00-\u9fa5]/.test(s);
}

function scoreHeaderRecord(record) {
  const cells = Array.isArray(record) ? record : [];
  const trimmed = cells.map((x) => String(x == null ? '' : x).trim());
  const nonEmpty = trimmed.filter(Boolean).length;
  if (nonEmpty < 3) return -1;
  const uniq = new Set(trimmed.filter(Boolean)).size;
  const numericCount = trimmed.filter((x) => isLikelyNumericCell(x)).length;
  const textCount = trimmed.filter((x) => isLikelyTextCell(x)).length;
  return nonEmpty * 3 + uniq * 2 + textCount - numericCount * 2;
}

async function parseSampleRecords(text, delimiter, maxRecords = 50) {
  return new Promise((resolve, reject) => {
    const records = [];
    const parser = createCsvParser(text, delimiter);
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      resolve(records);
    };

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        records.push(record);
        if (records.length >= maxRecords) {
          try {
            parser.destroy();
          } catch (_e) {}
          break;
        }
      }
    });
    parser.on('error', (e) => {
      if (done) return;
      done = true;
      reject(e);
    });
    parser.on('end', finish);
    parser.on('close', finish);
  });
}

function pickHeaderIndexFromRecords(records, maxScan = 50) {
  const scan = Math.min(Array.isArray(records) ? records.length : 0, maxScan);
  let best = -1;
  let bestScore = -1;
  for (let i = 0; i < scan; i += 1) {
    const score = scoreHeaderRecord(records[i]);
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  }
  if (best === -1 || bestScore < 0) {
    return { index: -1, score: -1 };
  }
  return { index: best, score: bestScore };
}

async function detectCsvFormat(text) {
  const candidates = [',', ';', '\t'];
  let best = { delimiter: ',', headerIndex: -1, headerScore: -1, sample: [] };

  for (const delimiter of candidates) {
    let sample;
    try {
      sample = await parseSampleRecords(text, delimiter, 50);
    } catch (_e) {
      continue;
    }
    const picked = pickHeaderIndexFromRecords(sample, 50);
    if (picked.index === -1) continue;
    if (picked.score > best.headerScore) {
      best = {
        delimiter,
        headerIndex: picked.index,
        headerScore: picked.score,
        sample,
      };
    }
  }

  return best;
}

function repairFields(fieldsRaw, headerLength, delimiter) {
  const raw = Array.isArray(fieldsRaw) ? fieldsRaw.map((x) => String(x ?? '')) : [];
  const fixed = new Array(headerLength).fill('');
  if (headerLength <= 0) return fixed;

  if (raw.length > headerLength) {
    for (let i = 0; i < headerLength - 1; i += 1) {
      fixed[i] = String(raw[i] ?? '').trim();
    }
    fixed[headerLength - 1] = raw.slice(headerLength - 1).join(delimiter).trim();
    return fixed;
  }

  for (let i = 0; i < headerLength; i += 1) {
    fixed[i] = String(raw[i] ?? '').trim();
  }
  return fixed;
}

function normalizeHeader(fields) {
  const cols = (fields || []).map((x) => {
    const v = x == null ? '' : String(x).trim();
    return v;
  });

  const used = new Set();
  const normalized = cols.map((name, idx) => {
    const base = name || `col_${idx + 1}`;
    let candidate = base;
    let suffix = 1;
    while (used.has(candidate)) {
      suffix += 1;
      candidate = `${base}_${suffix}`;
    }
    used.add(candidate);
    return candidate;
  });

  return normalized;
}

function buildRowObject(header, fields) {
  const obj = {};
  for (let i = 0; i < header.length; i += 1) {
    obj[header[i]] = fields[i] == null ? '' : String(fields[i]);
  }
  return obj;
}

function rowMatchesSearch(fields, searchLower) {
  if (!searchLower) return true;
  const joined = (fields || []).map((x) => (x == null ? '' : String(x))).join(' ');
  return joined.toLowerCase().includes(searchLower);
}

function normalizeTags(tags) {
  const arr = Array.isArray(tags) ? tags : [];
  const out = [];
  const seen = new Set();
  for (const raw of arr) {
    if (raw === null || raw === undefined) continue;
    const tag = String(raw).trim();
    if (!tag) continue;
    const norm = tag.toLowerCase();
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push({ tag, norm });
    if (out.length >= 50) break;
  }
  return out;
}

function buildSearchTextFromRow(rowObj) {
  if (!rowObj || typeof rowObj !== 'object') return '';
  return Object.values(rowObj)
    .map((v) => (v == null ? '' : String(v)))
    .join(' ')
    .toLowerCase();
}

function computeMatches(rowObj, normalizedTags) {
  const searchText = buildSearchTextFromRow(rowObj);
  if (!searchText) {
    return { score: 0, matched_tags: [], matched_fields: {} };
  }

  const matchedTags = [];
  const matchedFields = {};

  for (const item of normalizedTags) {
    const tag = item?.tag;
    const norm = item?.norm;
    if (!norm) continue;
    if (!searchText.includes(norm)) continue;
    matchedTags.push(tag);

    const fields = [];
    for (const [k, v] of Object.entries(rowObj)) {
      const s = v == null ? '' : String(v).toLowerCase();
      if (s.includes(norm)) {
        fields.push(k);
      }
    }
    matchedFields[tag] = fields;
  }

  return {
    score: matchedTags.length,
    matched_tags: matchedTags,
    matched_fields: matchedFields,
  };
}

async function listContractFiles() {
  const baseDir = getContractsDir();

  let entries;
  try {
    entries = await fsp.readdir(baseDir);
  } catch (e) {
    if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) {
      return [];
    }
    throw internalError(e.message || '读取 contracts 目录失败');
  }

  const files = [];
  for (const name of entries) {
    if (!/\.csv$/i.test(name)) continue;
    const full = path.join(baseDir, name);
    let stat;
    try {
      stat = await fsp.stat(full);
    } catch (_e) {
      continue;
    }
    if (!stat.isFile()) continue;
    files.push({
      name,
      size: stat.size,
      modified_at: stat.mtime ? stat.mtime.toISOString() : null,
    });
  }

  files.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return files;
}

async function readContractFile({ name, search, maxRows = 5000 }) {
  if (!isSafeFilename(name) || !/\.csv$/i.test(name)) {
    throw validationError('name 不合法');
  }

  const baseDir = getContractsDir();
  const fullPath = path.join(baseDir, name);

  let buf;
  try {
    buf = await fsp.readFile(fullPath);
  } catch (e) {
    if (e && e.code === 'ENOENT') {
      throw validationError('文件不存在');
    }
    throw internalError(e.message || '读取 CSV 失败');
  }

  const decoded = decodeCsvBuffer(buf);
  const text = String(decoded.text || '').replace(/^\uFEFF/, '');

  const fmt = await detectCsvFormat(text);
  const headerIndex = fmt.headerIndex;
  const delimiter = fmt.delimiter;
  if (headerIndex === -1) {
    throw validationError('无法识别 CSV 表头');
  }

  const headerRaw = Array.isArray(fmt.sample?.[headerIndex]) ? fmt.sample[headerIndex] : [];
  const header = normalizeHeader(headerRaw);

  const searchLower = search ? String(search).toLowerCase() : '';
  const cap = Number.isFinite(Number(maxRows)) ? Math.max(1, Number(maxRows)) : 5000;

  const matched = [];
  const others = [];

  let totalRows = 0;
  let matchedTotal = 0;
  let malformedRows = 0;
  let repairedRows = 0;

  const parser = createCsvParser(text, delimiter);
  let recordIndex = -1;

  await new Promise((resolve, reject) => {
    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        recordIndex += 1;
        if (recordIndex <= headerIndex) continue;

        const allEmpty = (Array.isArray(record) ? record : []).every((x) => isEmptyCell(x));
        if (allEmpty) continue;

        totalRows += 1;

        const isMalformed = Array.isArray(record) && record.length !== header.length;
        if (isMalformed) {
          malformedRows += 1;
          repairedRows += 1;
        }

        const fields = repairFields(record, header.length, delimiter);
        const hit = rowMatchesSearch(fields, searchLower);
        if (hit) {
          matchedTotal += 1;
          if (matched.length < cap) {
            matched.push(buildRowObject(header, fields));
          }
        } else if (searchLower) {
          if (matched.length + others.length < cap) {
            others.push(buildRowObject(header, fields));
          }
        }
      }
    });
    parser.on('error', (e) => reject(e));
    parser.on('end', () => resolve());
  });

  const rows = searchLower ? matched.concat(others) : matched;
  const truncated = totalRows > rows.length;

  return {
    columns: header,
    rows,
    meta: {
      total_rows: totalRows,
      matched_rows: matchedTotal,
      returned_rows: rows.length,
      truncated,
      header_row_index: headerIndex,
      delimiter,
      encoding: decoded.encoding,
      malformed_rows: malformedRows,
      repaired_rows: repairedRows,
    },
  };
}

async function recommendContracts({ tags, topN = 10, maxRowsPerFile = 5000 }) {
  if (!Array.isArray(tags)) {
    throw validationError('tags 必须为数组');
  }

  const normalizedTags = normalizeTags(tags);
  const limit = Number.isFinite(Number(topN)) ? Math.max(1, Math.min(50, Number(topN))) : 10;
  const perFileCap = Number.isFinite(Number(maxRowsPerFile))
    ? Math.max(1, Math.min(5000, Number(maxRowsPerFile)))
    : 5000;

  if (normalizedTags.length === 0) {
    return {
      items: [],
      meta: {
        top_n: limit,
        tags_count: 0,
        files_scanned: 0,
        rows_scanned: 0,
      },
    };
  }

  const files = await listContractFiles();
  const top = [];
  let filesScanned = 0;
  let rowsScanned = 0;

  for (const f of files) {
    filesScanned += 1;

    const baseDir = getContractsDir();
    const fullPath = path.join(baseDir, f.name);

    let buf;
    try {
      buf = await fsp.readFile(fullPath);
    } catch (_e) {
      continue;
    }

    let text;
    let fmt;
    try {
      const decoded = decodeCsvBuffer(buf);
      text = String(decoded.text || '').replace(/^\uFEFF/, '');
      fmt = await detectCsvFormat(text);
    } catch (_e) {
      continue;
    }

    const headerIndex = fmt?.headerIndex;
    const delimiter = fmt?.delimiter;
    if (headerIndex === -1 || !delimiter) {
      continue;
    }

    const headerRaw = Array.isArray(fmt.sample?.[headerIndex]) ? fmt.sample[headerIndex] : [];
    const header = normalizeHeader(headerRaw);

    let fileRowIndex = 0;
    const parser = createCsvParser(text, delimiter);

    await new Promise((resolve, reject) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };

      let recordIndex = -1;
      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
          recordIndex += 1;
          if (recordIndex <= headerIndex) continue;

          const allEmpty = (Array.isArray(record) ? record : []).every((x) => isEmptyCell(x));
          if (allEmpty) continue;

          fileRowIndex += 1;
          if (fileRowIndex > perFileCap) {
            try {
              parser.destroy();
            } catch (_e) {}
            break;
          }

          const fields = repairFields(record, header.length, delimiter);
          const rowObj = buildRowObject(header, fields);
          const m = computeMatches(rowObj, normalizedTags);
          rowsScanned += 1;

          if (m.score <= 0) continue;

          const item = {
            file: f.name,
            score: m.score,
            matched_tags: m.matched_tags,
            matched_fields: m.matched_fields,
            row: rowObj,
            row_index: fileRowIndex,
          };

          if (top.length < limit) {
            top.push(item);
            top.sort((a, b) => b.score - a.score);
          } else {
            const last = top[top.length - 1];
            if (item.score > last.score) {
              top.push(item);
              top.sort((a, b) => b.score - a.score);
              top.length = limit;
            }
          }
        }
      });
      parser.on('error', (e) => {
        if (done) return;
        done = true;
        reject(e);
      });
      parser.on('end', finish);
      parser.on('close', finish);
    });
  }

  top.sort((a, b) => b.score - a.score);

  return {
    items: top,
    meta: {
      top_n: limit,
      tags_count: normalizedTags.length,
      files_scanned: filesScanned,
      rows_scanned: rowsScanned,
    },
  };
}

async function getContractsTotalRowCount() {
  const dir = getContractsDir();
  const now = Date.now();
  if (
    cachedTotalRowCount !== null &&
    cachedTotalRowCountDir === dir &&
    now - cachedTotalRowCountAt < TOTAL_COUNT_CACHE_TTL_MS
  ) {
    return cachedTotalRowCount;
  }

  const files = await listContractFiles();
  let total = 0;

  for (const f of files) {
    const fullPath = path.join(dir, f.name);

    let buf;
    try {
      buf = await fsp.readFile(fullPath);
    } catch (_e) {
      continue;
    }

    let text;
    let fmt;
    try {
      const decoded = decodeCsvBuffer(buf);
      text = String(decoded.text || '').replace(/^\uFEFF/, '');
      fmt = await detectCsvFormat(text);
    } catch (_e) {
      continue;
    }

    const headerIndex = fmt?.headerIndex;
    const delimiter = fmt?.delimiter;
    if (headerIndex === -1 || !delimiter) {
      continue;
    }

    const parser = createCsvParser(text, delimiter);
    let recordIndex = -1;
    await new Promise((resolve, reject) => {
      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
          recordIndex += 1;
          if (recordIndex <= headerIndex) continue;
          const allEmpty = (Array.isArray(record) ? record : []).every((x) => isEmptyCell(x));
          if (allEmpty) continue;
          total += 1;
        }
      });
      parser.on('error', (e) => reject(e));
      parser.on('end', () => resolve());
    });
  }

  cachedTotalRowCount = total;
  cachedTotalRowCountAt = now;
  cachedTotalRowCountDir = dir;
  return total;
}

module.exports = {
  listContractFiles,
  readContractFile,
  recommendContracts,
  getContractsTotalRowCount,
};
