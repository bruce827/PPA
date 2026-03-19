#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
目标网站：中国海洋石油招标采购 - https://buy.cnooc.com.cn/cbjyweb/001/001001/moreinfo.html
抓取方式：公开接口（列表 JSONP）+ 详情页 HTML
输出文件：cnooc_tenders_YYYYMMDD_HHMMSS.json / .csv
运行方式：pip install requests beautifulsoup4 lxml && python spiders/spider_cnooc_tenders.py
"""

import argparse
import csv
import json
import random
import re
import time
from datetime import datetime
from typing import Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


BASE_URL = "https://buy.cnooc.com.cn"
ENTRY_URL = BASE_URL + "/cbjyweb/001/001001/moreinfo.html"
COUNT_API = BASE_URL + "/cbjywebframe/services/PortalsWebservice/getMoreInfoCateCount"
LIST_API = BASE_URL + "/cbjywebframe/services/PortalsWebservice/getMoreInfoCateList"

DEFAULT_CATENUM = "001001"
DEFAULT_PAGE_SIZE = 20
DELAY_RANGE = (0.2, 0.8)
RETRY_TIMES = 3

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/145.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Referer": ENTRY_URL,
}


def parse_jsonp_payload(text: str):
    raw = (text or "").strip().rstrip(";")
    if not raw:
        return None

    if raw.startswith("{") or raw.startswith("[") or raw.isdigit():
        return json.loads(raw)

    start = raw.find("(")
    end = raw.rfind(")")
    if start != -1 and end != -1 and end > start:
        payload = raw[start + 1 : end].strip()
        if payload == "":
            return None
        if payload.startswith("{") or payload.startswith("[") or payload.isdigit():
            return json.loads(payload)
        return payload

    return json.loads(raw)


def html_to_text(content_html: str) -> str:
    if not content_html:
        return ""
    soup = BeautifulSoup(content_html, "lxml")
    for tag in soup(["script", "style"]):
        tag.decompose()
    return soup.get_text("\n", strip=True)


def extract_attachment_urls(scope_html: str) -> str:
    if not scope_html:
        return ""
    soup = BeautifulSoup(scope_html, "lxml")
    links: list[str] = []
    for a in soup.select("a[href]"):
        href = (a.get("href") or "").strip()
        if not href or href.startswith("#") or href.lower().startswith("javascript:"):
            continue
        absolute = urljoin(BASE_URL, href)
        if (
            "download" in absolute.lower()
            or "attachment" in absolute.lower()
            or absolute.lower().endswith((".pdf", ".doc", ".docx", ".xls", ".xlsx", ".zip", ".rar"))
        ):
            links.append(absolute)
    uniq: list[str] = []
    seen: set[str] = set()
    for url in links:
        if url in seen:
            continue
        seen.add(url)
        uniq.append(url)
    return ";".join(uniq)


class CnoocSpider:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def _request_get(self, url: str, params: Optional[dict] = None) -> requests.Response:
        last_error = None
        for _ in range(RETRY_TIMES):
            try:
                resp = self.session.get(url, params=params, timeout=30)
                if resp.status_code in (429, 500, 502, 503, 504):
                    last_error = RuntimeError(f"HTTP {resp.status_code}")
                    time.sleep(random.uniform(0.6, 1.3))
                    continue
                resp.raise_for_status()
                enc = (resp.encoding or "").lower()
                if not enc or enc in ("iso-8859-1", "latin1"):
                    resp.encoding = "utf-8"
                return resp
            except Exception as exc:
                last_error = exc
                time.sleep(random.uniform(0.6, 1.3))
        raise RuntimeError(f"请求失败: {url} -> {last_error}")

    def fetch_total_count(self, catenum: str, title: str = "", siteguid: str = "") -> int:
        params = {
            "response": "application/json",
            "siteguid": siteguid,
            "catenum": catenum,
            "title": title,
        }
        resp = self._request_get(COUNT_API, params=params)
        data = parse_jsonp_payload(resp.text)
        if isinstance(data, int):
            return data
        if isinstance(data, str) and data.isdigit():
            return int(data)
        return 0

    def fetch_list_page(
        self,
        catenum: str,
        page_index: int,
        page_size: int,
        title: str = "",
        siteguid: str = "",
    ) -> list[dict]:
        params = {
            "response": "application/json",
            "pageIndex": page_index,
            "pageSize": page_size,
            "siteguid": siteguid,
            "catenum": catenum,
            "title": title,
        }
        resp = self._request_get(LIST_API, params=params)
        data = parse_jsonp_payload(resp.text)
        if isinstance(data, dict):
            rows = data.get("Table") or []
            if isinstance(rows, list):
                return rows
        return []

    def fetch_detail(self, detail_url: str) -> dict:
        resp = self._request_get(detail_url)
        html = resp.text
        soup = BeautifulSoup(html, "lxml")

        article_main = soup.select_one(".article-main")
        main_html = str(article_main) if article_main else html
        main_text = html_to_text(main_html)

        title_node = soup.select_one(".article-title") or soup.select_one("h1")
        detail_title = title_node.get_text(" ", strip=True) if title_node else ""

        publish_date = ""
        pdate = soup.find(string=re.compile(r"\d{4}[-年/.]\d{1,2}[-月/.]\d{1,2}"))
        if pdate:
            m = re.search(r"\d{4}[-年/.]\d{1,2}[-月/.]\d{1,2}", str(pdate))
            if m:
                publish_date = m.group(0)

        return {
            "detail_title": detail_title,
            "detail_html": main_html,
            "detail_text": main_text,
            "detail_publish_date": publish_date,
            "attachment_urls": extract_attachment_urls(main_html),
        }

    @staticmethod
    def normalize_record(row: dict, detail: dict) -> dict:
        href = (row.get("Href") or "").strip()
        detail_url = urljoin(BASE_URL, href) if href else ""
        return {
            "site_name": "中国海洋石油采办业务管理与交易系统",
            "entry_url": ENTRY_URL,
            "catenum": DEFAULT_CATENUM,
            "rowGuid": row.get("rowGuid", ""),
            "title": row.get("title", ""),
            "infodate": row.get("infodate", ""),
            "strcomment": row.get("strcomment", ""),
            "list_href": href,
            "detail_url": detail_url,
            "detail_title": detail.get("detail_title", ""),
            "detail_publish_date": detail.get("detail_publish_date", ""),
            "detail_text": detail.get("detail_text", ""),
            "attachment_urls": detail.get("attachment_urls", ""),
            "crawl_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

    @staticmethod
    def save_output(records: list[dict]) -> tuple[str, str]:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        json_file = f"cnooc_tenders_{ts}.json"
        csv_file = f"cnooc_tenders_{ts}.csv"

        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=2)

        if records:
            with open(csv_file, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.DictWriter(f, fieldnames=list(records[0].keys()))
                writer.writeheader()
                writer.writerows(records)

        return json_file, csv_file

    def crawl(
        self,
        max_pages: int,
        page_size: int,
        catenum: str = DEFAULT_CATENUM,
        title: str = "",
        siteguid: str = "",
    ) -> list[dict]:
        records: list[dict] = []
        seen: set[str] = set()

        total = 0
        try:
            total = self.fetch_total_count(catenum=catenum, title=title, siteguid=siteguid)
            print(f"[CNOOC] 总记录数: {total}")
        except Exception as exc:
            print(f"[CNOOC] 获取总数失败，继续分页抓取: {exc}")

        for page in range(1, max_pages + 1):
            print(f"[CNOOC] 抓取列表页 {page} ...")
            try:
                rows = self.fetch_list_page(
                    catenum=catenum,
                    page_index=page,
                    page_size=page_size,
                    title=title,
                    siteguid=siteguid,
                )
            except Exception as exc:
                print(f"[CNOOC] 列表页 {page} 失败: {exc}")
                break

            if not rows:
                print("[CNOOC] 无更多数据，停止")
                break

            for row in rows:
                key = str(row.get("rowGuid") or row.get("Href") or "").strip()
                if not key or key in seen:
                    continue
                seen.add(key)

                href = (row.get("Href") or "").strip()
                detail_url = urljoin(BASE_URL, href) if href else ""
                detail = {}
                if detail_url:
                    try:
                        detail = self.fetch_detail(detail_url)
                    except Exception as exc:
                        print(f"[CNOOC] 详情失败 {detail_url}: {exc}")

                records.append(self.normalize_record(row, detail))
                print(f"[CNOOC] 已处理 {len(records)} 条: {key}")
                time.sleep(random.uniform(*DELAY_RANGE))

            if len(rows) < page_size:
                break

            if total > 0 and page * page_size >= total:
                break

        return records


def main():
    parser = argparse.ArgumentParser(description="中国海洋石油招标采购爬虫（列表+详情）")
    parser.add_argument("--max-pages", type=int, default=1, help="最大抓取页数，默认1")
    parser.add_argument("--page-size", type=int, default=DEFAULT_PAGE_SIZE, help="每页抓取数量，默认20")
    parser.add_argument("--catenum", type=str, default=DEFAULT_CATENUM, help="栏目编号，默认001001（招标公告）")
    parser.add_argument("--title", type=str, default="", help="标题关键词过滤，默认空")
    parser.add_argument("--siteguid", type=str, default="", help="站点GUID，可空")
    args = parser.parse_args()

    spider = CnoocSpider()
    records = spider.crawl(
        max_pages=max(1, args.max_pages),
        page_size=max(1, args.page_size),
        catenum=args.catenum.strip() or DEFAULT_CATENUM,
        title=args.title.strip(),
        siteguid=args.siteguid.strip(),
    )
    json_file, csv_file = spider.save_output(records)
    print(f"[CNOOC] 完成，共 {len(records)} 条 -> {json_file} / {csv_file}")


if __name__ == "__main__":
    main()
