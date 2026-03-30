"""
目标网站：中航工业电子采购平台 - https://www.eavic.com
抓取字段：标题、发布时间、招标内容、资格要求等
运行方式：pip install requests beautifulsoup4 lxml && python spider_eavic.py
输出文件：output_eavic_{timestamp}.json / output_eavic_{timestamp}.csv

注意：该网站使用 JavaScript 渲染，但可以通过解析 HTML 获取数据。
"""

import json
import csv
import time
import random
import re
import os
from datetime import datetime
from typing import Optional
from pathlib import Path

try:
    from spiders import spider_utils
except ModuleNotFoundError:
    import sys
    sys.path.append(os.path.join(os.path.dirname(__file__), "spiders"))
    import spider_utils

import requests
from bs4 import BeautifulSoup

# ── 配置 ──────────────────────────────────────────
BASE_URL = "https://www.eavic.com"
LIST_API = BASE_URL + "/rest/portal/getPgeTenderNotice"
DETAIL_URL = BASE_URL + "/rest/article/getTenderInfo"

INFO_CLASS_MAP = {
    "ZBGG": "招标公告",
    "ZBGS": "中标结果",
    "BGGG": "变更公告",
    "QGGG": "其他公告",
}

MAX_PAGES = 3
PAGE_SIZE = 10
DELAY_RANGE = (2, 4)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
]

SESSION = requests.Session()


def get_headers() -> dict:
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Connection": "keep-alive",
        "Referer": BASE_URL + "/",
    }


def fetch_list_page(page: int, info_class: str = "ZBGG") -> list[dict]:
    """获取列表页 - 使用 API 接口。"""
    headers = get_headers()
    headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8"
    headers["X-Requested-With"] = "XMLHttpRequest"
    
    # POST 数据
    data = {
        "title": "",
        "infoClass": info_class,
        "purchaseOrderDetails": "",
        "pageNo": str(page),
        "pageSize": str(PAGE_SIZE),
    }
    
    try:
        resp = SESSION.post(LIST_API, data=data, headers=headers, timeout=30)
        resp.raise_for_status()
        
        # 解析 JSON
        json_data = resp.json()
        records = []
        
        # 提取数据（根据实际 API 返回结构调整）
        # 可能的结构：{"data": [...]} 或 {"data": {"list": [...]}} 或 {"mdata": [...]}
        data_list = []
        if isinstance(json_data.get("data"), list):
            data_list = json_data.get("data", [])
        elif isinstance(json_data.get("data"), dict):
            data_list = json_data.get("data", {}).get("list", [])
        elif isinstance(json_data.get("mdata"), list):
            data_list = json_data.get("mdata", [])
        elif isinstance(json_data.get("mdata"), dict):
            data_list = json_data.get("mdata", {}).get("list", [])
        
        for item in data_list:
            if not isinstance(item, dict):
                continue
            tender_id = item.get("id") or item.get("tenderId") or item.get("noticeId")
            if not tender_id:
                continue
            
            records.append({
                "id": str(tender_id),
                "title": item.get("title") or item.get("tenderTitle") or "",
                "publishDate": item.get("publishDate") or item.get("noticeTime") or "",
                "infoClass": item.get("infoClass") or info_class,
                "detail_url": f"{DETAIL_URL}?id={tender_id}",
            })
        
        return records
        
    except Exception as e:
        print(f"  列表页失败：{e}")
        return []


def fetch_detail(tender_id: str) -> dict:
    """获取详情页。"""
    url = f"{DETAIL_URL}?id={tender_id}"
    headers = get_headers()
    
    try:
        resp = SESSION.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        
        soup = BeautifulSoup(resp.text, "lxml")
        
        detail = {
            "title": "",
            "content": "",
            "publish_date": "",
            "attachment_urls": [],
        }
        
        # 提取标题
        title_el = soup.find("title")
        if title_el:
            detail["title"] = title_el.get_text(" ", strip=True).split("-")[0].strip()
        
        # 提取内容
        content_el = soup.find("div", class_="article-content")
        if content_el:
            detail["content"] = content_el.get_text(" ", strip=True)[:5000]
        
        # 提取附件
        for a in soup.select(".p-file a[href]"):
            href = a.get("href", "").strip()
            if href:
                detail["attachment_urls"].append({
                    "name": a.get_text(" ", strip=True) or "附件",
                    "url": href if href.startswith("http") else BASE_URL + href,
                })
        
        return detail
        
    except Exception as e:
        print(f"  详情失败：{e}")
        return {}


def save_output(records: list[dict], folder_prefix: str = "output_eavic"):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    folder = f"{folder_prefix}_{timestamp}"
    
    for record in records:
        if "attachment_urls" in record:
            record["attachment_urls_str"] = ";".join([
                f"{a.get('name', '')}:{a.get('url', '')}"
                for a in record.get("attachment_urls", [])
            ])
    
    json_file, csv_file = spider_utils.save_output_with_attachments(
        records,
        folder,
        attachments_field="attachment_urls",
        record_id_field="tender_id",
        record_name_field="title",
        referer_field="detail_url",
    )
    print(f"已保存 {len(records)} 条 → {json_file} / {csv_file}")


def main():
    all_records = []
    seen_ids = set()
    
    print(f"开始抓取中航工业电子采购平台数据...")
    print(f"列表 API: {LIST_API}")
    print(f"最大页数：{MAX_PAGES}")
    print(f"反爬配置：延迟 {DELAY_RANGE[0]}-{DELAY_RANGE[1]} 秒")
    print("-" * 60)
    
    for page in range(1, MAX_PAGES + 1):
        print(f"\n抓取列表页 {page} ...")
        
        if page > 1:
            wait_time = random.uniform(3, 6)
            print(f"  等待 {wait_time:.1f} 秒（页间延迟）...")
            time.sleep(wait_time)
        
        items = fetch_list_page(page, "ZBGG")
        
        if not items:
            print("  列表页无数据，停止")
            break
        
        print(f"  找到 {len(items)} 条记录")
        
        new_items = [i for i in items if i.get("id") and i.get("id") not in seen_ids]
        if not new_items:
            print("  已无新数据，停止")
            break
        
        for i, item in enumerate(new_items, start=1):
            tender_id = item.get("id")
            seen_ids.add(tender_id)
            
            title = item.get("title", "")[:50]
            print(f"  [{len(all_records) + 1}] 抓取详情：{title}...")
            
            try:
                detail = fetch_detail(tender_id)
                
                if not detail:
                    print(f"      ✗ 详情页为空")
                    record = {
                        "tender_id": tender_id,
                        "title": item.get("title"),
                        "info_class": item.get("infoClass"),
                        "publish_date": item.get("publishDate"),
                        "detail_url": item.get("detail_url"),
                        "content": "",
                        "attachment_urls": [],
                    }
                    all_records.append(record)
                    continue
                
                record = {
                    "tender_id": tender_id,
                    "title": item.get("title") or detail.get("title"),
                    "info_class": item.get("infoClass"),
                    "info_class_name": INFO_CLASS_MAP.get(item.get("infoClass"), ""),
                    "publish_date": item.get("publishDate"),
                    "content": detail.get("content", ""),
                    "detail_url": item.get("detail_url"),
                    "attachment_urls": detail.get("attachment_urls", []),
                }
                all_records.append(record)
                print(f"      ✓ 成功")
                
            except Exception as e:
                print(f"      ✗ 详情失败：{e}")
                record = {
                    "tender_id": tender_id,
                    "title": item.get("title"),
                    "info_class": item.get("infoClass"),
                    "publish_date": item.get("publishDate"),
                    "detail_url": item.get("detail_url"),
                    "content": "",
                    "attachment_urls": [],
                }
                all_records.append(record)
            
            time.sleep(random.uniform(*DELAY_RANGE))
        
        if len(items) < PAGE_SIZE:
            print("  已到末页，停止")
            break
    
    print("\n" + "=" * 60)
    print(f"抓取完成！共 {len(all_records)} 条记录")
    
    if all_records:
        save_output(all_records)
    else:
        print("无数据可保存")


if __name__ == "__main__":
    main()
