/*
 用于本地验证 Doubao Provider 是否可用：
 1) 从 DB 读取当前模型配置（ai_model_configs.is_current=1）
 2) 使用 server/providers/ai/doubaoProvider.js 直接发起一次最小 Chat Completions 请求
 3) 打印返回的模型名称、请求耗时与首条消息内容

 使用方法：
   node server/scripts/test-doubao.js

 注意：该脚本会直连网络，请确保本机可访问 Doubao/方舟域名，且当前模型配置的 api_host 与 api_key 正确。
*/

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const doubaoProvider = require('../providers/ai/doubaoProvider');

function getDb() {
  const dbPath = path.join(__dirname, '..', 'ppa.db');
  return new sqlite3.Database(dbPath);
}

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function main() {
  const db = getDb();
  try {
    const model = await dbGet(db, 'SELECT * FROM ai_model_configs WHERE is_current = 1');
    if (!model) {
      console.error('未找到 is_current=1 的模型配置，请在“模型配置模块”设置当前使用模型');
      process.exit(2);
    }

    const { provider, api_host, api_key, model_name, max_tokens } = model;
    console.log('[配置]', { provider, api_host, model_name, api_key_set: !!api_key, max_tokens });

    if (!/doubao|volc/i.test(String(provider || ''))) {
      console.warn('警告：当前 provider 非 doubao/volc，将仍使用 Doubao Provider 进行尝试...');
    }

    if (!/^https?:\/\//.test(String(api_host || ''))) {
      console.error('api_host 非法，请设置为 https://...');
      process.exit(2);
    }

    // 最小化提示，要求输出一个 JSON 对象
    const prompt = '请返回一个 JSON：{"risk_scores":[{"item_name":"示例风险","suggested_score":2,"reason":"演示"}],"overall_suggestion":"OK"}';
    const requestHash = crypto.createHash('sha256').update(`${model_name}:${Date.now()}`).digest('hex');

    console.log('开始调用 Doubao Provider ...');
    const result = await doubaoProvider.createRiskAssessment({
      prompt,
      model: model_name,
      api_host,
      api_key,
      requestHash,
      timeoutMs: 15000,
      maxTokens: Number.isFinite(Number(max_tokens)) && Number(max_tokens) > 0 ? Number(max_tokens) : undefined,
    });

    const raw = result?.data || {};
    const content = raw?.choices?.[0]?.message?.content || raw?.choices?.[0]?.text || JSON.stringify(raw);
    console.log('\n[调用成功]');
    console.log('模型:', result.model);
    console.log('耗时(ms):', result.durationMs);
    console.log('内容预览:', content?.slice(0, 500));
  } catch (err) {
    console.error('\n[调用失败]', err?.message || err);
    if (err?.durationMs) {
      console.error('耗时(ms):', err.durationMs);
    }
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
