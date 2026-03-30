#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
目标网站：中国石油招标投标网 - https://www.cnpcbidding.com/#/tenders
抓取方式：公开接口（www2.cnpcbidding.com）获取列表 + 详情接口补充
输出文件：cnpc_tenders_YYYYMMDD_HHMMSS.json / .csv
运行方式：pip install requests beautifulsoup4 lxml && python spiders/spider_cnpc_tenders.py
"""

import argparse
import csv
import json
import random
import time
from datetime import datetime

import requests
from bs4 import BeautifulSoup

import spider_utils


ENTRY_URL = "https://www.cnpcbidding.com/#/tenders"
API_BASE = "https://www2.cnpcbidding.com"
LIST_API = API_BASE + "/project/search/globalSearch"
DETAIL_INFO_API = API_BASE + "/project/index/pc/getGoodsInfo"
DETAIL_HTML_API = API_BASE + "/project/index/pc/listGoodsIntroduce"

PAGE_SIZE = 20
DELAY_RANGE = (0.2, 0.8)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/145.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json;charset=UTF-8",
    "Referer": "https://www2.cnpcbidding.com/#/wel/search?center=",
}


def parse_html_to_text(html: str) -> str:
    if not html:
        return ""
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style"]):
        tag.decompose()
    lines = [x.get_text(" ", strip=True) for x in soup.find_all(["p", "div", "li", "tr"])]
    lines = [x for x in lines if x]
    if lines:
        return "\n".join(lines)
    return soup.get_text("\n", strip=True)


def extract_attachment_urls_from_html(html: str) -> str:
    """从详情 HTML 中提取附件链接（支持常见文档后缀）。"""
    if not html:
        return ""
    soup = BeautifulSoup(html, "lxml")
    urls = []
    for a in soup.select("a[href]"):
        href = (a.get("href") or "").strip()
        if not href or href.startswith("#") or href.lower().startswith("javascript:"):
            continue
        if any(href.lower().endswith(ext) for ext in (".pdf", ".doc", ".docx", ".xls", ".xlsx", ".zip", ".rar", ".txt")):
            urls.append(href)
    # 去重
    seen = set()
    uniq = []
    for u in urls:
        if u in seen:
            continue
        seen.add(u)
        uniq.append(u)
    return ";".join(uniq)


class CnpcSpider:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def fetch_list_page(self, page: int) -> list[dict]:
        payload = {
            "text": "",
            "center": [],
            "projectType": [],
            "organizationForm": [],
            "type": "-1",
            "current": page,
            "size": PAGE_SIZE,
        }
        resp = self.session.post(LIST_API, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            raise ValueError(f"列表接口异常 code={data.get('code')}, msg={data.get('msg')}")
        return (data.get("data") or {}).get("records") or []

    def fetch_detail_info(self, goods_id: str) -> dict:
        if not goods_id:
            return {}
        resp = self.session.get(DETAIL_INFO_API, params={"goodsId": goods_id}, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            return {}
        return ((data.get("data") or {}).get("goodsDetails")) or {}

    def fetch_detail_html(self, goods_id: str) -> str:
        if not goods_id:
            return ""
        resp = self.session.get(DETAIL_HTML_API, params={"goodsId": goods_id}, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            return ""
        return data.get("data") or ""

    @staticmethod
    def normalize_record(item: dict, detail_info: dict, detail_html: str) -> dict:
        merged = dict(item or {})
        merged.update(detail_info or {})

        goods_id = merged.get("goodsId", "")
        detail_text = parse_html_to_text(detail_html)
        return {
            "site_name": "中国石油招标投标网",
            "entry_url": ENTRY_URL,
            "goodsId": goods_id,
            "goodsName": merged.get("goodsName", ""),
            "projectName": merged.get("projectName", ""),
            "projectCode": merged.get("projectCode", ""),
            "bidSaleStartDateTime": merged.get("bidSaleStartDateTime", ""),
            "bidSaleEndDateTime": merged.get("bidSaleEndDateTime", ""),
            "openBidDateTime": merged.get("openBidDateTime", ""),
            "goodsPrice": merged.get("goodsPrice", ""),
            "tenantName": merged.get("tenantName", ""),
            "goodsAddress": merged.get("goodsAddress", ""),
            "saleMode": merged.get("saleMode", ""),
            "projectType": merged.get("projectType", ""),
            "detail_url": f"{API_BASE}/#/wel/commodityDetails?goodsId={goods_id}&type=list"
            if goods_id
            else "",
            "detail_html": detail_html,
            "detail_text": detail_text,
            "attachment_urls": extract_attachment_urls_from_html(detail_html),
        }

    @staticmethod
    def save_output(records: list[dict]) -> tuple[str, str]:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        json_file = f"cnpc_tenders_{ts}.json"
        csv_file = f"cnpc_tenders_{ts}.csv"

        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=2)

        if records:
            with open(csv_file, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.DictWriter(f, fieldnames=list(records[0].keys()))
                writer.writeheader()
                writer.writerows(records)

        return json_file, csv_file

    def crawl(self, max_pages: int = 1, fetch_html_detail: bool = True) -> list[dict]:
        all_records: list[dict] = []
        seen: set[str] = set()

        for page in range(1, max_pages + 1):
            print(f"[CNPC] 抓取列表页 {page} ...")
            try:
                items = self.fetch_list_page(page)
            except Exception as exc:
                print(f"[CNPC] 列表页 {page} 失败: {exc}")
                break

            if not items:
                print("[CNPC] 无更多数据，停止")
                break

            for item in items:
                gid = str(item.get("goodsId") or "").strip()
                if not gid or gid in seen:
                    continue
                seen.add(gid)

                try:
                    detail_info = self.fetch_detail_info(gid)
                except Exception as exc:
                    print(f"[CNPC] 详情信息失败 goodsId={gid}: {exc}")
                    detail_info = {}

                detail_html = ""
                if fetch_html_detail:
                    try:
                        detail_html = self.fetch_detail_html(gid)
                    except Exception as exc:
                        print(f"[CNPC] 详情正文失败 goodsId={gid}: {exc}")

                all_records.append(self.normalize_record(item, detail_info, detail_html))
                print(f"[CNPC] 已处理 {len(all_records)} 条: {gid}")
                time.sleep(random.uniform(*DELAY_RANGE))

            if len(items) < PAGE_SIZE:
                print("[CNPC] 当前页不足 pageSize，视为末页")
                break

        return all_records


def main():
    parser = argparse.ArgumentParser(description="中国石油招标投标网爬虫（列表+详情）")
    parser.add_argument("--max-pages", type=int, default=1, help="最大抓取页数，默认1")
    parser.add_argument(
        "--no-html-detail",
        action="store_true",
        help="不抓取详情HTML正文（只保留详情信息接口字段）",
    )
    args = parser.parse_args()

    spider = CnpcSpider()
    records = spider.crawl(max_pages=max(1, args.max_pages), fetch_html_detail=not args.no_html_detail)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    folder = f"cnpc_tenders_{timestamp}"
    json_file, csv_file = spider_utils.save_output_with_attachments(
        records,
        folder,
        attachments_field="attachment_urls",
        record_id_field="goodsId",
        record_name_field="goodsName",
        referer_field="detail_url",
    )
    print(f"[CNPC] 完成，共 {len(records)} 条 -> {json_file} / {csv_file}")


if __name__ == "__main__":
    main()

