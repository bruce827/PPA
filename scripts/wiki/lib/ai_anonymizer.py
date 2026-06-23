"""
DeepSeek API 智能脱敏核心逻辑
将 Markdown 文档中的敏感信息（客户名、地名、金额等）替换为泛化表述
"""
import os
import re
import json
import time
import requests


class AIAnonymizer:
    """基于 AI 的文档脱敏器"""

    def __init__(self, config):
        """
        Args:
            config: config.yaml 中的 anonymize 配置段
        """
        self.api_base = config.get('api_base', 'https://api.deepseek.com')
        self.api_key = config.get('api_key', '')
        self.model = config.get('model', 'deepseek-chat')
        self.max_tokens = config.get('max_tokens', 4096)
        self.temperature = config.get('temperature', 0.1)
        self.batch_size = config.get('batch_size', 1)
        self.retry_count = config.get('retry_count', 3)
        self.retry_delay = config.get('retry_delay', 2)
        self.timeout = config.get('timeout', 60)

        # 加载 System Prompt
        self.system_prompt = self._load_system_prompt()

    def _load_system_prompt(self):
        """加载脱敏 System Prompt"""
        prompt_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'prompts', 'anonymize_system.txt'
        )
        if os.path.exists(prompt_path):
            with open(prompt_path, 'r', encoding='utf-8') as f:
                return f.read()
        return self._default_system_prompt()

    @staticmethod
    def _default_system_prompt():
        """默认脱敏 System Prompt"""
        return """你是一个专业的文档脱敏助手。请对以下 Markdown 文档进行脱敏处理：

【必须替换】
1. 所有企业/单位名称 → 使用泛化称呼（如"某大型油田企业""某电力集团""某能源企业"）
2. 省市地名 → "某省""某市"（保留"油田""气田""储罐""管道"等通用行业词）
3. 具体人名 → "某负责人""某工程师""某项目经理"
4. 具体金额数字 → 保留数量级但模糊化（如 150 万 → "百万元级"，12,345 → "万余元"）
5. 合同编号/项目编号 → "某合同编号""某项目编号"
6. 电话号码/邮箱/具体地址 → 全部删除或替换为占位符
7. 具体日期 → 保留年份或模糊为"某年某月"

【必须保留】
- 所有技术术语（SCADA、BIM、IoT、Three.js、Cesium、GIS、MQTT 等）
- 功能模块名称和技术架构描述
- 通用行业术语（油田、气田、储罐、管道、变送器、仪表等）
- 表格结构和 Markdown 格式

【输出要求】
- 保持 Markdown 格式完全不变（标题层级、表格、列表等）
- 保持表格结构不变
- 只输出脱敏后的文档内容，不要加任何解释或前缀说明
- 如果原文档中没有需要脱敏的内容，原样输出"""

    def _split_by_sections(self, content):
        """
        按二级标题拆分文档为章节列表

        Args:
            content: Markdown 内容

        Returns:
            list[dict]: [{'heading': '## xxx', 'content': '...'}]
        """
        sections = []
        current_heading = ''
        current_lines = []

        for line in content.split('\n'):
            if line.startswith('## ') and current_lines:
                sections.append({
                    'heading': current_heading,
                    'content': '\n'.join(current_lines),
                })
                current_heading = line
                current_lines = []
            else:
                current_lines.append(line)

        # 最后一个章节
        if current_lines:
            sections.append({
                'heading': current_heading,
                'content': '\n'.join(current_lines),
            })

        # 如果没有二级标题，将整个文档作为一个章节
        if not sections:
            sections.append({
                'heading': '',
                'content': content,
            })

        return sections

    def _call_api(self, user_content):
        """
        调用 DeepSeek API 进行脱敏

        Args:
            user_content: 待脱敏的文本内容

        Returns:
            dict: {
                'success': bool,
                'content': 脱敏后内容,
                'error': 错误信息,
                'usage': token 用量
            }
        """
        url = f"{self.api_base.rstrip('/')}/v1/chat/completions"

        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.api_key}',
        }

        payload = {
            'model': self.model,
            'messages': [
                {'role': 'system', 'content': self.system_prompt},
                {'role': 'user', 'content': user_content},
            ],
            'max_tokens': self.max_tokens,
            'temperature': self.temperature,
        }

        for attempt in range(self.retry_count):
            try:
                response = requests.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=self.timeout
                )

                if response.status_code == 200:
                    data = response.json()
                    content = data['choices'][0]['message']['content']
                    usage = data.get('usage', {})
                    return {
                        'success': True,
                        'content': content,
                        'error': None,
                        'usage': usage,
                    }
                elif response.status_code == 429:
                    # 速率限制，等待后重试
                    wait = self.retry_delay * (attempt + 1)
                    print(f"    ⚠ 速率限制，等待 {wait}s 后重试...")
                    time.sleep(wait)
                    continue
                else:
                    error_msg = f"API 错误 {response.status_code}: {response.text[:200]}"
                    if attempt < self.retry_count - 1:
                        print(f"    ⚠ {error_msg}，重试 {attempt + 2}/{self.retry_count}")
                        time.sleep(self.retry_delay)
                        continue
                    return {
                        'success': False,
                        'content': None,
                        'error': error_msg,
                        'usage': {},
                    }

            except requests.Timeout:
                if attempt < self.retry_count - 1:
                    print(f"    ⚠ 请求超时，重试 {attempt + 2}/{self.retry_count}")
                    time.sleep(self.retry_delay)
                    continue
                return {
                    'success': False,
                    'content': None,
                    'error': f'API 请求超时（{self.timeout}秒）',
                    'usage': {},
                }
            except Exception as e:
                return {
                    'success': False,
                    'content': None,
                    'error': str(e),
                    'usage': {},
                }

        return {
            'success': False,
            'content': None,
            'error': '达到最大重试次数',
            'usage': {},
        }

    def anonymize(self, content):
        """
        对完整 Markdown 内容进行脱敏

        大文档按二级标题拆分，逐段调用 API

        Args:
            content: 原始 Markdown 内容

        Returns:
            dict: {
                'success': bool,
                'content': 脱敏后内容,
                'error': 错误信息（如果失败）,
                'api_calls': API 调用次数,
                'total_tokens': 总 token 用量
            }
        """
        sections = self._split_by_sections(content)

        if len(sections) <= 1:
            # 短文档，直接处理
            result = self._call_api(content)
            return {
                'success': result['success'],
                'content': result['content'] if result['success'] else content,
                'error': result['error'],
                'api_calls': 1,
                'total_tokens': result['usage'].get('total_tokens', 0),
            }

        # 长文档，逐段处理
        anonymized_parts = []
        total_api_calls = 0
        total_tokens = 0
        errors = []

        for i, section in enumerate(sections):
            # 跳过空章节
            if not section['content'].strip():
                anonymized_parts.append(section['content'])
                continue

            # 组合章节内容发送
            section_text = section['heading'] + '\n' + section['content'] if section['heading'] else section['content']

            print(f"    段落 {i + 1}/{len(sections)} ... ", end='', flush=True)

            result = self._call_api(section_text)
            total_api_calls += 1
            total_tokens += result['usage'].get('total_tokens', 0)

            if result['success']:
                # 去掉 AI 可能添加的多余标题（因为 heading 已经在 section_text 中）
                ai_content = result['content']
                anonymized_parts.append(ai_content)
                print("✓")
            else:
                # 失败时保留原文
                anonymized_parts.append(section_text)
                errors.append(f"段落 {i + 1}: {result['error']}")
                print(f"✗ (保留原文: {result['error']})")

        return {
            'success': len(errors) == 0,
            'content': '\n\n'.join(anonymized_parts),
            'error': '; '.join(errors) if errors else None,
            'api_calls': total_api_calls,
            'total_tokens': total_tokens,
        }

    def anonymize_file(self, md_path):
        """
        脱敏单个 Markdown 文件

        Args:
            md_path: Markdown 文件路径

        Returns:
            dict: anonymize() 的返回值 + {'file_path': md_path}
        """
        try:
            with open(md_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            return {
                'success': False,
                'content': None,
                'error': f'读取文件失败: {e}',
                'api_calls': 0,
                'total_tokens': 0,
                'file_path': md_path,
            }

        result = self.anonymize(content)
        result['file_path'] = md_path
        return result

    def anonymize_batch(self, md_files, output_dir):
        """
        批量脱敏 Markdown 文件

        Args:
            md_files: 文件路径列表
            output_dir: 输出目录

        Returns:
            dict: {
                'total': 总文件数,
                'success': 成功数,
                'failed': 失败数（含部分失败）,
                'api_calls': 总 API 调用次数,
                'total_tokens': 总 token 用量,
                'duration': 总耗时（秒）,
                'results': 详细结果列表
            }
        """
        os.makedirs(output_dir, exist_ok=True)
        start_time = time.time()

        results = []
        success_count = 0
        failed_count = 0
        total_api_calls = 0
        total_tokens = 0

        for i, md_path in enumerate(md_files):
            print(f"\n[{i + 1}/{len(md_files)}] 脱敏: {os.path.basename(md_path)}")

            result = self.anonymize_file(md_path)

            if result['success']:
                # 写入脱敏后文件
                rel_path = os.path.basename(md_path)
                out_path = os.path.join(output_dir, rel_path)
                with open(out_path, 'w', encoding='utf-8') as f:
                    f.write(result['content'])
                success_count += 1
            else:
                # 部分失败：可能部分内容已脱敏
                if result['content']:
                    rel_path = os.path.basename(md_path)
                    out_path = os.path.join(output_dir, rel_path)
                    with open(out_path, 'w', encoding='utf-8') as f:
                        f.write(result['content'])
                failed_count += 1

            total_api_calls += result['api_calls']
            total_tokens += result['total_tokens']
            results.append(result)

        duration = time.time() - start_time

        return {
            'total': len(md_files),
            'success': success_count,
            'failed': failed_count,
            'api_calls': total_api_calls,
            'total_tokens': total_tokens,
            'duration': round(duration, 2),
            'results': results,
        }
