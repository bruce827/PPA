#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
目标网站：山东能源集团电子招标采购平台（旧站专题页）
入口页：https://ykjtzb.dljczb.com/
列表页：https://www.dljczb.com/zhaobiao/search.php?catid=28
抓取方式：Playwright 渲染列表页 + requests 抓详情页与 task.js 会员墙内容
输出文件：ykjtzb_YYYYMMDD_HHMMSS/output.json / output.csv
运行方式：python spiders/spider_ykjtzb.py --max-pages 2
"""

from __future__ import annotations

import argparse
import html
import random
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlencode, urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

import spider_utils


ENTRY_URL = "https://ykjtzb.dljczb.com/"
SEARCH_URL = "https://www.dljczb.com/zhaobiao/search.php"
DETAIL_HOST = "https://www.dljczb.com"
DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/146.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9",
}
DELAY_RANGE = (0.4, 0.9)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def _clean_text(value: str) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value).strip()


def _strip_html(value: str) -> str:
    if not value:
        return ""
    text = re.sub(r"<script\b[^>]*>[\s\S]*?</script>", " ", value, flags=re.I)
    text = re.sub(r"<style\b[^>]*>[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return _clean_text(
        html.unescape(
            text.replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", '"')
        )
    )


def _extract_item_id(detail_url: str) -> str:
    match = re.search(r"/show-(\d+)/", detail_url or "")
    return match.group(1) if match else ""


def _extract_task_content(js_text: str) -> str:
    if not js_text:
        return ""

    match = re.search(r'Inner\(["\']content["\'],\s*\'([\s\S]*?)\'\);', js_text)
    if not match:
        return ""

    raw = match.group(1)
    # task.js 使用单引号包裹 HTML，这里恢复常见转义。
    raw = raw.replace("\\/", "/").replace("\\r", "").replace("\\n", "\n").replace("\\t", " ")
    raw = raw.replace("\\'", "'").replace('\\"', '"')
    return html.unescape(raw)


def _extract_attachments(content_html: str, base_url: str) -> list[dict[str, str]]:
    attachments: list[dict[str, str]] = []
    seen = set()
    if not content_html:
        return attachments

    soup = BeautifulSoup(content_html, "html.parser")
    for tag in soup.select("a[href]"):
        href = str(tag.get("href") or "").strip()
        if not href:
            continue
        url = urljoin(base_url, href)
        lowered = url.lower()
        if not re.search(r"\.(pdf|doc|docx|xls|xlsx|zip|rar|7z)(\?|$)", lowered):
            continue
        if url in seen:
            continue
        seen.add(url)
        name = _clean_text(tag.get_text(" ", strip=True)) or Path(urlparse(url).path).name or "attachment"
        attachments.append({"url": url, "name": name, "ext": Path(name).suffix})
    return attachments


def _build_search_url(catid: str, ctype: str, keyword: str, stime: str, page_no: int) -> str:
    params = {
        "catid": catid,
        "ctype": ctype,
        "stime": stime,
        "ecatid": "0",
        "areaid": "0",
        "fields": "0",
        "kw": keyword,
    }
    if page_no > 1:
        params["page"] = str(page_no)
    return SEARCH_URL + "?" + urlencode(params)


class YkjtzbSpider:
    def __init__(self, headless: bool = True) -> None:
        self.headless = headless
        self.session = requests.Session()
        self.session.headers.update(DEFAULT_HEADERS)

    def _sync_cookies_from_browser(self, browser_context_cookies: list[dict[str, Any]]) -> None:
        for cookie in browser_context_cookies:
            name = str(cookie.get("name") or "").strip()
            value = str(cookie.get("value") or "")
            domain = str(cookie.get("domain") or "").lstrip(".")
            if not name:
                continue
            self.session.cookies.set(name, value, domain=domain or None)

    def fetch_list_page(self, catid: str, ctype: str, keyword: str, stime: str, page_no: int) -> dict[str, Any]:
        url = _build_search_url(catid=catid, ctype=ctype, keyword=keyword, stime=stime, page_no=page_no)
        records: list[dict[str, Any]] = []

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=self.headless)
            context = browser.new_context(user_agent=DEFAULT_HEADERS["User-Agent"])
            page = context.new_page()
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(2500)
            except PlaywrightTimeoutError:
                page.wait_for_timeout(4000)

            self._sync_cookies_from_browser(context.cookies())
            rendered_html = page.content()
            browser.close()

        soup = BeautifulSoup(rendered_html, "html.parser")
        item_boxes = soup.select("div.itembox")
        for item in item_boxes:
            title_link = item.select_one("div.items > a[href*='/show-']")
            date_tag = item.select_one("span.date")
            if not title_link:
                continue

            title = _clean_text(title_link.get_text(" ", strip=True))
            detail_url = urljoin(DETAIL_HOST, str(title_link.get("href") or "").strip())
            if not detail_url:
                continue

            notice_type = ""
            power_category = ""
            region = ""
            for p_tag in item.select("div.items-tip p"):
                line = _clean_text(p_tag.get_text(" ", strip=True))
                if line.startswith("项目类型："):
                    notice_type = line.replace("项目类型：", "", 1).strip()
                elif line.startswith("电力分类："):
                    power_category = line.replace("电力分类：", "", 1).strip()
                elif line.startswith("地区："):
                    region = line.replace("地区：", "", 1).strip()

            records.append(
                {
                    "title": title,
                    "detail_url": detail_url,
                    "publish_time": _clean_text(date_tag.get_text(" ", strip=True)) if date_tag else "",
                    "item_id": _extract_item_id(detail_url),
                    "notice_type": notice_type,
                    "power_category": power_category,
                    "region": region,
                }
            )

        total_pages = 1
        for link in soup.select("a[href*='page=']"):
            href = str(link.get("href") or "")
            match = re.search(r"[?&]page=(\d+)", href)
            if match:
                total_pages = max(total_pages, int(match.group(1)))

        return {"url": url, "records": records, "total_pages": total_pages}

    def fetch_detail(self, detail_url: str) -> dict[str, Any]:
        response = self.session.get(detail_url, timeout=40, headers={"Referer": ENTRY_URL})
        response.raise_for_status()
        response.encoding = response.encoding or "utf-8"
        detail_html = response.text
        soup = BeautifulSoup(detail_html, "html.parser")

        item_id = _extract_item_id(detail_url)
        task_js_url = ""
        task_js_text = ""
        content_html = ""
        content_resolve_method = "detail_html"

        if item_id:
            task_js_url = (
                "https://www.dljczb.com/api/task.js.php"
                f"?moduleid=24&html=show&itemid={item_id}&page=1"
            )
            task_resp = self.session.get(task_js_url, timeout=40, headers={"Referer": detail_url})
            if task_resp.ok:
                task_js_text = task_resp.text
                content_html = _extract_task_content(task_js_text)
                if content_html:
                    content_resolve_method = "task_js_member_wall"

        if not content_html:
            content_node = soup.select_one("#content") or soup.select_one(".content")
            content_html = str(content_node) if content_node else ""

        detail_title = ""
        title_node = soup.select_one("h1")
        if title_node:
            detail_title = _clean_text(title_node.get_text(" ", strip=True))
        if not detail_title:
            detail_title = _clean_text(soup.title.get_text(" ", strip=True) if soup.title else "")

        publish_time = ""
        body_text = _clean_text(" ".join(soup.stripped_strings))
        time_match = re.search(r"日期[:：]\s*([0-9]{4}-[0-9]{2}-[0-9]{2})", body_text)
        if time_match:
            publish_time = time_match.group(1)

        contact_name = ""
        mobile = ""
        phone = ""
        email_value = ""
        qq_value = ""
        content_text = _strip_html(content_html)
        text_for_contact = _clean_text(content_text or body_text)

        patterns = {
            "contact_name": r"联系人[:：]\s*([^\s]+)",
            "mobile": r"手机[:：]\s*([0-9* -]{7,})",
            "phone": r"电话[:：]\s*([0-9\-()转 ]{7,})",
            "email_value": r"邮箱[:：]\s*([A-Za-z0-9_.+-]+@[A-Za-z0-9_.-]+)",
            "qq_value": r"QQ[:：]\s*([0-9]{5,})",
        }
        values = {}
        for key, pattern in patterns.items():
            matched = re.search(pattern, text_for_contact)
            values[key] = _clean_text(matched.group(1)) if matched else ""
        contact_name = values["contact_name"]
        mobile = values["mobile"]
        phone = values["phone"]
        email_value = values["email_value"]
        qq_value = values["qq_value"]

        attachments = _extract_attachments(content_html, detail_url)
        return {
            "detail_title": detail_title,
            "publish_time": publish_time,
            "content_raw_html": detail_html,
            "content_html": content_html,
            "content_text": content_text,
            "content_resolve_method": content_resolve_method,
            "task_js_url": task_js_url,
            "task_js_text": task_js_text,
            "attachments": attachments,
            "contact_name": contact_name,
            "mobile": mobile,
            "phone": phone,
            "email": email_value,
            "qq": qq_value,
        }

    def crawl(self, max_pages: int, catid: str, ctype: str, keyword: str, stime: str) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        seen_ids: set[str] = set()

        for page_no in range(1, max_pages + 1):
            print(f"[YKJTZB] 抓取列表页 {page_no} ...")
            page_data = self.fetch_list_page(catid=catid, ctype=ctype, keyword=keyword, stime=stime, page_no=page_no)
            rows = page_data.get("records") or []
            if not rows:
                print("[YKJTZB] 列表为空，停止")
                break

            for row in rows:
                item_id = str(row.get("item_id") or "").strip()
                if not item_id or item_id in seen_ids:
                    continue
                seen_ids.add(item_id)

                detail = self.fetch_detail(row["detail_url"])
                attachments = detail.get("attachments") or []
                results.append(
                    {
                        "site_name": "山东能源集团电子招标采购平台（旧站专题页）",
                        "entry_url": ENTRY_URL,
                        "search_url": page_data.get("url") or "",
                        "search_catid": catid,
                        "search_ctype": ctype,
                        "search_keyword": keyword,
                        "search_stime": stime,
                        "source_id": item_id,
                        "title": row.get("title") or detail.get("detail_title") or "",
                        "publish_time": row.get("publish_time") or detail.get("publish_time") or "",
                        "notice_type": row.get("notice_type") or "",
                        "power_category": row.get("power_category") or "",
                        "region": row.get("region") or "",
                        "detail_url": row.get("detail_url") or "",
                        "content_raw_html": detail.get("content_raw_html") or "",
                        "content_html": detail.get("content_html") or "",
                        "content_text": detail.get("content_text") or "",
                        "content_resolve_method": detail.get("content_resolve_method") or "",
                        "task_js_url": detail.get("task_js_url") or "",
                        "contact_name": detail.get("contact_name") or "",
                        "mobile": detail.get("mobile") or "",
                        "phone": detail.get("phone") or "",
                        "email": detail.get("email") or "",
                        "qq": detail.get("qq") or "",
                        "attachments": attachments,
                        "attachment_urls": ";".join([x.get("url", "") for x in attachments if x.get("url")]),
                        "crawl_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    }
                )
                print(f"[YKJTZB] 已处理 {len(results)} 条: item_id={item_id}")
                time.sleep(random.uniform(*DELAY_RANGE))

            total_pages = int(page_data.get("total_pages") or 1)
            if page_no >= total_pages:
                break

        return results


def main() -> None:
    parser = argparse.ArgumentParser(description="山东能源旧站专题页爬虫（列表+详情会员墙）")
    parser.add_argument("--max-pages", type=int, default=1, help="最大抓取页数，默认1")
    parser.add_argument("--catid", type=str, default="28", help="电力集团分类，默认28（山东能源集团）")
    parser.add_argument("--ctype", type=str, default="", help="项目分类：空=全部，157035=工程，2=货物，3=服务")
    parser.add_argument("--keyword", type=str, default="山东能源", help="搜索关键词，默认山东能源")
    parser.add_argument("--stime", type=str, default="", help="发布时间筛选：空/1/3/7/30/90 等站点参数值")
    parser.add_argument("--headed", action="store_true", help="使用有头浏览器，便于排障")
    args = parser.parse_args()

    spider = YkjtzbSpider(headless=not args.headed)
    records = spider.crawl(
        max_pages=max(1, args.max_pages),
        catid=args.catid.strip() or "28",
        ctype=args.ctype.strip(),
        keyword=args.keyword.strip() or "山东能源",
        stime=args.stime.strip(),
    )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    folder_name = f"ykjtzb_{timestamp}"
    Path(folder_name).mkdir(parents=True, exist_ok=True)

    json_file, csv_file = spider_utils.save_output_with_attachments(
        records,
        folder_name,
        attachments_field="attachments",
        record_id_field="source_id",
        record_name_field="title",
        referer_field="detail_url",
    )
    print(f"[YKJTZB] 完成，共 {len(records)} 条 -> {json_file} / {csv_file}")


if __name__ == "__main__":
    main()
