#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
目标网站：山东能源集团电子招标投标交易平台
列表页：https://snbid.minegoods.com/bulletin/bidList
抓取方式：公开接口（列表 + 详情）
输出文件：snbid_YYYYMMDD_HHMMSS/output.json / output.csv
运行方式：python spiders/spider_snbid.py --max-pages 2
默认行为：仅抓“服务”类公告（businessClassification=01）
"""

import argparse
import random
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Optional, Union
from urllib.parse import urljoin

import requests

import spider_utils


ENTRY_URL = "https://snbid.minegoods.com/bulletin/bidList"
BASE_URL = "https://snbid.minegoods.com"
LIST_API = BASE_URL + "/common-cms/portalNotice/listPortalNoticePage"
DETAIL_API = BASE_URL + "/common-cms/portalNotice/noticeDetail/{notice_id}"

PAGE_SIZE = 12
DELAY_RANGE = (0.2, 0.6)
RETRY_TIMES = 3

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/146.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
    "Content-Type": "application/json;charset=UTF-8",
    "Referer": BASE_URL + "/",
}


def _extract_data(payload: dict[str, Any]) -> dict[str, Any]:
    header = payload.get("header") or {}
    if str(header.get("ret")) != "0":
        raise ValueError(f"接口异常 ret={header.get('ret')} msg={header.get('msg')}")
    return payload.get("data") or {}


def _strip_html(html: str) -> str:
    if not html:
        return ""
    text = re.sub(r"<script\b[^>]*>[\s\S]*?</script>", " ", html, flags=re.I)
    text = re.sub(r"<style\b[^>]*>[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = (
        text.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
    )
    return re.sub(r"\s+", " ", text).strip()


def _extract_links_from_html(html: str) -> list[str]:
    if not html:
        return []
    links = re.findall(r"""href\s*=\s*["']([^"']+)["']""", html, flags=re.I)
    normalized: list[str] = []
    seen = set()
    for link in links:
        url = urljoin(BASE_URL, str(link).strip())
        if not url or url in seen:
            continue
        seen.add(url)
        normalized.append(url)
    return normalized


def _looks_like_attachment(url: str) -> bool:
    u = (url or "").lower()
    if not u:
        return False
    if re.search(r"\.(pdf|doc|docx|xls|xlsx|zip|rar|7z|jpg|jpeg|png)(\?|$)", u):
        return True
    if any(k in u for k in ["/download", "/file", "attachment", "annex", "upload"]):
        return True
    return False


def _normalize_attachments(detail_data: dict[str, Any]) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    seen = set()

    raw_vl = detail_data.get("vl")
    if isinstance(raw_vl, list):
        for entry in raw_vl:
            if not isinstance(entry, dict):
                continue
            url = (
                entry.get("url")
                or entry.get("fileUrl")
                or entry.get("downloadUrl")
                or entry.get("path")
                or ""
            )
            url = urljoin(BASE_URL, str(url).strip())
            if not url or url in seen:
                continue
            seen.add(url)
            name = str(entry.get("name") or entry.get("fileName") or Path(url).name or "attachment")
            items.append({"url": url, "name": name, "ext": Path(name).suffix})

    notice_html = str(detail_data.get("noticeDetail") or "")
    for url in _extract_links_from_html(notice_html):
        if not _looks_like_attachment(url) or url in seen:
            continue
        seen.add(url)
        name = Path(url.split("?", 1)[0]).name or "attachment"
        items.append({"url": url, "name": name, "ext": Path(name).suffix})

    return items


class SnBidSpider:
    def __init__(self) -> None:
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def _get_json(self, url: str, method: str = "GET", payload: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        last_error: Exception | None = None
        for _ in range(RETRY_TIMES):
            try:
                if method == "POST":
                    resp = self.session.post(url, json=payload or {}, timeout=30)
                else:
                    resp = self.session.get(url, timeout=30)
                if resp.status_code in (429, 500, 502, 503, 504):
                    time.sleep(random.uniform(0.7, 1.4))
                    continue
                resp.raise_for_status()
                return resp.json()
            except Exception as exc:
                last_error = exc
                time.sleep(random.uniform(0.7, 1.4))
        raise RuntimeError(f"请求失败: {url} -> {last_error}")

    def fetch_list_page(
        self,
        page_no: int,
        notice_type: str,
        keyword: str = "",
        notice_time_tag: str = "",
        filter_criteria: str = "",
        business_classification: str = "",
    ) -> dict[str, Any]:
        body = {
            "title": keyword,
            "pageNo": page_no,
            "pageSize": PAGE_SIZE,
            "noticeType": notice_type,
            "noticeTimeTag": notice_time_tag,
            "filterCriteria": filter_criteria,
            "businessClassification": business_classification,
        }
        data = _extract_data(self._get_json(LIST_API, method="POST", payload=body))
        return {
            "records": data.get("records") or [],
            "total": int(data.get("total") or 0),
            "pages": int(data.get("pages") or 0),
            "current": int(data.get("current") or page_no),
            "size": int(data.get("size") or PAGE_SIZE),
        }

    def fetch_detail(self, notice_id: Union[int, str]) -> dict[str, Any]:
        api = DETAIL_API.format(notice_id=notice_id)
        return _extract_data(self._get_json(api))

    def crawl(
        self,
        max_pages: int,
        notice_type: str,
        keyword: str = "",
        notice_time_tag: str = "",
        filter_criteria: str = "",
        business_classification: str = "",
    ) -> list[dict[str, Any]]:
        records: list[dict[str, Any]] = []
        seen_notice_id: set[str] = set()

        for page_no in range(1, max_pages + 1):
            print(f"[SNBID] 抓取列表页 {page_no} ...")
            page_data = self.fetch_list_page(
                page_no=page_no,
                notice_type=notice_type,
                keyword=keyword,
                notice_time_tag=notice_time_tag,
                filter_criteria=filter_criteria,
                business_classification=business_classification,
            )
            rows = page_data["records"]
            if not rows:
                print("[SNBID] 无更多列表数据，停止")
                break

            for row in rows:
                notice_id = str(row.get("noticeId") or "").strip()
                if not notice_id or notice_id in seen_notice_id:
                    continue
                seen_notice_id.add(notice_id)

                detail_data = self.fetch_detail(notice_id=notice_id)
                detail_html = str(detail_data.get("noticeDetail") or "")
                detail_text = _strip_html(detail_html)
                attachments = _normalize_attachments(detail_data)

                records.append(
                    {
                        "site_name": "山东能源集团电子招标投标交易平台",
                        "entry_url": ENTRY_URL,
                        "list_notice_type": notice_type,
                        "list_notice_id": notice_id,
                        "detail_notice_id": notice_id,
                        "title": row.get("title") or detail_data.get("title") or "",
                        "publish_time": row.get("noticeTime") or detail_data.get("noticeTime") or "",
                        "business_classification": row.get("businessClassificationName", ""),
                        "tender_method": row.get("tenderMethodName", ""),
                        "tender_unit": row.get("tenderUnit", ""),
                        "deadline_days": row.get("deadline", ""),
                        "off_state": row.get("offState", ""),
                        "detail_url": f"{BASE_URL}/bulletinDetail?id={notice_id}",
                        "content_html": detail_html,
                        "content_text": detail_text,
                        "attachments": attachments,
                        "attachment_urls": ";".join([x.get("url", "") for x in attachments if x.get("url")]),
                        "crawl_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    }
                )
                print(f"[SNBID] 已处理 {len(records)} 条: noticeId={notice_id}")
                time.sleep(random.uniform(*DELAY_RANGE))

            if page_data["pages"] and page_no >= page_data["pages"]:
                break

        return records


def main() -> None:
    parser = argparse.ArgumentParser(description="山东能源集团公告爬虫（列表+详情+附件）")
    parser.add_argument("--max-pages", type=int, default=1, help="最大抓取页数，默认1")
    parser.add_argument(
        "--notice-type",
        type=str,
        default="00",
        help="公告类型（00招标公告），默认00",
    )
    parser.add_argument("--keyword", type=str, default="", help="标题关键词过滤")
    parser.add_argument("--notice-time-tag", type=str, default="", help="发布时间标签（页面筛选项）")
    parser.add_argument("--filter-criteria", type=str, default="", help="筛选条件（如报名中/结束）")
    parser.add_argument(
        "--business-classification",
        type=str,
        default="01",
        help="业务类型编码（01=服务，02=工程，03=货物）。默认01（服务）",
    )
    args = parser.parse_args()

    spider = SnBidSpider()
    records = spider.crawl(
        max_pages=max(1, args.max_pages),
        notice_type=(args.notice_type.strip() or "00"),
        keyword=args.keyword.strip(),
        notice_time_tag=args.notice_time_tag.strip(),
        filter_criteria=args.filter_criteria.strip(),
        business_classification=args.business_classification.strip() or "01",
    )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    folder_name = f"snbid_{timestamp}"
    output_dir = Path(folder_name)
    output_dir.mkdir(parents=True, exist_ok=True)

    json_file, csv_file = spider_utils.save_output_with_attachments(
        records,
        folder_name,
        attachments_field="attachments",
        record_id_field="list_notice_id",
        record_name_field="title",
        referer_field="detail_url",
    )
    print(f"[SNBID] 完成，共 {len(records)} 条 -> {json_file} / {csv_file}")


if __name__ == "__main__":
    main()
