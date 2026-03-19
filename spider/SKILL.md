---
name: bidding-scraper
description: 招投标网站爬虫生成指南。给定目标网站 URL，用 MCP 工具自动分析页面结构，生成可直接运行的 Python 爬虫脚本，数据输出为本地 JSON/CSV 文件。
---

# 招投标爬虫生成指南

## 目标

用户给一个招投标网站 URL，AI 完成以下工作：
1. 用 MCP 工具分析网站结构
2. 输出一个**可直接运行**的 Python 爬虫脚本
3. 脚本运行后数据保存到本地 JSON 和 CSV 文件

不需要数据库，不需要 Webhook，不需要任何外部服务。

---

## Phase 1：分析网站

### MCP 工具速查

**chrome-devtools-mcp**

| 任务 | 工具 | 说明 |
|------|------|------|
| 打开页面 | `navigate_page` | 第一步必做 |
| 截图确认加载 | `take_screenshot` | 确认页面正常 |
| 检查网络请求 | `list_network_requests` | 优先找 API 接口 |
| 查看请求详情 | `get_network_request` | 拿接口参数和响应结构 |
| 执行 JS | `evaluate_script` | 提取选择器、确认数据位置 |
| 等待元素 | `wait_for` | JS 渲染页面使用 |
| 点击翻页 | `click` | JS 翻页使用 |
| 查看报错 | `list_console_messages` | 排查反爬问题 |

**firecrawl-mcp**

| 任务 | 工具 | 说明 |
|------|------|------|
| 抓取页面文本 | `firecrawl_scrape` | 获取详情页干净内容 |
| 结构化提取 | `firecrawl_scrape` + `jsonOptions` | 按字段直接提取，免写选择器 |
| 摸清 URL 规律 | `firecrawl_map` | 辅助构造翻页逻辑 |

---

### 分析步骤（按顺序执行，不要跳过）

#### 步骤 1：打开页面，判断有无 API 接口

```
navigate_page(url)
take_screenshot()
list_network_requests()  # 过滤 XHR/Fetch
```

**如果发现接口（如 `/api/list?page=1` 返回 JSON）：**
- 用 `get_network_request` 拿到完整请求头、参数、响应结构
- 记录：接口 URL、翻页参数名、响应里列表的 JSON 路径
- **直接跳到 Phase 2，生成接口爬虫，不需要后续步骤**

**如果没有接口，继续下一步：**

#### 步骤 2：判断渲染方式

```javascript
// evaluate_script 执行
document.querySelector('列表容器')?.children.length
```

- 有数据 → 静态 HTML，用 requests + BeautifulSoup 或纯 Scrapy
- 无数据/为 0 → JS 渲染，用 Scrapy + Playwright

#### 步骤 3：提取列表页选择器

```javascript
// evaluate_script 执行，确认每项数据的位置
const items = document.querySelectorAll('列表项')
console.log(items.length)  // 确认数量

const first = items[0]
first.querySelector('标题')?.textContent?.trim()
first.querySelector('链接')?.href
first.querySelector('日期')?.textContent?.trim()
first.querySelector('金额')?.textContent?.trim()
```

记录：列表项选择器、各字段选择器、是否需要进入详情页

#### 步骤 4：分析翻页机制

```javascript
// evaluate_script 执行
document.querySelector('.next, .pagination-next, [class*="next"]')?.href
document.querySelector('.next')?.getAttribute('onclick')
```

同时观察 `list_network_requests` 翻页时的变化：
- URL 参数变化（`?page=2`）→ 构造 URL 循环
- JS 点击翻页 → 用 `click` 模拟
- 无明显规律 → 用 `firecrawl_map` 摸清 URL 结构

#### 步骤 5：抓一个详情页样本

```
firecrawl_scrape(detail_url)  # 获取干净文本，确认字段位置
```

确认以下字段能否提取：项目名称、预算金额、发布日期、截止日期、地区、资质要求、联系方式

#### 步骤 6：确认反爬情况

查看 `list_network_requests` 的请求头，记录：
- 是否需要特定 Cookie
- 是否有 Token/Sign 签名参数
- 是否有频率限制（429 响应）

---

## Phase 2：生成爬虫脚本

分析完成后，根据网站类型选择对应模板生成**单文件脚本**。

### 交付标准

生成的脚本必须满足：
- **单文件**，直接 `python spider.py` 运行，无需额外配置
- 运行后在当前目录生成 `output.json` 和 `output.csv`
- 脚本顶部注释说明：目标网站、抓取字段、运行方式
- 所有选择器、接口地址、翻页参数都填入实际值，不留占位符

---

### 模板 A：接口爬虫（优先使用）

适用：发现了 JSON API 接口

```python
"""
目标网站：{网站名称} - {URL}
抓取字段：标题、预算、发布日期、截止日期、地区、资质要求、原文链接
运行方式：pip install requests && python spider.py
输出文件：output.json / output.csv
"""

import requests
import json
import csv
import time
import random
from datetime import datetime

# ── 配置 ──────────────────────────────────────────
API_URL    = "实际接口地址"
MAX_PAGES  = 50
DELAY      = (2, 4)   # 随机延迟范围（秒）

HEADERS = {
    "User-Agent":   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept":       "application/json",
    "Referer":      "网站首页URL",
    # 如有需要，在此补充 Cookie 或 Token
}
# ──────────────────────────────────────────────────


def fetch_page(page: int) -> list[dict]:
    """请求单页数据，返回标准化列表"""
    params = {"page": page}   # 根据实际接口调整参数名
    resp = requests.get(API_URL, params=params, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    # 根据实际响应结构调整 JSON 路径
    raw_list = data.get("data", {}).get("list", [])
    if not raw_list:
        return []

    result = []
    for item in raw_list:
        result.append({
            "title":         item.get("title", "").strip(),
            "budget":        parse_budget(item.get("budget", "")),
            "publish_date":  item.get("publishDate", "")[:10],
            "deadline":      item.get("deadline", "")[:10] or None,
            "region":        item.get("region", "").strip(),
            "category":      item.get("category", "").strip(),
            "qualification": item.get("qualification", "").strip(),
            "source_url":    item.get("url", ""),
            "platform":      "平台名称",
            "crawled_at":    datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        })
    return result


def parse_budget(text: str) -> float | None:
    """提取金额，统一为万元"""
    import re
    if not text:
        return None
    text = str(text).replace(",", "").replace("，", "")
    match = re.search(r"[\d.]+", text)
    if not match:
        return None
    value = float(match.group())
    if "亿" in text:
        value *= 10000
    elif "万" not in text and value > 10000:
        value /= 10000
    return round(value, 2)


def save_output(records: list[dict]) -> None:
    with open("output.json", "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    if records:
        with open("output.csv", "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=records[0].keys())
            writer.writeheader()
            writer.writerows(records)

    print(f"已保存 {len(records)} 条数据 → output.json / output.csv")


def main():
    all_records = []
    seen_urls   = set()

    for page in range(1, MAX_PAGES + 1):
        print(f"抓取第 {page} 页...")
        try:
            records = fetch_page(page)
        except Exception as e:
            print(f"第 {page} 页失败: {e}，跳过")
            continue

        if not records:
            print(f"第 {page} 页无数据，停止")
            break

        new = [r for r in records if r["source_url"] not in seen_urls]
        seen_urls.update(r["source_url"] for r in new)
        all_records.extend(new)
        print(f"  新增 {len(new)} 条，累计 {len(all_records)} 条")

        if len(new) == 0:
            print("无新数据，停止")
            break

        time.sleep(random.uniform(*DELAY))

    save_output(all_records)


if __name__ == "__main__":
    main()
```

---

### 模板 B：静态 HTML 爬虫

适用：无接口、数据在初始 HTML 里

```python
"""
目标网站：{网站名称} - {URL}
抓取字段：标题、预算、发布日期、截止日期、地区、资质要求、原文链接
运行方式：pip install requests beautifulsoup4 lxml && python spider.py
输出文件：output.json / output.csv
"""

import requests
from bs4 import BeautifulSoup
import json
import csv
import time
import random
import re
from datetime import datetime
from urllib.parse import urljoin

# ── 配置 ──────────────────────────────────────────
START_URL  = "列表页URL"
BASE_URL   = "https://网站域名"
MAX_PAGES  = 50
DELAY      = (2, 4)

HEADERS = {
    "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "zh-CN,zh;q=0.9",
}

# ── 选择器（根据 Phase 1 分析结果填入实际值）──────
SEL_LIST_ITEM   = "列表项选择器"
SEL_TITLE       = "标题选择器"
SEL_LINK        = "链接选择器"
SEL_DATE        = "日期选择器"
SEL_BUDGET      = "金额选择器"
SEL_NEXT_PAGE   = "下一页选择器"

# 详情页选择器
SEL_DETAIL_BODY        = "正文容器选择器"
SEL_DETAIL_DEADLINE    = "截止日期选择器"
SEL_DETAIL_REGION      = "地区选择器"
SEL_DETAIL_QUALIFY     = "资质要求选择器"
# ──────────────────────────────────────────────────


def get_soup(url: str) -> BeautifulSoup:
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    resp.encoding = resp.apparent_encoding
    return BeautifulSoup(resp.text, "lxml")


def parse_budget(text: str) -> float | None:
    if not text:
        return None
    text = text.replace(",", "").replace("，", "")
    match = re.search(r"[\d.]+", text)
    if not match:
        return None
    value = float(match.group())
    if "亿" in text:
        value *= 10000
    elif "万" not in text and value > 10000:
        value /= 10000
    return round(value, 2)


def parse_detail(url: str) -> dict:
    try:
        soup = get_soup(url)
        return {
            "raw_content": soup.select_one(SEL_DETAIL_BODY).get_text(" ", strip=True) if soup.select_one(SEL_DETAIL_BODY) else "",
            "deadline":    soup.select_one(SEL_DETAIL_DEADLINE).get_text(strip=True) if soup.select_one(SEL_DETAIL_DEADLINE) else None,
            "region":      soup.select_one(SEL_DETAIL_REGION).get_text(strip=True) if soup.select_one(SEL_DETAIL_REGION) else "",
            "qualification": soup.select_one(SEL_DETAIL_QUALIFY).get_text(strip=True) if soup.select_one(SEL_DETAIL_QUALIFY) else "",
        }
    except Exception as e:
        print(f"  详情页失败 {url}: {e}")
        return {"raw_content": "", "deadline": None, "region": "", "qualification": ""}


def parse_list_page(soup: BeautifulSoup, base_url: str) -> list[dict]:
    records = []
    for item in soup.select(SEL_LIST_ITEM):
        title  = item.select_one(SEL_TITLE)
        link   = item.select_one(SEL_LINK)
        date   = item.select_one(SEL_DATE)
        budget = item.select_one(SEL_BUDGET)

        url = urljoin(base_url, link["href"]) if link and link.get("href") else ""
        if not url:
            continue

        record = {
            "title":        title.get_text(strip=True) if title else "",
            "budget":       parse_budget(budget.get_text(strip=True) if budget else ""),
            "publish_date": date.get_text(strip=True) if date else "",
            "source_url":   url,
            "platform":     "平台名称",
            "crawled_at":   datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        records.append(record)
    return records


def save_output(records: list[dict]) -> None:
    with open("output.json", "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    if records:
        with open("output.csv", "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=records[0].keys())
            writer.writeheader()
            writer.writerows(records)
    print(f"已保存 {len(records)} 条 → output.json / output.csv")


def main():
    all_records = []
    seen_urls   = set()
    url         = START_URL

    while url and len(all_records) < MAX_PAGES * 20:
        print(f"抓取: {url}")
        try:
            soup = get_soup(url)
        except Exception as e:
            print(f"失败: {e}")
            break

        records = parse_list_page(soup, BASE_URL)
        new = [r for r in records if r["source_url"] not in seen_urls]
        seen_urls.update(r["source_url"] for r in new)

        # 抓取详情页
        for i, r in enumerate(new):
            print(f"  详情页 {i+1}/{len(new)}: {r['source_url']}")
            detail = parse_detail(r["source_url"])
            r.update(detail)
            time.sleep(random.uniform(1, 2))

        all_records.extend(new)
        print(f"累计 {len(all_records)} 条")

        # 翻页
        next_tag = soup.select_one(SEL_NEXT_PAGE)
        next_url = urljoin(BASE_URL, next_tag["href"]) if next_tag and next_tag.get("href") else None
        if not next_url or next_url == url:
            break
        url = next_url
        time.sleep(random.uniform(*DELAY))

    save_output(all_records)


if __name__ == "__main__":
    main()
```

---

### 模板 C：JS 动态页面（Playwright）

适用：无接口、JS 渲染页面

```python
"""
目标网站：{网站名称} - {URL}
抓取字段：标题、预算、发布日期、截止日期、地区、资质要求、原文链接
运行方式：pip install playwright beautifulsoup4 lxml && playwright install chromium && python spider.py
输出文件：output.json / output.csv
"""

from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import json
import csv
import time
import random
import re
from datetime import datetime
from urllib.parse import urljoin

# ── 配置 ──────────────────────────────────────────
START_URL = "列表页URL"
BASE_URL  = "https://网站域名"
MAX_PAGES = 50
DELAY     = (2, 4)

# ── 选择器（根据 Phase 1 分析结果填入实际值）──────
SEL_LIST_ITEM  = "列表项选择器"
SEL_TITLE      = "标题选择器"
SEL_LINK       = "链接选择器"
SEL_DATE       = "日期选择器"
SEL_BUDGET     = "金额选择器"
SEL_NEXT_PAGE  = "下一页按钮选择器"
SEL_WAIT_FOR   = "列表容器选择器"   # 等待此元素出现再解析
SEL_DETAIL_BODY    = "正文容器选择器"
SEL_DETAIL_QUALIFY = "资质要求选择器"
# ──────────────────────────────────────────────────


def parse_budget(text: str) -> float | None:
    if not text:
        return None
    text = text.replace(",", "").replace("，", "")
    match = re.search(r"[\d.]+", text)
    if not match:
        return None
    value = float(match.group())
    if "亿" in text:
        value *= 10000
    elif "万" not in text and value > 10000:
        value /= 10000
    return round(value, 2)


def save_output(records: list[dict]) -> None:
    with open("output.json", "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    if records:
        with open("output.csv", "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=records[0].keys())
            writer.writeheader()
            writer.writerows(records)
    print(f"已保存 {len(records)} 条 → output.json / output.csv")


def main():
    all_records = []
    seen_urls   = set()

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page    = browser.new_page()
        page.set_extra_http_headers({"Accept-Language": "zh-CN,zh;q=0.9"})

        page.goto(START_URL)
        page.wait_for_selector(SEL_WAIT_FOR)

        for page_num in range(1, MAX_PAGES + 1):
            print(f"第 {page_num} 页...")
            soup  = BeautifulSoup(page.content(), "lxml")
            items = soup.select(SEL_LIST_ITEM)

            if not items:
                print("无列表项，停止")
                break

            new_urls = []
            for item in items:
                link  = item.select_one(SEL_LINK)
                title = item.select_one(SEL_TITLE)
                date  = item.select_one(SEL_DATE)
                budget = item.select_one(SEL_BUDGET)
                url   = urljoin(BASE_URL, link["href"]) if link and link.get("href") else ""
                if not url or url in seen_urls:
                    continue
                seen_urls.add(url)
                new_urls.append({
                    "title":        title.get_text(strip=True) if title else "",
                    "budget":       parse_budget(budget.get_text(strip=True) if budget else ""),
                    "publish_date": date.get_text(strip=True) if date else "",
                    "source_url":   url,
                    "platform":     "平台名称",
                    "crawled_at":   datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                })

            # 抓详情页
            for i, r in enumerate(new_urls):
                print(f"  详情 {i+1}/{len(new_urls)}")
                try:
                    page.goto(r["source_url"])
                    page.wait_for_selector(SEL_DETAIL_BODY, timeout=10000)
                    detail_soup = BeautifulSoup(page.content(), "lxml")
                    r["raw_content"]   = detail_soup.select_one(SEL_DETAIL_BODY).get_text(" ", strip=True) if detail_soup.select_one(SEL_DETAIL_BODY) else ""
                    r["qualification"] = detail_soup.select_one(SEL_DETAIL_QUALIFY).get_text(strip=True) if detail_soup.select_one(SEL_DETAIL_QUALIFY) else ""
                except Exception as e:
                    print(f"    详情失败: {e}")
                    r["raw_content"] = ""
                    r["qualification"] = ""
                time.sleep(random.uniform(1, 2))

            all_records.extend(new_urls)
            print(f"累计 {len(all_records)} 条")

            # 翻页
            next_btn = page.query_selector(SEL_NEXT_PAGE)
            if not next_btn:
                print("无下一页，停止")
                break
            page.go_back()
            page.wait_for_selector(SEL_WAIT_FOR)
            next_btn = page.query_selector(SEL_NEXT_PAGE)
            if not next_btn:
                break
            next_btn.click()
            page.wait_for_selector(SEL_WAIT_FOR)
            time.sleep(random.uniform(*DELAY))

        browser.close()

    save_output(all_records)


if __name__ == "__main__":
    main()
```

---

## Phase 3：交付检查

生成脚本后逐项确认，不满足的重新修改：

- [ ] 脚本顶部注释写明目标网站、运行命令、输出文件
- [ ] 所有选择器/接口地址已替换为实际值，无占位符
- [ ] `pip install` 命令列出了所有依赖
- [ ] 直接 `python spider.py` 能运行，无需额外配置
- [ ] 运行完成后生成 `output.json` 和 `output.csv`
- [ ] 有随机延迟，并发友好
- [ ] 有基础错误处理，单页失败不中断整体

---

## VSCode + GitHub Copilot 配置

项目根目录创建 `.vscode/mcp.json`：

```json
{
  "servers": {
    "chrome-devtools": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp"]
    },
    "firecrawl": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "你的API_KEY"
      }
    }
  }
}
```

保存后点击顶部 **Start** 启动，Copilot Chat 切换到 **Agent 模式**使用。

**给 Copilot 的标准指令**：
> 读取 SKILL.md，然后用 MCP 工具分析这个网站：`目标URL`，按照 Phase 1 完成分析后，根据分析结果选择合适的模板，生成一个可直接运行的爬虫脚本。