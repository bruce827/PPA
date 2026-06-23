"""
Frontmatter 生成器
为 Markdown 文件注入 YAML Frontmatter 和 VitePress 提示框
"""
import os
import re
from datetime import datetime


class FrontmatterBuilder:
    """YAML Frontmatter 构建与注入"""

    def __init__(self, config):
        """
        Args:
            config: config.yaml 中的 frontmatter 配置段
        """
        self.download_base_url = config.get('download_base_url', '')
        self.default_tags = config.get('default_tags', [])
        self.file_type_keywords = config.get('file_type_keywords', {})

    def detect_file_type(self, filename):
        """
        根据文件名关键词自动检测文档类型

        Args:
            filename: 文件名（不含扩展名）

        Returns:
            str: 文档类型（如"需求文档"、"设计文档"等），未匹配返回"其他文档"
        """
        for file_type, keywords in self.file_type_keywords.items():
            for keyword in keywords:
                if keyword in filename:
                    return file_type
        return '其他文档'

    def build_frontmatter(self, project_folder, filename, file_type=None, tags=None):
        """
        构建 YAML Frontmatter 字符串

        Args:
            project_folder: 项目文件夹名
            filename: 文件名（不含扩展名）
            file_type: 文档类型（None 则自动检测）
            tags: 标签列表（None 则使用默认标签）

        Returns:
            str: YAML Frontmatter 字符串
        """
        if file_type is None:
            file_type = self.detect_file_type(filename)
        if tags is None:
            tags = list(self.default_tags)

        # 添加文档类型标签
        if file_type not in tags:
            tags.append(file_type)

        # 构建下载链接
        download_link = f"{self.download_base_url}/{project_folder}/"

        # 构建 YAML
        lines = [
            '---',
            f'title: "{filename}"',
            f'project_name: "{project_folder}"',
            f'file_type: "{file_type}"',
            f'download_link: "{download_link}"',
            'tags:',
        ]
        for tag in tags:
            lines.append(f'  - "{tag}"')
        lines.append(f'date: "{datetime.now().strftime("%Y-%m-%d")}"')
        lines.append('---')

        return '\n'.join(lines)

    def build_download_hint(self, download_link):
        """
        构建 VitePress 提示框（下载引导）

        Args:
            download_link: 下载链接

        Returns:
            str: VitePress 提示框 Markdown
        """
        return f"""
::: info 物理文件下载提示
本节内容对应的完整原始打包工程文件，您可以 **[👉 点击此处安全下载原件]({download_link})** 进行二次修改与参考。
:::
"""

    def inject(self, md_content, project_folder, filename, file_type=None, tags=None):
        """
        在 Markdown 内容头部注入 Frontmatter 和下载提示

        Args:
            md_content: 原始 Markdown 内容
            project_folder: 项目文件夹名
            filename: 文件名（不含扩展名）
            file_type: 文档类型
            tags: 标签列表

        Returns:
            str: 注入后的 Markdown 内容
        """
        # 检查是否已有 Frontmatter
        if md_content.startswith('---'):
            # 已有 Frontmatter，跳过
            return md_content

        frontmatter = self.build_frontmatter(
            project_folder, filename, file_type, tags
        )

        # 获取下载链接
        download_link = f"{self.download_base_url}/{project_folder}/"
        hint = self.build_download_hint(download_link)

        return f"{frontmatter}\n{hint}\n{md_content}"

    def process_file(self, md_path, project_folder):
        """
        处理单个 Markdown 文件：注入 Frontmatter

        Args:
            md_path: Markdown 文件路径
            project_folder: 项目文件夹名

        Returns:
            bool: 是否成功注入
        """
        try:
            with open(md_path, 'r', encoding='utf-8') as f:
                content = f.read()

            filename = os.path.splitext(os.path.basename(md_path))[0]
            new_content = self.inject(content, project_folder, filename)

            with open(md_path, 'w', encoding='utf-8') as f:
                f.write(new_content)

            return True
        except Exception as e:
            print(f"  注入失败 {md_path}: {e}")
            return False
