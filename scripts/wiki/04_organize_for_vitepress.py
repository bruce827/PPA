#!/usr/bin/env python3
"""
04_organize_for_vitepress.py
将处理好的 Markdown 文件整理为 VitePress 项目目录结构

使用方法：
    python 04_organize_for_vitepress.py

输入：output/02_anonymized/{projectName}/*.md（已注入 Frontmatter）
输出：output/03_vitepress/ — 可直接用于 VitePress 项目
"""
import os
import sys
import json
import re
import shutil
import yaml
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))

from file_utils import ensure_dir


def load_config():
    config_path = os.path.join(os.path.dirname(__file__), 'config.yaml')
    with open(config_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


# 文档生命周期排序优先级
DOC_LIFE_ORDER = {
    '需求文档': 1,
    '设计文档': 2,
    '实施文档': 3,
    '测试文档': 4,
    '用户手册': 5,
    '项目管理': 6,
    '其他文档': 99,
}


def get_doc_sort_key(filename):
    """
    获取文档排序键：先按文件类型优先级，再按文件名

    Returns:
        tuple: (priority, filename)
    """
    # 从 Frontmatter 中提取 file_type（简化版：从文件名推断）
    priority = 99
    for doc_type, order in DOC_LIFE_ORDER.items():
        if doc_type in filename:
            priority = order
            break

    # 尝试从文件名中提取数字前缀
    num_match = re.match(r'^(\d+)[_.]', filename)
    if num_match:
        return (priority, int(num_match.group(1)), filename)

    return (priority, 999, filename)


def generate_sidebar(projects_data):
    """
    生成 VitePress 侧边栏配置

    Args:
        projects_data: {project_name: [file_list]}

    Returns:
        list: VitePress sidebar 配置
    """
    sidebar = []

    for proj_name, files in sorted(projects_data.items()):
        children = []
        for f in files:
            stem = os.path.splitext(f)[0]
            # VitePress 路径格式
            path = f"/wiki/{proj_name}/{stem}"
            children.append({
                'text': stem,
                'link': path,
            })

        sidebar.append({
            'text': proj_name,
            'collapsed': False,
            'items': children,
        })

    return sidebar


def generate_project_index(proj_name, files):
    """
    生成项目概览页

    Args:
        proj_name: 项目名称
        files: 文件名列表

    Returns:
        str: Markdown 内容
    """
    lines = [
        f'# {proj_name}',
        '',
        '## 文档列表',
        '',
    ]

    for f in sorted(files, key=get_doc_sort_key):
        stem = os.path.splitext(f)[0]
        lines.append(f'- [{stem}](./{stem})')

    lines.extend([
        '',
        '---',
        '',
        f'> 本页由 Wiki 数据准备脚本自动生成',
        f'> 生成时间: {datetime.now().strftime("%Y-%m-%d %H:%M")}',
    ])

    return '\n'.join(lines)


def generate_home_index(projects_data, site_config):
    """
    生成全局首页

    Args:
        projects_data: {project_name: [file_list]}
        site_config: VitePress 配置

    Returns:
        str: 首页 Markdown 内容
    """
    title = site_config.get('title', '项目知识库')
    description = site_config.get('description', '')

    lines = [
        '---',
        'layout: home',
        '',
        'hero:',
        f'  name: "{title}"',
        f'  text: "{description}"',
        '  tagline: 真实项目交付物与全套设计模板',
        '  actions:',
        '    - theme: brand',
        '      text: 浏览知识库',
        '      link: /wiki/',
        '',
        'features:',
    ]

    # 每个项目作为一个 feature card
    for proj_name, files in sorted(projects_data.items()):
        first_file = sorted(files, key=get_doc_sort_key)[0] if files else ''
        stem = os.path.splitext(first_file)[0] if first_file else ''
        link = f'/wiki/{proj_name}/{stem}' if stem else '#'

        lines.extend([
            '  - title: ' + proj_name,
            f'    details: 包含 {len(files)} 个文档',
            f'    link: {link}',
        ])

    lines.extend([
        '---',
        '',
        f'> 共收录 {len(projects_data)} 个项目，{sum(len(f) for f in projects_data.values())} 份文档',
    ])

    return '\n'.join(lines)


def main():
    config = load_config()
    script_dir = os.path.dirname(os.path.abspath(__file__))

    input_dir = os.path.join(script_dir, 'output', '02_anonymized')
    output_dir = os.path.join(script_dir, config['vitepress']['output_dir'])

    if not os.path.exists(input_dir):
        print(f"错误：输入目录不存在: {input_dir}")
        print("请先运行 python 02_anonymize.py 和 python 03_inject_frontmatter.py")
        sys.exit(1)

    print("=" * 60)
    print("Wiki 数据准备 — Step 4: 整理 VitePress 目录")
    print("=" * 60)

    # 扫描项目和文件
    projects_data = {}  # {project_name: [filename_list]}
    total_files = 0

    for item in sorted(os.listdir(input_dir)):
        item_path = os.path.join(input_dir, item)
        if not os.path.isdir(item_path) or item.startswith('_'):
            continue

        md_files = [f for f in os.listdir(item_path) if f.endswith('.md')]
        if md_files:
            projects_data[item] = md_files
            total_files += len(md_files)

    if not projects_data:
        print(f"\n未找到项目目录。请检查 {input_dir}")
        sys.exit(1)

    print(f"\n找到 {len(projects_data)} 个项目，共 {total_files} 个文档")

    # 清理并创建输出目录
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    ensure_dir(output_dir)

    # 复制并组织文件
    for proj_name, files in sorted(projects_data.items()):
        proj_output = os.path.join(output_dir, proj_name)
        ensure_dir(proj_output)

        print(f"\n📁 {proj_name} ({len(files)} 个文件)")

        # 按生命周期排序
        sorted_files = sorted(files, key=get_doc_sort_key)

        for f in sorted_files:
            src = os.path.join(input_dir, proj_name, f)
            dst = os.path.join(proj_output, f)
            shutil.copy2(src, dst)
            stem = os.path.splitext(f)[0]
            print(f"  ✓ {stem}")

        # 复制图片目录（如果有）
        images_dir = os.path.join(input_dir, proj_name, 'images')
        if os.path.exists(images_dir):
            dst_images = os.path.join(proj_output, 'images')
            shutil.copytree(images_dir, dst_images)
            print(f"  📷 images/")

        # 生成项目概览页
        index_content = generate_project_index(proj_name, files)
        index_path = os.path.join(proj_output, 'index.md')
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(index_content)
        print(f"  📄 index.md (项目概览)")

    # 生成侧边栏配置
    sidebar = generate_sidebar(projects_data)
    sidebar_path = os.path.join(output_dir, '_sidebar.json')
    with open(sidebar_path, 'w', encoding='utf-8') as f:
        json.dump(sidebar, f, ensure_ascii=False, indent=2)
    print(f"\n📄 _sidebar.json (侧边栏配置)")

    # 生成首页
    home_content = generate_home_index(projects_data, config['vitepress'])
    home_path = os.path.join(output_dir, 'index.md')
    with open(home_path, 'w', encoding='utf-8') as f:
        f.write(home_content)
    print(f"📄 index.md (首页)")

    # 生成使用说明
    readme_content = f"""# VitePress 目录使用说明

## 快速开始

1. 初始化 VitePress 项目：
   ```bash
   mkdir wiki && cd wiki
   npm init -y
   npm install -D vitepress
   ```

2. 将本目录内容复制到 VitePress 的 docs 目录：
   ```bash
   cp -r {output_dir}/* wiki/docs/
   ```

3. 配置侧边栏（在 `.vitepress/config.mts` 中）：
   ```typescript
   import sidebar from '../docs/_sidebar.json'
   export default {{
     themeConfig: {{
       sidebar: sidebar
     }}
   }}
   ```

4. 启动预览：
   ```bash
   npx vitepress dev docs
   ```

## 文件统计

- 项目数: {len(projects_data)}
- 文档数: {total_files}
- 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
    readme_path = os.path.join(output_dir, 'README.md')
    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write(readme_content)

    # 输出统计
    print(f"\n{'=' * 60}")
    print(f"VitePress 目录整理完成!")
    print(f"  项目数: {len(projects_data)}")
    print(f"  文档数: {total_files}")
    print(f"  输出目录: {output_dir}")
    print(f"\n请将 {output_dir} 的内容复制到 VitePress 项目的 docs/ 目录中。")
    print(f"详见 {readme_path}")


if __name__ == '__main__':
    main()
