"""通用爬虫工具函数：文件名安全化、附件下载、输出目录管理等。"""

import csv
import json
import os
import random
import re
import time
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse, unquote

import requests


# 全局会话复用
SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    }
)


def safe_filename(name: str) -> str:
    """将任意字符串转为安全的文件/目录名"""
    if not name:
        return ""
    name = unquote(name)
    name = name.replace("\n", " ").replace("\r", " ")
    name = re.sub(r"[\\/:*?\"<>|]+", "_", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name[:200]


def download_file(url: str, dest_path: str, referer: Optional[str] = None, max_retries: int = 3) -> bool:
    """下载单个文件到指定路径，支持简单重试。"""
    try:
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        headers = {}
        if referer:
            headers["Referer"] = referer

        for attempt in range(1, max_retries + 1):
            try:
                with SESSION.get(url, stream=True, timeout=60, headers=headers) as r:
                    if r.status_code == 503:
                        # 可能是临时服务限流/不可用
                        time.sleep(2 * attempt)
                        continue
                    r.raise_for_status()
                    with open(dest_path, "wb") as f:
                        for chunk in r.iter_content(chunk_size=8192):
                            if chunk:
                                f.write(chunk)
                    return True
            except Exception as e:
                if attempt < max_retries:
                    time.sleep(2 * attempt)
                    continue
                raise

        return False

    except Exception as e:
        print(f"下载失败 {url} -> {dest_path}: {e}")
        return False


def _is_likely_url(s: str) -> bool:
    """判断字符串是否像一个可下载的 URL。"""
    if not s or not isinstance(s, str):
        return False
    s = s.strip()
    if not s:
        return False
    # 常见 URL 前缀
    if s.startswith("http://") or s.startswith("https://") or s.startswith("//"):
        return True
    if s.startswith("/"):
        return True
    if s.lower().startswith("www."):
        return True
    return False


def _normalize_attachment_list(attachments: object) -> list[dict]:
    """将多种附件表示形式统一为 [{'url': ..., 'name': ..., 'ext': ...}, ...]"""

    def _parse_url_item(url: str) -> dict:
        url = (url or "").strip()
        if not _is_likely_url(url):
            return {}
        if url.startswith("//"):
            url = "https:" + url
        parsed = urlparse(url)
        name = os.path.basename(parsed.path) or "attachment"
        ext = os.path.splitext(name)[1]
        return {"url": url, "name": name, "ext": ext}

    results: list[dict] = []

    if not attachments:
        return results

    if isinstance(attachments, str):
        # 多个 URL 以分号分隔
        for part in attachments.split(";"):
            item = _parse_url_item(part)
            if item:
                results.append(item)
        return results

    if isinstance(attachments, dict):
        # 假设 dict 包含 url/name/ext
        url = attachments.get("url") or attachments.get("href") or attachments.get("downloadUrl")
        if url:
            results.append(
                {
                    "url": url,
                    "name": attachments.get("name") or attachments.get("title") or "attachment",
                    "ext": attachments.get("ext") or attachments.get("fileExtension") or "",
                }
            )
        return results

    if isinstance(attachments, list):
        for item in attachments:
            if isinstance(item, str):
                parsed = _parse_url_item(item)
                if parsed:
                    results.append(parsed)
                continue

            if not isinstance(item, dict):
                continue

            url = item.get("url") or item.get("href") or item.get("downloadUrl") or item.get("attachUrl")
            if not url:
                # 可能整个 item 是一个 URL 字符串
                continue

            name = item.get("name") or item.get("title") or os.path.basename(urlparse(url).path) or "attachment"
            ext = item.get("ext") or item.get("fileExtension") or os.path.splitext(name)[1]
            results.append({"url": url, "name": name, "ext": ext})

        return results

    return results


def save_output_with_attachments(
    records: list[dict],
    output_dir: str,
    attachments_field: str = "attachments",
    record_id_field: str = "id",
    record_name_field: Optional[str] = None,
    referer_field: Optional[str] = None,
) -> tuple[str, str]:
    """保存 JSON/CSV，并下载每条记录中的附件到 output_dir/attachments/"""
    os.makedirs(output_dir, exist_ok=True)

    json_file = os.path.join(output_dir, "output.json")
    csv_file = os.path.join(output_dir, "output.csv")

    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    if records:
        with open(csv_file, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=list(records[0].keys()))
            writer.writeheader()
            writer.writerows(records)

    # 下载附件
    attachments_dir = os.path.join(output_dir, "attachments")
    for rec in records:
        rid = str(rec.get(record_id_field) or "unknown")
        rname = str(rec.get(record_name_field, "")) if record_name_field else ""
        record_dir = os.path.join(attachments_dir, safe_filename(f"{rid}_{rname}"))

        raw_attach = rec.get(attachments_field)
        attach_items = _normalize_attachment_list(raw_attach)

        for attach in attach_items:
            url = attach.get("url")
            if not url:
                continue
            name = attach.get("name") or os.path.basename(urlparse(url).path)
            ext = attach.get("ext") or os.path.splitext(name)[1]

            base_name = safe_filename(name) or "attachment"
            if ext:
                ext_clean = ext.lstrip(".")
                if ext_clean and not base_name.lower().endswith(f".{ext_clean.lower()}"):
                    base_name = f"{base_name}.{ext_clean}"
            filename = base_name

            dest = os.path.join(record_dir, filename)
            if not os.path.exists(dest):
                referer = rec.get(referer_field) if referer_field else None
                download_file(url, dest, referer=referer)
                time.sleep(random.uniform(0.3, 0.8))

    return json_file, csv_file


def save_json_only(
    records: list[dict],
    site_key: str,
    output_dir: str = "data",
    attachments_field: str = "attachments",
    record_id_field: str = "id",
    record_name_field: str = None,
    referer_field: str = None,
) -> str:
    """
    保存 JSON 到 data/ 目录，不生成 CSV，不创建时间戳子文件夹。
    site_key: 站点标识，如 "cnpc", "pipechina"
    """
    data_dir = output_dir
    os.makedirs(data_dir, exist_ok=True)

    ts = datetime.now().strftime("%Y-%m-%d")
    json_file = os.path.join(data_dir, f"{ts}_{site_key}.json")

    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    attachments_dir = os.path.join(data_dir, "attachments")
    for rec in records:
        rid = str(rec.get(record_id_field) or "unknown")
        rname = str(rec.get(record_name_field, "")) if record_name_field else ""
        record_dir = os.path.join(attachments_dir, safe_filename(f"{rid}_{rname}"))

        raw_attach = rec.get(attachments_field)
        attach_items = _normalize_attachment_list(raw_attach)

        for attach in attach_items:
            url = attach.get("url")
            if not url:
                continue
            name = attach.get("name") or os.path.basename(urlparse(url).path)
            ext = attach.get("ext") or os.path.splitext(name)[1]

            base_name = safe_filename(name) or "attachment"
            if ext:
                ext_clean = ext.lstrip(".")
                if ext_clean and not base_name.lower().endswith(f".{ext_clean.lower()}"):
                    base_name = f"{base_name}.{ext_clean}"
            filename = base_name

            dest = os.path.join(record_dir, filename)
            if not os.path.exists(dest):
                referer = rec.get(referer_field) if referer_field else None
                download_file(url, dest, referer=referer)
                time.sleep(random.uniform(0.3, 0.8))

    return json_file

