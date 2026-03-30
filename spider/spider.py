"""
目标网站：中国石油招标中心 - https://www2.cnpcbidding.com/#/wel/search?center=
抓取字段：goodsId、goodsName、projectName、projectCode、bidSaleStartDateTime、bidSaleEndDateTime、openBidDateTime、goodsPrice、tenantName、goodsAddress、招标公告 HTML 内容等
运行方式：pip install requests beautifulsoup4 && python spider.py
输出文件：output.json / output.csv
"""

import json
import csv
import time
import random
import re
from datetime import datetime

import requests
from bs4 import BeautifulSoup


# ── 配置 ──────────────────────────────────────────
BASE_URL = "https://www2.cnpcbidding.com"
LIST_API = BASE_URL + "/project/search/globalSearch"
DETAIL_INFO_API = BASE_URL + "/project/index/pc/getGoodsInfo"
DETAIL_HTML_API = BASE_URL + "/project/index/pc/listGoodsIntroduce"
MAX_PAGES = 1
PAGE_SIZE = 20
DELAY = (1, 2)  # 请求间隔（秒）

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json;charset=UTF-8",
    "Referer": "https://www2.cnpcbidding.com/#/wel/search?center=",
}


def parse_html_to_text(html: str) -> str:
    if not html:
        return ""
    soup = BeautifulSoup(html, "lxml")
    # 保留段落换行
    return "\n".join([p.get_text(" ", strip=True) for p in soup.find_all(["p", "div", "li"]) if p.get_text(strip=True)])


def fetch_list_page(page: int) -> list[dict]:
    payload = {
        "text": "",
        "center": [],
        "projectType": [],
        "organizationForm": [],
        "type": "-1",
        "current": page,
        "size": PAGE_SIZE,
    }

    resp = requests.post(LIST_API, json=payload, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    data = resp.json()

    if data.get("code") != 0:
        raise ValueError(f"列表接口返回异常 code={data.get('code')}, msg={data.get('msg')}")

    records = data.get("data", {}).get("records") or []
    return records


def fetch_detail_info(goods_id: str) -> dict:
    params = {"goodsId": goods_id}
    resp = requests.get(DETAIL_INFO_API, params=params, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 0:
        return {}
    return data.get("data", {}).get("goodsDetails") or {}


def fetch_detail_html(goods_id: str) -> str:
    params = {"goodsId": goods_id}
    resp = requests.get(DETAIL_HTML_API, params=params, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 0:
        return ""
    return data.get("data") or ""


def save_output(records: list[dict]) -> None:
    with open("output.json", "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    if records:
        with open("output.csv", "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=records[0].keys())
            writer.writeheader()
            writer.writerows(records)

    print(f"已保存 {len(records)} 条数据 → output.json / output.csv")


def normalize_record(item: dict) -> dict:
    return {
        "goodsId": item.get("goodsId"),
        "goodsName": item.get("goodsName"),
        "projectName": item.get("projectName"),
        "projectCode": item.get("projectCode"),
        "bidSaleStartDateTime": item.get("bidSaleStartDateTime"),
        "bidSaleEndDateTime": item.get("bidSaleEndDateTime"),
        "openBidDateTime": item.get("openBidDateTime"),
        "goodsPrice": item.get("goodsPrice"),
        "tenantName": item.get("tenantName"),
        # 详情页 API 中可能包含的字段
        "goodsAddress": item.get("goodsAddress"),
        "saleMode": item.get("saleMode"),
        "projectType": item.get("projectType"),
    }


def main():
    all_records = []
    seen_ids = set()

    for page in range(1, MAX_PAGES + 1):
        print(f"抓取列表页 {page} ...")
        try:
            items = fetch_list_page(page)
        except Exception as e:
            print(f"  列表页 {page} 失败: {e}")
            break

        if not items:
            print("列表页无数据，停止")
            break

        new_items = [i for i in items if i.get("goodsId") and i.get("goodsId") not in seen_ids]
        if not new_items:
            print("已无新数据，停止")
            break

        for i, item in enumerate(new_items, start=1):
            goods_id = item.get("goodsId")
            seen_ids.add(goods_id)
            record = normalize_record(item)
            record["detail_url"] = f"{BASE_URL}/#/wel/commodityDetails?goodsId={goods_id}&type=list"

            try:
                detail_info = fetch_detail_info(goods_id)
                record.update({
                    "goodsAddress": detail_info.get("goodsAddress"),
                    "goodsPrice": detail_info.get("goodsPrice") or record.get("goodsPrice"),
                    "tenantName": detail_info.get("tenantName") or record.get("tenantName"),
                })
            except Exception as e:
                print(f"  详情接口失败 {goods_id}: {e}")

            try:
                html = fetch_detail_html(goods_id)
                record["detail_html"] = html
                record["detail_text"] = parse_html_to_text(html)
            except Exception as e:
                print(f"  详情HTML失败 {goods_id}: {e}")
                record["detail_html"] = ""
                record["detail_text"] = ""

            all_records.append(record)
            print(f"  {len(all_records)}: {record['goodsId']} {record['goodsName']}")
            time.sleep(random.uniform(*DELAY))

        # 如果当前页返回条目少于 page size，则认为已到末页
        if len(items) < PAGE_SIZE:
            print("已到末页，停止")
            break

    save_output(all_records)


if __name__ == "__main__":
    main()
