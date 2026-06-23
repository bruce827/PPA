#!/usr/bin/env python3
"""Scrape sample tender records from the public CNOOC tender listing."""

from __future__ import annotations

import argparse
import html
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List
from urllib.request import Request, urlopen

BASE_URL = "https://buy.cnooc.com.cn"
DEFAULT_LISTING_URL = f"{BASE_URL}/cbjyweb/001/001001/1.html"
USER_AGENT = "Mozilla/5.0"

LIST_ITEM_RE = re.compile(
    r'<li class="now-hd-items clearfix">\s*'
    r'<a href="(?P<href>[^"]+)"[^>]*title="(?P<title>[^"]+)">.*?</a>\s*'
    r'<span class="now-span" style="width:100px">(?P<date>\d{4}-\d{2}-\d{2})</span>',
    re.S,
)
LABEL_RE = re.compile(r'<div class="label">(.*?)</div>\s*<div class="content">(.*?)</div>', re.S)
TITLE_RE = re.compile(r"<h1>(.*?)</h1>", re.S)
ISSUER_RE = re.compile(r"招标人：(.*?)</td>", re.S)
AGENT_RE = re.compile(r"招标代理机构：(.*?)</td>", re.S)


def fetch_html(url: str) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=20) as response:
        return response.read().decode("utf-8", "ignore")


def strip_tags(value: str) -> str:
    value = re.sub(r"<script.*?</script>", "", value, flags=re.S)
    value = re.sub(r"<style.*?</style>", "", value, flags=re.S)
    value = re.sub(r"<.*?>", " ", value, flags=re.S)
    value = html.unescape(value)
    return " ".join(value.split())


def cn_datetime_to_iso(value: str) -> str:
    value = value.strip()
    if not value:
        return ""
    if "时" in value:
        date_time = datetime.strptime(value, "%Y年%m月%d日 %H时%M分")
        return date_time.strftime("%Y-%m-%dT%H:%M:00+08:00")
    date_time = datetime.strptime(value, "%Y年%m月%d日")
    return date_time.strftime("%Y-%m-%dT00:00:00+08:00")


def build_announcement_html(fields: Dict[str, str], issuer: str, agent: str) -> str:
    rows = [
        ("项目概况", fields.get("项目概况", "")),
        ("项目所在地", fields.get("项目所在地", "")),
        ("主要技术规格", fields.get("主要技术规格", "")),
        ("交货期/服务期/完工期", fields.get("交货期/服务期/完工期", "")),
        ("招标范围", fields.get("招标范围", "")),
        ("招标文件领取时间", fields.get("招标文件领取时间", "")),
        ("投标文件递交截止时间", fields.get("投标文件递交截止时间", "")),
        ("招标人", issuer),
        ("招标代理机构", agent),
    ]
    lines = ["<h3>招标公告</h3>"]
    for key, value in rows:
        if value:
            lines.append(f"<p><strong>{html.escape(key)}：</strong>{html.escape(value)}</p>")
    return "".join(lines)


def build_announcement_plain_text(fields: Dict[str, str], issuer: str, agent: str) -> str:
    rows = [
        ("项目概况", fields.get("项目概况", "")),
        ("项目所在地", fields.get("项目所在地", "")),
        ("主要技术规格", fields.get("主要技术规格", "")),
        ("交货期/服务期/完工期", fields.get("交货期/服务期/完工期", "")),
        ("招标范围", fields.get("招标范围", "")),
        ("招标文件领取时间", fields.get("招标文件领取时间", "")),
        ("投标文件递交截止时间", fields.get("投标文件递交截止时间", "")),
        ("招标人", issuer),
        ("招标代理机构", agent),
    ]
    return "\n".join(f"{key}：{value}" for key, value in rows if value)


def build_detail_payload(fields: Dict[str, str], issuer: str, agent: str, listing_page: str) -> Dict[str, str]:
    qualification = fields.get("资格要求", "")
    qualification_excerpt = qualification[:140] + "..." if len(qualification) > 140 else qualification
    return {
        "listing_page": listing_page,
        "project_name": fields.get("项目名称", ""),
        "bid_package_no": fields.get("标段（包）编号", ""),
        "project_overview": fields.get("项目概况", ""),
        "main_specification": fields.get("主要技术规格", ""),
        "delivery_term": fields.get("交货期/服务期/完工期", ""),
        "scope": fields.get("招标范围", ""),
        "qualification_excerpt": qualification_excerpt,
        "document_receive_time": fields.get("招标文件领取时间", ""),
        "document_price": fields.get("招标文件价格", ""),
        "submission_deadline": fields.get("投标文件递交截止时间", ""),
        "bid_place": fields.get("投标地点", ""),
        "submit_method": fields.get("投标文件递交方法", ""),
        "open_time": fields.get("开标时间", ""),
        "open_place": fields.get("开标地点", ""),
        "issuer": issuer,
        "agent": agent,
    }


def scrape_detail(detail_url: str, listing_page: str) -> Dict[str, object]:
    raw_html = fetch_html(detail_url)
    title = strip_tags(TITLE_RE.search(raw_html).group(1))
    fields = {strip_tags(key): strip_tags(value) for key, value in LABEL_RE.findall(raw_html)}
    issuer_match = ISSUER_RE.search(raw_html)
    agent_match = AGENT_RE.search(raw_html)
    issuer = strip_tags(issuer_match.group(1)) if issuer_match else ""
    agent = strip_tags(agent_match.group(1)) if agent_match else ""
    published_text = fields.get("发标日期", "")
    deadline_text = fields.get("投标文件递交截止时间", "")
    detail_payload = build_detail_payload(fields, issuer, agent, listing_page)

    return {
        "source_item_id": Path(detail_url).stem,
        "title": title,
        "published_at": cn_datetime_to_iso(published_text),
        "published_date": cn_datetime_to_iso(published_text)[:10],
        "deadline_at": cn_datetime_to_iso(deadline_text),
        "deadline_date": cn_datetime_to_iso(deadline_text)[:10],
        "issuer": issuer,
        "budget_amount": None,
        "region": fields.get("项目所在地", ""),
        "source_platform": "中国海洋石油集团有限公司采办业务管理与交易系统",
        "source_url": detail_url,
        "summary": fields.get("项目概况", title),
        "announcement_html": build_announcement_html(fields, issuer, agent),
        "announcement_plain_text": build_announcement_plain_text(fields, issuer, agent),
        "detail_payload": detail_payload,
        "adopt_status": "unadopted",
        "adopted_by_openid": "",
        "adopted_by_name": "",
        "adopted_at": "",
        "last_pushed_at": cn_datetime_to_iso(published_text),
        "created_at": cn_datetime_to_iso(published_text),
        "updated_at": cn_datetime_to_iso(published_text),
    }


def scrape_listing(listing_url: str, count: int) -> List[Dict[str, object]]:
    listing_html = fetch_html(listing_url)
    entries: List[Dict[str, object]] = []

    for match in LIST_ITEM_RE.finditer(listing_html):
        title = html.unescape(match.group("title"))
        if title.startswith("【变更公告】"):
            continue

        href = match.group("href")
        detail_url = href if href.startswith("http") else f"{BASE_URL}{href}"
        entries.append(scrape_detail(detail_url, listing_url))

        if len(entries) >= count:
            break

    return entries


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape sample tenders from the public CNOOC listing.")
    parser.add_argument("--listing-url", default=DEFAULT_LISTING_URL, help="CNOOC listing page URL")
    parser.add_argument("--count", type=int, default=4, help="How many non-change items to scrape")
    parser.add_argument(
        "--output",
        default="frontend/ppa_miniapp/data/sample-tenders.json",
        help="Output JSON path",
    )
    args = parser.parse_args()

    records = scrape_listing(args.listing_url, args.count)
    output_path = Path(args.output)
    if output_path.suffix.lower() == ".jsonl":
        content = "\n".join(json.dumps(record, ensure_ascii=False) for record in records) + "\n"
    else:
        content = json.dumps(records, ensure_ascii=False, indent=2) + "\n"

    output_path.write_text(content, encoding="utf-8")
    print(f"saved {len(records)} records to {output_path}")


if __name__ == "__main__":
    main()
