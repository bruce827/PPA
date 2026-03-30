#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
中国能源建设集团招标网爬虫
目标网站：https://www.chnenergybidding.com.cn
爬取招标公告信息，输出为JSON和CSV格式
"""

import requests
from bs4 import BeautifulSoup
import json
import csv
import time
import re
from datetime import datetime
import logging
import spider_utils

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('spider_chnenergy.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

class ChnEnergySpider:
    def __init__(self):
        self.base_url = "https://www.chnenergybidding.com.cn"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })

    def fetch_list_page(self, page=1):
        """获取列表页内容"""
        if page == 1:
            url = f"{self.base_url}/bidweb/001/001002/moreinfo.html"
        else:
            url = f"{self.base_url}/bidweb/001/001002/{page}.html"

        try:
            logging.info(f"正在获取第{page}页列表: {url}")
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            response.encoding = 'utf-8'
            return response.text
        except Exception as e:
            logging.error(f"获取第{page}页失败: {e}")
            return None

    def parse_list_page(self, html_content):
        """解析列表页，提取招标公告信息"""
        if not html_content:
            return []

        soup = BeautifulSoup(html_content, 'html.parser')

        announcements = []

        # 直接查找所有招标公告链接
        bidding_links = soup.find_all('a', href=re.compile(r'/bidweb/.*\d{8}/[a-f0-9\-]+\.html'))

        logging.info(f"在整个页面中找到 {len(bidding_links)} 个招标公告链接")

        if not bidding_links:
            logging.warning("未找到任何招标公告链接")
            return []

        # 招标公告链接通常成对出现：编号链接 + 标题链接
        i = 0
        while i < len(bidding_links):
            try:
                link = bidding_links[i]
                href = link.get('href')
                text = link.get_text(strip=True)

                # 检查是否是招标编号（通常是CEZB开头）
                if text.startswith('CEZB') and len(text) > 10:
                    # 这是一个编号链接，下一条应该是标题链接
                    code = text
                    detail_url = self.base_url + href

                    # 获取标题（下一个链接）
                    if i + 1 < len(bidding_links):
                        next_link = bidding_links[i + 1]
                        next_href = next_link.get('href')
                        next_text = next_link.get_text(strip=True)

                        # 验证URL是否相同
                        if href == next_href and len(next_text) > len(code):
                            title = next_text
                            i += 2  # 跳过已处理的两个链接
                        else:
                            # URL不同，可能是单独的编号链接
                            title = code  # 将编号作为标题
                            i += 1
                    else:
                        title = code
                        i += 1

                    # 查找发布日期（在链接后查找）
                    publish_date = ""
                    # 从当前链接开始向后查找日期文本
                    current_element = link.parent
                    for _ in range(10):  # 查找最多10个兄弟元素
                        if current_element:
                            date_match = re.search(r'(\d{4}-\d{2}-\d{2})', current_element.get_text())
                            if date_match:
                                publish_date = date_match.group(1)
                                break
                        current_element = current_element.find_next_sibling()

                    announcements.append({
                        'code': code,
                        'title': title,
                        'detail_url': detail_url,
                        'publish_date': publish_date,
                        'source': '中国能源建设集团招标网'
                    })

                else:
                    i += 1  # 不是编号链接，跳过

            except Exception as e:
                logging.warning(f"解析链接失败: {e}")
                i += 1
                continue

        logging.info(f"从当前页面解析到{len(announcements)}条公告")
        return announcements

    def fetch_detail_page(self, url):
        """获取详情页内容"""
        try:
            logging.info(f"正在获取详情页: {url}")
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            response.encoding = 'utf-8'
            return response.text
        except Exception as e:
            logging.error(f"获取详情页失败 {url}: {e}")
            return None

    def parse_detail_page(self, html_content, basic_info):
        """解析详情页内容"""
        if not html_content:
            return basic_info

        soup = BeautifulSoup(html_content, 'html.parser')

        # 提取标题
        title_elem = soup.find('h1')
        if title_elem:
            basic_info['title'] = title_elem.get_text(strip=True)

        # 提取发布时间和阅读次数
        time_info = soup.find(string=re.compile(r'发布时间.*阅读次数'))
        if time_info:
            time_match = re.search(r'发布时间：(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})', time_info)
            if time_match:
                basic_info['publish_time'] = time_match.group(1)

            read_match = re.search(r'阅读次数：(\d+)', time_info)
            if read_match:
                basic_info['read_count'] = int(read_match.group(1))

        # 提取正文内容
        content_div = soup.find('div', class_=lambda x: x and ('content' in x.lower() or 'detail' in x.lower()))
        if not content_div:
            # 尝试查找body下的主要内容
            body = soup.find('body')
            if body:
                content_div = body

        if content_div:
            # 移除脚本和样式
            for script in content_div.find_all(['script', 'style']):
                script.decompose()

            # 提取所有文本内容
            content_text = content_div.get_text(separator='\n', strip=True)

            # 清理内容
            lines = [line.strip() for line in content_text.split('\n') if line.strip()]
            basic_info['content'] = '\n'.join(lines)

        return basic_info

    def normalize_record(self, record):
        """标准化记录格式"""
        return {
            '招标编号': record.get('code', ''),
            '标题': record.get('title', ''),
            '发布时间': record.get('publish_time', record.get('publish_date', '')),
            '阅读次数': record.get('read_count', 0),
            '招标人': self.extract_bidder(record.get('content', '')),
            '项目地点': self.extract_location(record.get('content', '')),
            '招标范围': self.extract_scope(record.get('content', '')),
            '投标截止时间': self.extract_deadline(record.get('content', '')),
            '详情链接': record.get('detail_url', ''),
            '来源': record.get('source', ''),
            '内容': record.get('content', '')
        }

    def extract_bidder(self, content):
        """从内容中提取招标人信息"""
        patterns = [
            r'招标人[：:]\s*([^。\n]+)',
            r'招标单位[：:]\s*([^。\n]+)',
            r'采购人[：:]\s*([^。\n]+)'
        ]

        for pattern in patterns:
            match = re.search(pattern, content)
            if match:
                return match.group(1).strip()
        return ''

    def extract_location(self, content):
        """从内容中提取项目地点"""
        patterns = [
            r'项目地点[：:]\s*([^。\n]+)',
            r'建设地点[：:]\s*([^。\n]+)',
            r'地点[：:]\s*([^。\n]+)'
        ]

        for pattern in patterns:
            match = re.search(pattern, content)
            if match:
                return match.group(1).strip()
        return ''

    def extract_scope(self, content):
        """从内容中提取招标范围"""
        patterns = [
            r'招标范围[：:](.*?)(?=投标人资格要求|3\.)',
            r'采购范围[：:](.*?)(?=投标人资格要求|3\.)'
        ]

        for pattern in patterns:
            match = re.search(pattern, content, re.DOTALL)
            if match:
                scope = match.group(1).strip()
                # 限制长度
                if len(scope) > 500:
                    scope = scope[:500] + '...'
                return scope
        return ''

    def extract_deadline(self, content):
        """从内容中提取投标截止时间"""
        patterns = [
            r'投标截止时间[：:]\s*([^。\n]+)',
            r'投标截止[：:]\s*([^。\n]+)',
            r'提交投标文件截止时间[：:]\s*([^。\n]+)'
        ]

        for pattern in patterns:
            match = re.search(pattern, content)
            if match:
                return match.group(1).strip()
        return ''

    def save_to_json(self, data, filename):
        """保存数据到JSON文件"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logging.info(f"数据已保存到 {filename}")

    def save_to_csv(self, data, filename):
        """保存数据到CSV文件"""
        if not data:
            logging.warning("没有数据可保存")
            return

        fieldnames = list(data[0].keys())

        with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)

        logging.info(f"数据已保存到 {filename}")

    def crawl(self, max_pages=5):
        """执行爬取任务"""
        all_records = []

        for page in range(1, max_pages + 1):
            logging.info(f"正在处理第{page}页...")

            # 获取列表页
            list_html = self.fetch_list_page(page)
            if not list_html:
                logging.error(f"跳过第{page}页")
                continue

            # 解析列表页
            announcements = self.parse_list_page(list_html)

            if not announcements:
                logging.warning(f"第{page}页未找到公告，可能是最后一页")
                break

            # 处理每个公告的详情页
            for announcement in announcements:
                try:
                    # 获取详情页
                    detail_html = self.fetch_detail_page(announcement['detail_url'])
                    if detail_html:
                        # 解析详情页
                        full_record = self.parse_detail_page(detail_html, announcement.copy())
                        # 标准化记录
                        normalized_record = self.normalize_record(full_record)
                        all_records.append(normalized_record)

                    # 添加延迟避免请求过快
                    time.sleep(1)

                except Exception as e:
                    logging.error(f"处理公告失败 {announcement.get('detail_url', '')}: {e}")
                    continue

            # 页面间延迟
            time.sleep(2)

        logging.info(f"共获取到{len(all_records)}条招标信息")

        # 保存结果（包含附件下载）
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        folder = f"chnenergy_bidding_{timestamp}"
        json_file, csv_file = spider_utils.save_output_with_attachments(
            all_records,
            folder,
            attachments_field="attachment_urls",
            record_id_field="招标编号",
            record_name_field="标题",
            referer_field="详情链接",
        )

        logging.info(f"结果已保存到 {folder} （{json_file} / {csv_file}）")

        return all_records


def main():
    """主函数"""
    print("中国能源建设集团招标网爬虫启动...")
    print("=" * 50)

    spider = ChnEnergySpider()

    # 设置要爬取的页数（可以根据需要调整）
    max_pages = 3  # 先爬取前3页作为测试

    try:
        records = spider.crawl(max_pages)
        print(f"\n爬取完成！共获取{len(records)}条招标信息")
        print("结果已保存为JSON和CSV文件")

    except KeyboardInterrupt:
        print("\n用户中断爬取")
    except Exception as e:
        print(f"爬取过程中出现错误: {e}")
        logging.error(f"主程序错误: {e}")


if __name__ == "__main__":
    main()