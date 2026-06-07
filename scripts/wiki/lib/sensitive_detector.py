"""
脱敏后残留敏感词检测
扫描脱敏后的 Markdown 文件，检查是否仍有敏感信息残留
"""
import re


class SensitiveDetector:
    """检测脱敏后文档中可能残留的敏感信息"""

    # 组织名称关键词（必须被替换的）
    ORG_PATTERNS = [
        '青海油田', '国家电网', '国家电投', '中国石油', '中国石化', '中国海油',
        '中石油', '中石化', '中海油', '长庆油田', '胜利油田', '大庆油田',
        '延长石油', '塔里木油田', '西南油气田', '新疆油田', '辽河油田',
        '华北油田', '大港油田', '江汉油田', '河南油田', '江苏油田',
        '冀东油田', '玉门油田', '吐哈油田', '青海油田公司',
    ]

    # 省市级地名（必须被替换的）
    LOCATION_PATTERNS = [
        '陕西省', '甘肃省', '青海省', '新疆维吾尔', '内蒙古',
        '山东省', '河北省', '辽宁省', '吉林省', '黑龙江省',
        '北京市', '天津市', '上海市', '重庆市',
        '西安市', '兰州市', '乌鲁木齐市',
        '榆林市', '延安市', '咸阳市', '渭南市',
        '大庆市', '东营市', '盘锦市', '克拉玛依市',
        '庆阳市', '银川市', '呼和浩特市',
        # 不带"市/省"的也需要检查（但可能误报，所以放在后面）
        '榆林', '庆阳', '克拉玛依',
    ]

    # 金额模式（具体的金额数字）
    AMOUNT_PATTERNS = [
        # "XX万元" 格式
        r'\d+\.?\d*\s*万元',
        # "XX万" 格式（前面不是"数"、"多"等词）
        r'(?<![数多几近约])\d+\.?\d*\s*万(?![元])',
        # "¥XX" 或 "￥XX"
        r'[¥￥]\s*\d[\d,.]+',
        # "XX元/人/天" 格式的单价
        r'\d{3,}\s*元/人/天',
    ]

    # 联系方式模式
    CONTACT_PATTERNS = [
        # 手机号
        r'1[3-9]\d{9}',
        # 座机号
        r'0\d{2,3}[-\s]?\d{7,8}',
        # 邮箱
        r'[\w.]+@[\w]+\.[\w]+',
    ]

    def __init__(self, extra_orgs=None, extra_locations=None):
        """
        Args:
            extra_orgs: 额外的组织名称关键词列表
            extra_locations: 额外的地名关键词列表
        """
        self.org_patterns = list(self.ORG_PATTERNS)
        if extra_orgs:
            self.org_patterns.extend(extra_orgs)

        self.location_patterns = list(self.LOCATION_PATTERNS)
        if extra_locations:
            self.location_patterns.extend(extra_locations)

    def detect(self, content, filename=''):
        """
        检测文本中的敏感信息

        Args:
            content: Markdown 文本内容
            filename: 文件名（用于报告）

        Returns:
            dict: {
                'has_sensitive': bool,
                'filename': str,
                'findings': list[{
                    'type': 'org'|'location'|'amount'|'contact',
                    'pattern': 匹配的模式,
                    'context': 匹配的上下文（前后 20 字符）,
                    'line': 行号
                }],
                'summary': {
                    'org': int,
                    'location': int,
                    'amount': int,
                    'contact': int
                }
            }
        """
        findings = []
        lines = content.split('\n')

        for line_num, line in enumerate(lines, 1):
            # 跳过 Frontmatter
            if line_num <= 10 and line.strip() == '---':
                continue

            # 检查组织名
            for org in self.org_patterns:
                if org in line:
                    idx = line.index(org)
                    context = line[max(0, idx - 20):idx + len(org) + 20]
                    findings.append({
                        'type': 'org',
                        'pattern': org,
                        'context': context.strip(),
                        'line': line_num,
                    })

            # 检查地名
            for loc in self.location_patterns:
                if loc in line:
                    idx = line.index(loc)
                    context = line[max(0, idx - 20):idx + len(loc) + 20]
                    findings.append({
                        'type': 'location',
                        'pattern': loc,
                        'context': context.strip(),
                        'line': line_num,
                    })

            # 检查金额
            for pattern in self.AMOUNT_PATTERNS:
                match = re.search(pattern, line)
                if match:
                    context = line[max(0, match.start() - 20):match.end() + 20]
                    findings.append({
                        'type': 'amount',
                        'pattern': match.group(),
                        'context': context.strip(),
                        'line': line_num,
                    })

            # 检查联系方式
            for pattern in self.CONTACT_PATTERNS:
                match = re.search(pattern, line)
                if match:
                    context = line[max(0, match.start() - 20):match.end() + 20]
                    findings.append({
                        'type': 'contact',
                        'pattern': match.group(),
                        'context': context.strip(),
                        'line': line_num,
                    })

        # 汇总
        summary = {'org': 0, 'location': 0, 'amount': 0, 'contact': 0}
        for f in findings:
            summary[f['type']] += 1

        return {
            'has_sensitive': len(findings) > 0,
            'filename': filename,
            'findings': findings,
            'summary': summary,
        }

    def detect_file(self, md_path):
        """
        检测单个 Markdown 文件

        Args:
            md_path: 文件路径

        Returns:
            dict: detect() 的返回值
        """
        try:
            with open(md_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            return {
                'has_sensitive': True,
                'filename': os.path.basename(md_path),
                'findings': [{'type': 'error', 'pattern': str(e), 'context': '', 'line': 0}],
                'summary': {'org': 0, 'location': 0, 'amount': 0, 'contact': 0},
            }

        return self.detect(content, os.path.basename(md_path))
