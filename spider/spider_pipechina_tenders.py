#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
目标网站：国家管网电子招标平台 - https://iscm.pipechina.com.cn:8443/home/tenderannouncement.html?tab=1
抓取方式：公开接口（列表 + 详情）
输出文件：pipechina_tenders_YYYYMMDD_HHMMSS.json / .csv
运行方式：pip install requests beautifulsoup4 lxml && python spiders/spider_pipechina_tenders.py
"""

import argparse
import csv
import html
import json
import random
import re
import time
from datetime import datetime
from typing import Any
from urllib.parse import parse_qs, urljoin, urlparse

import requests
from bs4 import BeautifulSoup


BASE_URL = "https://iscm.pipechina.com.cn:8443"
ENTRY_URL = BASE_URL + "/home/tenderannouncement.html?tab=1"

LIST_API_BID = BASE_URL + "/user/out/manage/notice/selectNoticeForBid"
LIST_API_NON_BID = BASE_URL + "/user/out/manage/notice/selectNotice"
DETAIL_API_BID = BASE_URL + "/user/out/manage/notice/selectNoticeInfoForBid"
DETAIL_API_NON_BID = BASE_URL + "/user/out/manage/notice/selectNoticeInfo"

BID_TABS = {"1", "2", "3", "13", "14"}
NON_BID_TABS = {"4", "15", "25", "30"}
DEFAULT_TABS = ["1", "2", "3", "13", "14", "4", "15", "25", "30"]

TAB_NAME_MAP = {
    "1": "招标公告",
    "2": "中标候选人公示",
    "3": "中标结果公告",
    "13": "变更公告",
    "14": "异常公告",
    "4": "采购公告",
    "15": "候选人公示",
    "25": "变更公告",
    "30": "成交结果公告",
}

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
    "Referer": ENTRY_URL,
}


def html_to_text(content_html: str) -> str:
    if not content_html:
        return ""
    soup = BeautifulSoup(content_html, "lxml")
    for tag in soup(["script", "style"]):
        tag.decompose()
    return soup.get_text("\n", strip=True)


def extract_iframe_src(content_html: str) -> str:
    if not content_html:
        return ""
    m = re.search(r"""<iframe[^>]+src=["']([^"']+)["']""", content_html, re.I)
    return m.group(1).strip() if m else ""


def extract_annex_urls(annex_list: Any) -> str:
    if not isinstance(annex_list, list):
        return ""
    urls: list[str] = []
    keys = ("url", "fileUrl", "downloadUrl", "attachUrl", "annexUrl", "path")
    for item in annex_list:
        if not isinstance(item, dict):
            continue
        for key in keys:
            val = item.get(key)
            if val:
                urls.append(str(val).strip())
    uniq = []
    seen = set()
    for x in urls:
        if x in seen:
            continue
        seen.add(x)
        uniq.append(x)
    return ";".join(uniq)


def flatten_dict_to_lines(data: Any, prefix: str = "") -> list[str]:
    lines: list[str] = []
    if isinstance(data, dict):
        for key, val in data.items():
            if val in ("", None):
                continue
            next_prefix = f"{prefix}.{key}" if prefix else str(key)
            lines.extend(flatten_dict_to_lines(val, next_prefix))
        return lines
    if isinstance(data, list):
        for idx, item in enumerate(data):
            next_prefix = f"{prefix}[{idx}]"
            lines.extend(flatten_dict_to_lines(item, next_prefix))
        return lines
    lines.append(f"{prefix}: {data}")
    return lines


def extract_urls_from_nested(data: Any) -> list[str]:
    urls: list[str] = []
    if isinstance(data, dict):
        for key, val in data.items():
            key_l = str(key).lower()
            if isinstance(val, str) and val and (
                "url" in key_l or "download" in key_l or "file" in key_l or val.startswith("http")
            ):
                urls.append(val.strip())
            else:
                urls.extend(extract_urls_from_nested(val))
    elif isinstance(data, list):
        for item in data:
            urls.extend(extract_urls_from_nested(item))
    return urls


class PipeChinaSpider:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def _post_json(self, url: str, payload: dict) -> dict:
        resp = self.session.post(url, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if data.get("respCode") != "0000":
            raise ValueError(f"接口异常 respCode={data.get('respCode')} respDesc={data.get('respDesc')}")
        return data

    def fetch_list(self, tab: str, page_no: int) -> tuple[list[dict], dict]:
        if tab in BID_TABS:
            payload = {
                "pageNo": page_no,
                "pageSize": PAGE_SIZE,
                "categoryId": tab,
                "status": "1",
                "releaseStartTime": None,
                "releaseEndTime": None,
                "title": "",
            }
            data = self._post_json(LIST_API_BID, payload)
        else:
            payload = {
                "pageNo": page_no,
                "pageSize": PAGE_SIZE,
                "categoryId": tab,
                "status": "1",
                "beginCreateTime": "",
                "endCreateTime": "",
                "title": "",
            }
            data = self._post_json(LIST_API_NON_BID, payload)

        rows = data.get("rows") or []
        return rows, data

    def fetch_detail(self, tab: str, row: dict) -> dict:
        if tab in BID_TABS:
            business_id = str(row.get("businessId") or row.get("id") or "").strip()
            payload = {"businessId": business_id}
            return self._post_json(DETAIL_API_BID, payload)
        payload = {"id": row.get("id")}
        return self._post_json(DETAIL_API_NON_BID, payload)

    def fetch_iframe_html(self, iframe_src: str, referer_url: str = "") -> str:
        if not iframe_src:
            return ""
        iframe_url = urljoin(BASE_URL, iframe_src)
        headers = {}
        if referer_url:
            headers["Referer"] = referer_url
        resp = self.session.get(iframe_url, headers=headers, timeout=30)
        resp.raise_for_status()
        enc = (resp.encoding or "").lower()
        if not enc or enc in ("iso-8859-1", "latin1"):
            resp.encoding = resp.apparent_encoding or "utf-8"
        return resp.text

    def fetch_iframe_trade_detail_api(self, iframe_src: str) -> dict:
        iframe_url = urljoin(BASE_URL, iframe_src) if iframe_src else ""
        if not iframe_url:
            return {}

        parsed = urlparse(iframe_url)
        frag = parsed.fragment or ""
        if "trade-info-detail-push" not in frag:
            return {}

        if "?" not in frag:
            return {}
        _, q = frag.split("?", 1)
        query = parse_qs(q, keep_blank_values=True)
        params = {k: (v[-1] if v else "") for k, v in query.items()}
        if not params.get("tradeId") and params.get("id"):
            params["tradeId"] = params.get("id")
        if not params.get("tradeId"):
            return {}

        api_url = f"{parsed.scheme}://{parsed.netloc}/api/saas-portal/noauth/trans/trade/getByTradeId"
        resp = self.session.get(api_url, params=params, headers={"Referer": iframe_url}, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return {
            "api_url": resp.url,
            "api_payload": data,
        }

    @staticmethod
    def build_detail_url(tab: str, row: dict) -> str:
        idx = row.get("businessId") if tab in BID_TABS else row.get("id")
        if idx in ("", None):
            return ""
        return f"{BASE_URL}/detail.html?pageType=5&tab={tab}&index={idx}"

    @staticmethod
    def normalize_record(
        tab: str,
        row: dict,
        detail: dict,
        content_raw_html: str,
        content_iframe_src: str,
        content_iframe_html: str,
        content_trade_api: dict,
    ) -> dict:
        api_payload = content_trade_api.get("api_payload") if isinstance(content_trade_api, dict) else None
        api_data = (api_payload or {}).get("data") if isinstance(api_payload, dict) else None
        api_module = ""
        api_module_data: Any = None
        if isinstance(api_data, dict):
            preferred_keys = [
                "biddingNotice",
                "biddingChangeNotice",
                "bidCandidateAnnounce",
                "bidResultAnnounce",
                "tenderExceptionNotice",
                "inquiryNoticeDetailVo",
                "openingBidResultNoticeVo",
                "tenderTrainPreNoticeVO",
            ]
            for key in preferred_keys:
                if api_data.get(key):
                    api_module = key
                    api_module_data = api_data.get(key)
                    break
            if api_module_data is None:
                api_module_data = api_data

        api_text = "\n".join(flatten_dict_to_lines(api_module_data)) if api_module_data else ""
        api_html = f"<pre>{html.escape(api_text)}</pre>" if api_text else ""

        content_effective_html = api_html or content_iframe_html or content_raw_html
        content_effective_text = api_text or html_to_text(content_iframe_html or content_raw_html)
        content_iframe_url = urljoin(BASE_URL, content_iframe_src) if content_iframe_src else ""

        merged_annex_urls = extract_annex_urls(detail.get("annexList"))
        api_urls = extract_urls_from_nested(api_module_data) if api_module_data else []
        api_urls = [u for u in api_urls if u]
        if api_urls:
            if merged_annex_urls:
                merged_annex_urls += ";" + ";".join(api_urls)
            else:
                merged_annex_urls = ";".join(api_urls)
            dedup = []
            seen = set()
            for u in merged_annex_urls.split(";"):
                val = u.strip()
                if not val or val in seen:
                    continue
                seen.add(val)
                dedup.append(val)
            merged_annex_urls = ";".join(dedup)

        return {
            "site_name": "国家管网电子招标平台",
            "entry_url": ENTRY_URL,
            "tab": tab,
            "tab_name": TAB_NAME_MAP.get(tab, ""),
            "id": row.get("id"),
            "businessId": row.get("businessId"),
            "title": detail.get("title") or row.get("title") or "",
            "createTime": detail.get("createTime") or row.get("createTime") or "",
            "releaseTime": detail.get("releaseTime") or row.get("releaseTime") or "",
            "releaseName": detail.get("releaseName") or row.get("releaseName") or "",
            "noticeCode": detail.get("noticeCode") or row.get("noticeCode") or "",
            "detail_url": PipeChinaSpider.build_detail_url(tab, row),
            "content_html": content_effective_html,
            "content_text": content_effective_text,
            "content_resolve_method": "trade_api" if api_text else ("iframe_html" if content_iframe_html else "detail_html"),
            "content_raw_html": content_raw_html,
            "content_iframe_src": content_iframe_src,
            "content_iframe_url": content_iframe_url,
            "content_iframe_html": content_iframe_html,
            "content_iframe_text": html_to_text(content_iframe_html),
            "content_trade_api_url": content_trade_api.get("api_url", "") if isinstance(content_trade_api, dict) else "",
            "content_trade_api_module": api_module,
            "content_trade_api_json": json.dumps(api_module_data, ensure_ascii=False)
            if api_module_data is not None
            else "",
            "content_trade_api_text": api_text,
            "annex_urls": merged_annex_urls,
            "crawl_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

    @staticmethod
    def save_output(records: list[dict]) -> tuple[str, str]:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        json_file = f"pipechina_tenders_{ts}.json"
        csv_file = f"pipechina_tenders_{ts}.csv"

        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=2)

        if records:
            with open(csv_file, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.DictWriter(f, fieldnames=list(records[0].keys()))
                writer.writeheader()
                writer.writerows(records)

        return json_file, csv_file

    def crawl(self, tabs: list[str], max_pages_per_tab: int) -> list[dict]:
        records: list[dict] = []
        seen: set[str] = set()

        for tab in tabs:
            print(f"[PIPECHINA] 分类 tab={tab} ({TAB_NAME_MAP.get(tab, '未知')})")
            for page_no in range(1, max_pages_per_tab + 1):
                try:
                    rows, meta = self.fetch_list(tab, page_no)
                except Exception as exc:
                    print(f"[PIPECHINA] tab={tab} page={page_no} 列表失败: {exc}")
                    break

                if not rows:
                    print(f"[PIPECHINA] tab={tab} page={page_no} 无数据，结束该分类")
                    break

                for row in rows:
                    key = f"{tab}:{row.get('businessId') or row.get('id')}"
                    if key in seen:
                        continue
                    seen.add(key)

                    try:
                        detail = self.fetch_detail(tab, row)
                    except Exception as exc:
                        print(f"[PIPECHINA] 详情失败 key={key}: {exc}")
                        detail = {}

                    content_raw_html = html.unescape(detail.get("content") or "")
                    content_iframe_src = extract_iframe_src(content_raw_html)
                    content_iframe_html = ""
                    content_trade_api = {}
                    if content_iframe_src:
                        try:
                            content_iframe_html = self.fetch_iframe_html(
                                content_iframe_src,
                                referer_url=self.build_detail_url(tab, row),
                            )
                        except Exception as exc:
                            print(f"[PIPECHINA] iframe 拉取失败 key={key}: {exc}")
                        try:
                            content_trade_api = self.fetch_iframe_trade_detail_api(content_iframe_src)
                        except Exception as exc:
                            print(f"[PIPECHINA] iframe 详情接口失败 key={key}: {exc}")

                    records.append(
                        self.normalize_record(
                            tab,
                            row,
                            detail,
                            content_raw_html=content_raw_html,
                            content_iframe_src=content_iframe_src,
                            content_iframe_html=content_iframe_html,
                            content_trade_api=content_trade_api,
                        )
                    )
                    print(f"[PIPECHINA] 已处理 {len(records)} 条: {key}")
                    time.sleep(random.uniform(*DELAY_RANGE))

                total_pages = int(meta.get("total") or 0)
                if total_pages and page_no >= total_pages:
                    break
                if len(rows) < PAGE_SIZE:
                    break

        return records


def main():
    parser = argparse.ArgumentParser(description="国家管网电子招标平台爬虫（列表+详情）")
    parser.add_argument(
        "--tabs",
        type=str,
        default=",".join(DEFAULT_TABS),
        help="抓取分类，逗号分隔，默认 1,2,3,13,14,4,15,25,30",
    )
    parser.add_argument("--max-pages-per-tab", type=int, default=1, help="每个分类最多抓取页数，默认1")
    args = parser.parse_args()

    tabs = [x.strip() for x in args.tabs.split(",") if x.strip()]
    tabs = [x for x in tabs if x in BID_TABS or x in NON_BID_TABS]
    if not tabs:
        raise SystemExit("无有效 tabs，请检查参数")

    spider = PipeChinaSpider()
    records = spider.crawl(tabs=tabs, max_pages_per_tab=max(1, args.max_pages_per_tab))
    json_file, csv_file = spider.save_output(records)
    print(f"[PIPECHINA] 完成，共 {len(records)} 条 -> {json_file} / {csv_file}")


if __name__ == "__main__":
    main()
