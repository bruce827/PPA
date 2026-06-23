"""
目标网站：辽宁省政府采购网 - http://www.ccgp-liaoning.gov.cn/portalindex?currentKey=pubAnnounce&tabKey=1001
抓取字段：公告ID、编号、标题、发布单位、信息类型、地区、发布时间、有效期、详情链接、详情内容等
运行方式：pip install requests beautifulsoup4 && python spider_liaoning.py
输出文件：output_liaoning.json / output_liaoning.csv
数据来源：API接口获取列表，详情页抓取完整公告内容
"""

import json
import csv
import os
import time
import random
import re
from datetime import datetime
from urllib.parse import urlparse, unquote

try:
    import spider_utils
except ModuleNotFoundError:
    from spiders import spider_utils

import requests
from bs4 import BeautifulSoup


# ── 配置 ──────────────────────────────────────────
BASE_URL = "http://www.ccgp-liaoning.gov.cn"
LIST_URL = BASE_URL + "/portalindex?currentKey=pubAnnounce&tabKey=1001"
LIST_API = BASE_URL + "/gateway/complaint_core/homePage/getHomePunInfoList"
MAX_PAGES = 3  # 测试3页
FETCH_DETAILS = True  # 启用详情页抓取
DELAY = (1, 2)  # 请求间隔（秒）

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json;charset=UTF-8",
    "Referer": LIST_URL,
}

# 全局会话复用，避免频繁新建连接
SESSION = requests.Session()
SESSION.headers.update(HEADERS)


def fetch_list_page_api(page: int) -> list[dict]:
    """使用 API 获取列表数据"""
    payload = {
        "pageNum": page,
        "pageSize": 10,
    }

    try:
        resp = SESSION.post(LIST_API, json=payload, timeout=20)
        resp.raise_for_status()
        data = resp.json()

        if data.get("code") != 200:
            print(f"API返回错误: {data}")
            return []

        # 从响应中提取数据列表
        items = data.get("data", {}).get("data", [])
        print(f"第{page}页获取到 {len(items)} 条记录")

        # 调试：打印第一条记录的所有字段
        if items:
            print("\n第一条记录的所有字段:")
            for key, value in items[0].items():
                if isinstance(value, str) and len(value) > 100:
                    print(f"  {key}: {value[:100]}...")
                else:
                    print(f"  {key}: {value}")

        return items

    except Exception as e:
        print(f"API调用失败: {e}")
        return []


def fetch_list_page_html() -> list[dict]:
    """如果 API 不可用，使用 HTML 解析"""
    try:
        resp = requests.get(LIST_URL, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")

        # 从快照分析，列表项在类似这样的结构中
        items = []

        # 查找公告列表（根据快照中的标题）
        # 这需要根据实际HTML结构调整选择器
        announcement_items = soup.find_all("div", class_=re.compile(r".*item.*|.*list.*|.*announce.*"))

        for item in announcement_items[:10]:  # 限制前10个
            title_elem = item.find("a") or item.find("h3") or item.find("span")
            date_elem = item.find("span", class_=re.compile(r".*date.*|.*time.*"))

            if title_elem:
                title = title_elem.get_text(strip=True)
                link = title_elem.get("href") if title_elem.name == "a" else ""
                if link and not link.startswith("http"):
                    link = BASE_URL + link

                date_str = date_elem.get_text(strip=True) if date_elem else ""

                items.append({
                    "title": title,
                    "url": link,
                    "publish_date": date_str,
                    "source": "辽宁省政府采购网"
                })

        return items

    except Exception as e:
        print(f"HTML解析失败: {e}")
        return []


def fetch_detail_page(url: str, item: dict = None) -> dict:
    """使用详情API获取公告内容，并提取附件列表"""
    if not item or not item.get("id"):
        return {"content": "", "attachments": []}

    detail_api = BASE_URL + f"/gateway/complaint_core/homePage/viewPubInfo/{item['id']}"

    try:
        resp = SESSION.get(detail_api, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        if data.get("code") == 200 and "data" in data:
            pub_info = data["data"].get("pubInfomation", {})

            # 提取正文内容
            content_html = pub_info.get("content", "")
            cleaned_content = ""
            if content_html:
                soup = BeautifulSoup(content_html, "lxml")
                for script in soup(["script", "style", "nav", "header", "footer"]):
                    script.decompose()
                text_content = soup.get_text(separator="\n", strip=True)
                lines = [line.strip() for line in text_content.split("\n") if line.strip()]
                cleaned_content = "\n".join(lines)
                if len(cleaned_content) > 10000:
                    cleaned_content = cleaned_content[:10000] + "..."

            # 提取附件列表
            attachments = []
            file_list = data["data"].get("pubInfomationFileList")
            if isinstance(file_list, list):
                for file_item in file_list:
                    attachments.append({
                        "name": file_item.get("fileName"),
                        "url": file_item.get("filePath"),
                        "ext": file_item.get("fileExtension"),
                    })

            return {"content": cleaned_content, "attachments": attachments}

        return {"content": "获取详情内容失败", "attachments": []}

    except Exception as e:
        print(f"详情API调用失败 {detail_api}: {e}")
        return {"content": "", "attachments": []}


# 统一使用 spiders.spider_utils 提供的输出与附件下载


def normalize_record(item: dict) -> dict:
    """标准化列表项字段为输出结构"""
    item_id = item.get("id", "")
    url = item.get("redirectURL") or (BASE_URL + "/portaldetail?infoId=" + item_id if item_id else "")

    return {
        "id": item_id,
        "sn": item.get("sn", ""),
        "title": item.get("title", ""),
        "dn": item.get("dn", ""),
        "tovStart": item.get("tovStart", ""),
        "tovEnd": item.get("tovEnd", ""),
        "releaseDate": item.get("releaseDate", ""),
        "editor": item.get("editor", ""),
        "infoTypeName": item.get("infoTypeName", ""),
        "districtName": item.get("districtName", ""),
        "url": url,
        "source": "辽宁省政府采购网",
        "detail_content": "",
        "attachments": [],
        "crawl_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


def main():
    all_records = []

    print(f"开始抓取辽宁省政府采购网，最多 {MAX_PAGES} 页...")

    for page in range(1, MAX_PAGES + 1):
        print(f"\n抓取第 {page} 页...")
        items = fetch_list_page_api(page)

        if not items:
            print(f"第 {page} 页无数据，停止")
            break

        for i, item in enumerate(items, start=1):
            record = normalize_record(item)

            # 获取详情页内容（如果启用）
            if FETCH_DETAILS and record["url"]:
                print(f"  获取详情 {len(all_records) + i}: {record['title'][:30]}...")
                detail_info = fetch_detail_page(record["url"], item)
                record["detail_content"] = detail_info.get("content", "")
                record["attachments"] = detail_info.get("attachments", [])
            else:
                print(f"  跳过详情 {len(all_records) + i}: {record['title'][:30]}...")

            all_records.append(record)
            time.sleep(random.uniform(*DELAY))

        # 如果获取的条目少于每页大小，说明已经是最后一页
        if len(items) < 10:
            print("已到末页，停止")
            break

    # 生成按时间命名的输出文件夹
    folder_name = f"output_liaoning_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    spider_utils.save_output_with_attachments(
        all_records,
        folder_name,
        attachments_field="attachments",
        record_id_field="id",
        record_name_field="sn",
        referer_field="url",
    )


if __name__ == "__main__":
    main()