"""
目标网站：国投集团电子采购平台 - https://www.sdicc.com.cn/cgxx/cgxxList
抓取字段：gcGuid, ggGuid, 公告名称，项目编号，项目类型，采购方式，发布时间，文件获取时间，截标时间，招标人，代理机构，附件下载等
运行方式：pip install requests beautifulsoup4 lxml pypdf2 && python spider_sdicc.py
输出文件：output_sdicc_{timestamp}.json / output_sdicc_{timestamp}.csv
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

# PDF 解析库
try:
    from pypdf import PdfReader
    PDF_AVAILABLE = True
except ImportError:
    try:
        from PyPDF2 import PdfReader
        PDF_AVAILABLE = True
    except ImportError:
        PDF_AVAILABLE = False
        print("⚠️  警告：pypdf 未安装，PDF 解析功能不可用。运行：pip install pypdf")


# ── 配置 ──────────────────────────────────────────
BASE_URL = "https://www.sdicc.com.cn"
LIST_URL = BASE_URL + "/cgxx/ggList"
DETAIL_URL = BASE_URL + "/cgxx/ggDetail"
MAX_PAGES = 1  # 测试用，生产环境可调整
PAGE_SIZE = 10  # 每页 10 条

# 反爬优化配置 - 方案 B：低频抓取
DELAY_RANGE = (5, 8)  # 请求间隔（秒）- 增加延迟
MAX_RETRIES = 2  # 最大重试次数
RETRY_DELAY = (10, 20)  # 重试间隔（秒）
PAGE_DELAY_RANGE = (30, 60)  # 页间延迟（秒）- 关键！大幅降低频率

# User-Agent 池（轮换使用）
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
]

# 会话管理，保持 Cookie
SESSION = requests.Session()


def get_random_headers() -> dict:
    """生成随机请求头，模拟真实浏览器。"""
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Origin": BASE_URL,
        "Referer": BASE_URL + "/cgxx/cgxxList",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Cache-Control": "max-age=0",
    }


def parse_html_to_text(html: str) -> str:
    """将 HTML 转换为纯文本，只提取详情区域。"""
    if not html:
        return ""
    soup = BeautifulSoup(html, "lxml")
    # 移除 script 和 style
    for tag in soup(["script", "style"]):
        tag.decompose()
    
    # 只提取详情区域的内容
    detail_content = soup.find("div", class_="dg-notice-detail")
    if not detail_content:
        detail_content = soup
    
    # 提取文本
    texts = []
    for p in detail_content.find_all(["p", "div", "li", "span", "h3"]):
        text = p.get_text(" ", strip=True)
        if text and len(text) > 1:
            texts.append(text)
    return "\n".join(texts)


def extract_attachment_urls(html: str) -> list[dict]:
    """从详情 HTML 中提取附件下载链接。"""
    if not html:
        return []
    soup = BeautifulSoup(html, "lxml")
    attachments = []
    for a in soup.select("a[href*='downloadFile']"):
        href = a.get("href", "").strip()
        if not href or href.startswith("#") or href.lower().startswith("javascript:"):
            continue
        text = a.get_text(" ", strip=True) or "附件下载"
        # 如果是相对 URL，转换为绝对 URL
        if href.startswith("/"):
            href = BASE_URL + href
        attachments.append({
            "name": text,
            "url": href,
        })
    return attachments


def download_attachment(url: str, save_path: Path, session: requests.Session) -> Optional[str]:
    """下载附件并返回文件路径。"""
    try:
        headers = get_random_headers()
        headers["Referer"] = DETAIL_URL
        
        resp = session.get(url, headers=headers, timeout=60, stream=True)
        resp.raise_for_status()
        
        # 确保目录存在
        save_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 写入文件
        with open(save_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        return str(save_path)
    except Exception as e:
        print(f"      附件下载失败：{e}")
        return None


def parse_pdf_content(pdf_path: str) -> str:
    """解析 PDF 文件内容，返回纯文本。"""
    if not PDF_AVAILABLE:
        return ""
    
    if not os.path.exists(pdf_path):
        return ""
    
    try:
        reader = PdfReader(pdf_path)
        texts = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                texts.append(text)
        return "\n".join(texts)
    except Exception as e:
        print(f"      PDF 解析失败：{e}")
        return ""


def init_session() -> None:
    """初始化会话，访问首页获取 Cookie。"""
    global SESSION
    SESSION = requests.Session()
    
    # 先访问首页
    headers = get_random_headers()
    try:
        resp = SESSION.get(BASE_URL, headers=headers, timeout=30)
        time.sleep(random.uniform(1, 2))
    except Exception as e:
        print(f"初始化会话失败：{e}")


def fetch_with_retry(url: str, method: str = "GET", data: dict = None, params: dict = None, 
                     max_retries: int = MAX_RETRIES) -> Optional[requests.Response]:
    """带重试的请求函数。"""
    global SESSION
    
    for attempt in range(max_retries):
        try:
            headers = get_random_headers()
            
            if method.upper() == "GET":
                resp = SESSION.get(url, params=params, headers=headers, timeout=30)
            else:
                resp = SESSION.post(url, data=data, headers=headers, timeout=30)
            
            # 检查是否触发反爬（406 错误）
            if resp.status_code == 406:
                print(f"      触发反爬机制（406），等待 {RETRY_DELAY[0]*(attempt+1)} 秒后重试...")
                if attempt < max_retries - 1:
                    wait_time = random.uniform(*RETRY_DELAY) * (attempt + 1)
                    time.sleep(wait_time)
                    # 重置会话并重新初始化
                    init_session()
                continue
            
            resp.raise_for_status()
            return resp
            
        except requests.exceptions.RequestException as e:
            print(f"      请求失败（尝试 {attempt + 1}/{max_retries}）: {e}")
            if attempt < max_retries - 1:
                wait_time = random.uniform(*RETRY_DELAY) * (attempt + 1)
                time.sleep(wait_time)
    
    return None


def fetch_list_page(page: int, filters: dict = None) -> list[dict]:
    """
    获取列表页数据。
    通过 POST 表单提交获取数据。
    """
    # 构建表单数据
    payload = {
        "caiGouDanWei": filters.get("caiGouDanWei", "") if filters else "",
        "currentPage": str(page),
        "gcName": filters.get("gcName", "") if filters else "",
        "startTime": filters.get("startTime", "") if filters else "",
        "endTime": filters.get("endTime", "") if filters else "",
        "ggName": filters.get("ggName", "") if filters else "",
        "zbFangShi": filters.get("zbFangShi", "1") if filters else "1",  # 默认公开招标
        "xmLeiXing": filters.get("xmLeiXing", "") if filters else "",  # 全部类型
    }
    
    resp = fetch_with_retry(LIST_URL, method="POST", data=payload)
    if not resp:
        return []
    
    # 检查是否返回了 HTML
    if "text/html" not in resp.headers.get("Content-Type", ""):
        print(f"  列表页返回非 HTML 内容：{resp.headers.get('Content-Type')}")
        return []
    
    soup = BeautifulSoup(resp.text, "lxml")
    
    # 查找表格数据行
    records = []
    tables = soup.find_all("table")
    for table in tables:
        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 4:
                continue
            
            try:
                # 第一列：序号
                index_cell = cells[0].get_text(" ", strip=True)
                if not index_cell or not index_cell.isdigit():
                    continue
                
                # 第二列：公告名称
                title_cell = cells[1]
                title = title_cell.get_text(" ", strip=True)
                if not title:
                    continue
                
                # 从行的 onclick 属性中提取 gcGuid 和 ggGuid
                # onclick: "urlChange('ggGuid','gcGuid')"
                onclick = row.get("onclick", "")
                if not onclick:
                    continue
                
                # 解析 urlChange('ggGuid','gcGuid')
                match = re.search(r"urlChange\(['\"]([a-f0-9-]+)['\"],['\"]([a-f0-9-]+)['\"]\)", onclick)
                if not match:
                    continue
                
                gg_guid = match.group(1)
                gc_guid = match.group(2)
                
                # 第三列：招采类型
                type_cell = cells[2].get_text(" ", strip=True)
                
                # 第四列：发布时间
                date_cell = cells[3].get_text(" ", strip=True)
                
                records.append({
                    "gcGuid": gc_guid,
                    "ggGuid": gg_guid,
                    "title": title,
                    "type": type_cell,
                    "publish_date": date_cell,
                    "detail_url": f"{DETAIL_URL}?gcGuid={gc_guid}&ggGuid={gg_guid}",
                })
            except Exception as e:
                print(f"  解析行失败：{e}")
                continue
    
    return records


def fetch_detail(gc_guid: str, gg_guid: str) -> dict:
    """获取详情页数据。"""
    params = {
        "gcGuid": gc_guid,
        "ggGuid": gg_guid,
    }
    
    resp = fetch_with_retry(DETAIL_URL, method="GET", params=params)
    if not resp:
        return {}
    
    soup = BeautifulSoup(resp.text, "lxml")
    
    # 提取结构化数据
    detail = {
        "gcGuid": gc_guid,
        "ggGuid": gg_guid,
        "title": "",
        "publish_date": "",
        "project_name": "",
        "project_code": "",
        "project_type": "",
        "procurement_method": "",
        "industry": "",
        "location": "",
        "tenderer": "",
        "agency": "",
        "file_start_time": "",
        "file_end_time": "",
        "bid_deadline": "",
        "bid_open_time": "",
        "service_days": "",
        "scope": "",
        "requirements": "",
        "contact_info": {},
        "detail_html": resp.text,
        "detail_text": "",
        "attachment_urls": [],
        "attachment_contents": [],  # PDF 解析内容
    }
    
    # 提取标题
    title_el = soup.find("h3", class_="dg-notice-title")
    if title_el:
        detail["title"] = title_el.get_text(" ", strip=True)
    
    # 提取发布时间
    publish_el = soup.find("span", class_="dg-notice-state-item")
    if publish_el:
        detail["publish_date"] = publish_el.get_text(" ", strip=True)
    
    # 提取项目基本信息 - 使用精确的 CSS 选择器
    # 查找所有 dg-flex 区块
    for flex_div in soup.find_all("div", class_="dg-flex"):
        # 提取 label 和 value
        spans = flex_div.find_all("span", class_="dg-flex-item")
        if len(spans) >= 2:
            label = spans[0].get_text(" ", strip=True)
            value = spans[1].get_text(" ", strip=True)
            
            if "项目名称：" in label:
                detail["project_name"] = value
            elif "项目编号：" in label:
                detail["project_code"] = value
            elif "项目类型：" in label:
                detail["project_type"] = value
            elif "采购方式：" in label:
                detail["procurement_method"] = value
            elif "招标人：" in label:
                detail["tenderer"] = value
            elif "代理机构：" in label:
                detail["agency"] = value
            elif "文件获取开始时间：" in label:
                detail["file_start_time"] = value
            elif "文件获取截止时间：" in label:
                detail["file_end_time"] = value
            elif "截标/开标时间：" in label:
                detail["bid_deadline"] = value
                detail["bid_open_time"] = value
            elif "服务期（天）：" in label:
                detail["service_days"] = value
            elif "招标范围：" in label:
                detail["scope"] = value[:500]
            elif "供应商基本要求：" in label:
                detail["requirements"] = value[:500]
    
    # 提取附件
    detail["attachment_urls"] = extract_attachment_urls(resp.text)
    
    # 提取纯文本内容
    detail["detail_text"] = parse_html_to_text(resp.text)
    
    return detail


def save_output(records: list[dict], folder_prefix: str = "output_sdicc") -> None:
    """保存输出到 JSON 和 CSV 文件。"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    folder = f"{folder_prefix}_{timestamp}"
    
    # 转换附件格式为字符串（CSV 兼容）
    for record in records:
        if "attachment_urls" in record and isinstance(record["attachment_urls"], list):
            record["attachment_urls_str"] = ";".join([
                f"{a.get('name', '')}:{a.get('url', '')}" 
                for a in record["attachment_urls"]
            ])
        # 添加 PDF 内容字段
        if "attachment_contents" in record and isinstance(record["attachment_contents"], list):
            record["attachment_contents_str"] = "\n\n---\n\n".join(record["attachment_contents"])
    
    json_file, csv_file = spider_utils.save_output_with_attachments(
        records,
        folder,
        attachments_field="attachment_urls",
        record_id_field="ggGuid",
        record_name_field="title",
        referer_field="detail_url",
    )
    print(f"已保存 {len(records)} 条数据 → {json_file} / {csv_file}")


def normalize_record(list_item: dict, detail: dict) -> dict:
    """合并列表和详情数据。"""
    return {
        "ggGuid": list_item.get("ggGuid"),
        "gcGuid": list_item.get("gcGuid"),
        "title": detail.get("title") or list_item.get("title"),
        "project_name": detail.get("project_name"),
        "project_code": detail.get("project_code"),
        "project_type": detail.get("project_type"),
        "procurement_method": detail.get("procurement_method"),
        "publish_date": detail.get("publish_date") or list_item.get("publish_date"),
        "file_start_time": detail.get("file_start_time"),
        "file_end_time": detail.get("file_end_time"),
        "bid_deadline": detail.get("bid_deadline"),
        "bid_open_time": detail.get("bid_open_time"),
        "service_days": detail.get("service_days"),
        "tenderer": detail.get("tenderer"),
        "agency": detail.get("agency"),
        "scope": detail.get("scope"),
        "requirements": detail.get("requirements"),
        "detail_url": list_item.get("detail_url"),
        "detail_html": detail.get("detail_html", ""),
        "detail_text": detail.get("detail_text", ""),
        "attachment_urls": detail.get("attachment_urls", []),
        "attachment_contents": detail.get("attachment_contents", []),
    }


def main():
    """主函数。"""
    global SESSION
    
    all_records = []
    seen_ids = set()
    
    # 可选：设置筛选条件
    filters = {
        # "caiGouDanWei": "",  # 采购单位
        # "gcName": "",  # 项目名称
        # "startTime": "",  # 开始日期 (YYYY-MM-DD)
        # "endTime": "",  # 结束日期 (YYYY-MM-DD)
        # "ggName": "",  # 公告名称
        # "zbFangShi": "1",  # 采购方式：1=公开招标
        # "xmLeiXing": "",  # 项目类型：空=全部，0=工程，1=物资，2=服务
    }
    
    print(f"开始抓取国投集团电子采购平台数据...")
    print(f"列表页：{LIST_URL}")
    print(f"最大页数：{MAX_PAGES}")
    print(f"筛选条件：{filters if filters else '无'}")
    print(f"反爬配置（方案 B：低频抓取）:")
    print(f"  - 请求间隔：{DELAY_RANGE[0]}-{DELAY_RANGE[1]} 秒")
    print(f"  - 页间延迟：{PAGE_DELAY_RANGE[0]}-{PAGE_DELAY_RANGE[1]} 秒 ⭐")
    print(f"  - 最大重试：{MAX_RETRIES} 次")
    print(f"PDF 解析：{'✓ 已启用' if PDF_AVAILABLE else '✗ 未安装 pypdf'}")
    print("-" * 60)
    
    # 初始化会话（访问首页获取 Cookie）
    print("\n初始化会话...")
    init_session()
    print("✓ 会话初始化完成\n")
    
    for page in range(1, MAX_PAGES + 1):
        print(f"\n抓取列表页 {page} ...")
        
        # 每页之前增加额外延迟（方案 B：低频抓取）
        if page > 1:
            wait_time = random.uniform(*PAGE_DELAY_RANGE)
            print(f"  等待 {wait_time:.1f} 秒（页间延迟，避免反爬）...")
            time.sleep(wait_time)
        
        items = fetch_list_page(page, filters)
        
        if not items:
            print("  列表页无数据，停止")
            break
        
        print(f"  找到 {len(items)} 条记录")
        
        new_items = [i for i in items if i.get("ggGuid") and i.get("ggGuid") not in seen_ids]
        if not new_items:
            print("  已无新数据，停止")
            break
        
        for i, item in enumerate(new_items, start=1):
            gg_guid = item.get("ggGuid")
            gc_guid = item.get("gcGuid")
            seen_ids.add(gg_guid)
            
            print(f"  [{len(all_records) + 1}] 抓取详情：{item['title'][:50]}...")
            
            try:
                detail = fetch_detail(gc_guid, gg_guid)
                
                if not detail:
                    print(f"      ✗ 详情页为空")
                    record = normalize_record(item, {})
                    all_records.append(record)
                    continue
                
                # 下载并解析附件
                if detail.get("attachment_urls"):
                    attachment_folder = Path(f"output_sdicc_{datetime.now().strftime('%Y%m%d_%H%M%S')}/attachments/{gg_guid}_{item['title'][:50]}")
                    
                    for idx, att in enumerate(detail["attachment_urls"]):
                        att_url = att.get("url", "")
                        att_name = att.get("name", f"附件{idx+1}")
                        
                        # 生成文件名
                        if att_url.lower().endswith(".pdf"):
                            file_name = f"{att_name}.pdf"
                        else:
                            file_name = att_name
                        
                        save_path = attachment_folder / file_name
                        
                        # 下载附件
                        downloaded_path = download_attachment(att_url, save_path, SESSION)
                        
                        if downloaded_path and downloaded_path.lower().endswith(".pdf"):
                            # 解析 PDF 内容
                            pdf_content = parse_pdf_content(downloaded_path)
                            if pdf_content:
                                detail["attachment_contents"].append(pdf_content)
                                print(f"      ✓ 附件下载并解析：{file_name} ({len(pdf_content)} 字符)")
                            else:
                                print(f"      ✓ 附件下载：{file_name} (PDF 解析失败)")
                        elif downloaded_path:
                            print(f"      ✓ 附件下载：{file_name}")
                
                record = normalize_record(item, detail)
                all_records.append(record)
                print(f"      ✓ 成功，附件：{len(detail.get('attachment_urls', []))} 个")
                
            except Exception as e:
                print(f"      ✗ 详情失败：{e}")
                # 仍然保存列表数据
                record = normalize_record(item, {})
                all_records.append(record)
            
            # 随机延迟（反爬优化）
            wait_time = random.uniform(*DELAY_RANGE)
            time.sleep(wait_time)
        
        # 如果当前页返回条目少于预期，可能已到末页
        if len(items) < PAGE_SIZE:
            print("  已到末页，停止")
            break
    
    print("\n" + "=" * 60)
    print(f"抓取完成！共 {len(all_records)} 条记录")
    
    # 统计 PDF 解析情况
    pdf_count = sum(1 for r in all_records if r.get("attachment_contents"))
    if pdf_count > 0:
        print(f"PDF 解析：{pdf_count} 条记录包含解析内容")
    
    if all_records:
        save_output(all_records)
    else:
        print("无数据可保存")


if __name__ == "__main__":
    main()
