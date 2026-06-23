#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
目标网站：中国移动采购与招标网 - https://b2b.10086.cn/#/biddingProcurementBulletin
抓取方式：公开接口（列表 + 详情）+ 详情PDF(Base64)解码
输出文件：cmcc_b2b_YYYYMMDD_HHMMSS/output.json / output.csv
运行方式：pip install requests && python spiders/spider_cmcc_b2b.py
"""

import argparse
import base64
import json
import random
import time
from io import BytesIO
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests
from pypdf import PdfReader

import spider_utils


ENTRY_URL = "https://b2b.10086.cn/#/biddingProcurementBulletin"
BASE_URL = "https://b2b.10086.cn"

LIST_API = BASE_URL + "/api-b2b/api-sync-es/white_list_api/b2b/publish/queryList"
DETAIL_API = BASE_URL + "/api-b2b/api-sync-es/white_list_api/b2b/publish/queryDetail"
FILE_LIST_API = BASE_URL + "/api-b2b/api-file/file/listByAttrOnAuth"
FILE_DOWNLOAD_API = BASE_URL + "/api-b2b/api-file/file/downloadFileOnAuth"

PAGE_SIZE = 20
DELAY_RANGE = (0.2, 0.8)
RETRY_TIMES = 3

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/146.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "Referer": BASE_URL + "/",
    # 页面真实请求里带了这两个头，保留可提升兼容性
    "userloginname": "-1",
    "processinstid": "-1",
}


def _safe_name(name: str) -> str:
    return spider_utils.safe_filename(name or "notice")


def _extract_data(payload: dict) -> dict:
    if payload.get("code") != 0:
        raise ValueError(f"接口异常 code={payload.get('code')} msg={payload.get('msg')}")
    return payload.get("data") or {}


def _decode_pdf_base64(base64_text: str) -> bytes:
    raw = (base64_text or "").strip()
    if not raw:
        return b""
    try:
        return base64.b64decode(raw)
    except Exception:
        return b""


def _extract_pdf_text(pdf_bytes: bytes, max_chars: int = 30000) -> str:
    if not pdf_bytes:
        return ""
    try:
        reader = PdfReader(BytesIO(pdf_bytes))
    except Exception:
        return ""

    chunks: list[str] = []
    for page in reader.pages:
        try:
            txt = page.extract_text() or ""
        except Exception:
            txt = ""
        if txt.strip():
            chunks.append(txt.strip())

    merged = "\n\n".join(chunks).strip()
    if max_chars > 0 and len(merged) > max_chars:
        return merged[:max_chars]
    return merged


def _build_file_download_url(file_item: dict) -> str:
    """
    对齐前端 $Common.getFilesUrl 逻辑：
    1) type in (1,4) 且 attr6/attr9 存在时，直接使用 attr6/attr9
    2) 否则走 downloadFileOnAuth?authFlag=N&fileId=...&fileUuid=...
    """
    ftype = str(file_item.get("type") or "")
    direct = file_item.get("attr6") or file_item.get("attr9")
    if ftype in {"1", "4"} and isinstance(direct, str) and direct.strip():
        return direct.strip()

    file_id = str(file_item.get("fileId") or "").strip()
    file_uuid = str(file_item.get("uuid") or "").strip()
    if not file_id or not file_uuid:
        return ""

    return (
        f"{FILE_DOWNLOAD_API}?authFlag=N"
        f"&fileId={quote(file_id)}"
        f"&fileUuid={quote(file_uuid)}"
    )


class CmccB2BSpider:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def _post_json(self, url: str, payload: dict) -> dict:
        last_error: Exception | None = None
        for _ in range(RETRY_TIMES):
            try:
                resp = self.session.post(url, json=payload, timeout=30)
                if resp.status_code in (429, 500, 502, 503, 504):
                    time.sleep(random.uniform(0.7, 1.4))
                    continue
                resp.raise_for_status()
                return resp.json()
            except Exception as exc:
                last_error = exc
                time.sleep(random.uniform(0.7, 1.4))
        raise RuntimeError(f"请求失败: {url} -> {last_error}")

    def fetch_list_page(self, current: int, publish_type: str) -> dict:
        payload = {
            "name": "",
            "publishType": publish_type,
            "purchaseType": "",
            "companyType": "",
            "size": PAGE_SIZE,
            "current": current,
            "sfactApplColumn5": "PC",
        }
        data = _extract_data(self._post_json(LIST_API, payload))
        return {
            "items": data.get("content") or [],
            "total": int(data.get("totalElements") or data.get("total") or 0),
            "pages": int(data.get("totalPages") or 0),
        }

    def fetch_detail(self, publish_id: str, publish_uuid: str, publish_type: str) -> dict:
        payload = {
            "publishId": publish_id,
            "publishUuid": publish_uuid,
            "publishType": publish_type,
            "sfactApplColumn5": "PC",
        }
        return _extract_data(self._post_json(DETAIL_API, payload))

    def fetch_files(self, publish_uuid: str) -> list[dict]:
        payload = {
            "attr1": "PT_VENDOR_PUBLISH",
            "attr3": "PT_VENDOR_PUBLISH_FILE",
            "attr2": publish_uuid,
            "authFlag": "N",
        }
        data = _extract_data(self._post_json(FILE_LIST_API, payload))
        return data if isinstance(data, list) else []

    @staticmethod
    def build_detail_url(item: dict) -> str:
        return (
            f"{BASE_URL}/#/noticeDetail"
            f"?publishId={item.get('id', '')}"
            f"&publishUuid={item.get('uuid', '')}"
            f"&publishType={item.get('publishType', '')}"
            f"&publishOneType={item.get('publishOneType', '')}"
        )

    def crawl(self, max_pages: int, publish_type: str) -> list[dict]:
        records: list[dict] = []
        seen: set[str] = set()

        for page in range(1, max_pages + 1):
            print(f"[CMCC_B2B] 抓取列表页 {page} ...")
            page_data = self.fetch_list_page(current=page, publish_type=publish_type)
            items = page_data["items"]
            if not items:
                print("[CMCC_B2B] 无更多数据，停止")
                break

            for item in items:
                publish_id = str(item.get("id") or "").strip()
                publish_uuid = str(item.get("uuid") or "").strip()
                if not publish_id or not publish_uuid:
                    continue

                key = f"{publish_id}:{publish_uuid}"
                if key in seen:
                    continue
                seen.add(key)

                detail = self.fetch_detail(
                    publish_id=publish_id,
                    publish_uuid=publish_uuid,
                    publish_type=str(item.get("publishType") or publish_type),
                )

                file_list = self.fetch_files(publish_uuid=publish_uuid)
                attachments: list[dict] = []
                for f in file_list:
                    if not isinstance(f, dict):
                        continue
                    url = _build_file_download_url(f)
                    if not url:
                        continue
                    name = str(f.get("filename") or f.get("localFileName") or "attachment").strip()
                    attachments.append(
                        {
                            "url": url,
                            "name": name,
                            "ext": Path(name).suffix,
                        }
                    )
                # 去重
                dedup_urls: list[str] = []
                dedup_attachments: list[dict] = []
                seen_url = set()
                for item_obj in attachments:
                    u = str(item_obj.get("url") or "").strip()
                    if not u:
                        continue
                    if u in seen_url:
                        continue
                    seen_url.add(u)
                    dedup_urls.append(u)
                    dedup_attachments.append(item_obj)

                notice_content = detail.get("noticeContent") or ""
                content_type = str(detail.get("contentType") or "").lower()
                pdf_bytes = b""
                pdf_text = ""
                if notice_content and (content_type == "pdf" or notice_content.startswith("JVBERi0")):
                    pdf_bytes = _decode_pdf_base64(notice_content)
                    pdf_text = _extract_pdf_text(pdf_bytes)

                records.append(
                    {
                        "site_name": "中国移动采购与招标网",
                        "entry_url": ENTRY_URL,
                        "publish_type": item.get("publishType", ""),
                        "publish_one_type": item.get("publishOneType", ""),
                        "publish_one_type_text": item.get("publishOneType_dictText", ""),
                        "company_type_name": item.get("companyTypeName", ""),
                        "title": item.get("name", ""),
                        "publish_date": item.get("publishDate", ""),
                        "tender_sale_deadline": item.get("tenderSaleDeadline", ""),
                        "publicity_end_time": item.get("publicityEndTime", ""),
                        "list_id": publish_id,
                        "list_uuid": publish_uuid,
                        "detail_query_publishId": detail.get("id", publish_id),
                        "detail_query_publishUuid": detail.get("uuid", publish_uuid),
                        "detail_url": self.build_detail_url(item),
                        "content_type": detail.get("contentType", ""),
                        "content_parse_method": (
                            "pdf_base64_text"
                            if pdf_text
                            else ("pdf_base64" if pdf_bytes else "plain_text")
                        ),
                        "content_base64_prefix": (notice_content[:24] if notice_content else ""),
                        "content_base64_len": len(notice_content),
                        "content_pdf_size": len(pdf_bytes),
                        "content_text": (
                            (pdf_text or "[PDF_BASE64_CONTENT]")
                            if pdf_bytes
                            else str(notice_content)[:5000]
                        ),
                        "attachments": dedup_attachments,
                        "attachment_urls": ";".join(dedup_urls),
                        "crawl_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        # 内存中保留字节，后续统一落盘；不写进最终JSON
                        "_pdf_bytes": pdf_bytes,
                    }
                )

                print(f"[CMCC_B2B] 已处理 {len(records)} 条: {publish_id}")
                time.sleep(random.uniform(*DELAY_RANGE))

            if len(items) < PAGE_SIZE:
                break
            if page_data["pages"] and page >= page_data["pages"]:
                break

        return records


def save_pdf_files(records: list[dict], output_dir: Path) -> None:
    pdf_dir = output_dir / "decoded_pdfs"
    pdf_dir.mkdir(parents=True, exist_ok=True)
    for rec in records:
        pdf_bytes = rec.get("_pdf_bytes") or b""
        if not pdf_bytes:
            rec["content_pdf_file"] = ""
            continue

        rid = str(rec.get("list_id") or "unknown")
        title = _safe_name(str(rec.get("title") or "notice"))
        filename = f"{rid}_{title}.pdf"
        path = pdf_dir / filename
        path.write_bytes(pdf_bytes)
        rec["content_pdf_file"] = str(path)


def main():
    parser = argparse.ArgumentParser(description="中国移动采购与招标网爬虫（列表+详情+PDF解码）")
    parser.add_argument("--max-pages", type=int, default=1, help="最大抓取页数，默认1")
    parser.add_argument(
        "--publish-type",
        type=str,
        default="PROCUREMENT",
        help="公告大类，默认 PROCUREMENT",
    )
    args = parser.parse_args()

    spider = CmccB2BSpider()
    records = spider.crawl(max_pages=max(1, args.max_pages), publish_type=args.publish_type.strip() or "PROCUREMENT")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    folder_name = f"cmcc_b2b_{timestamp}"
    output_dir = Path(folder_name)
    output_dir.mkdir(parents=True, exist_ok=True)

    save_pdf_files(records, output_dir)

    # 导出前移除内部字段
    export_records = []
    for rec in records:
        row = dict(rec)
        row.pop("_pdf_bytes", None)
        export_records.append(row)

    json_file, csv_file = spider_utils.save_output_with_attachments(
        export_records,
        folder_name,
        attachments_field="attachments",
        record_id_field="list_id",
        record_name_field="title",
        referer_field="detail_url",
    )

    print(f"[CMCC_B2B] 完成，共 {len(export_records)} 条 -> {json_file} / {csv_file}")


if __name__ == "__main__":
    main()
