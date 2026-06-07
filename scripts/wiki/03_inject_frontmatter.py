#!/usr/bin/env python3
"""
03_inject_frontmatter.py
为脱敏后的 Markdown 文件注入 YAML Frontmatter 和下载提示

使用方法：
    python 03_inject_frontmatter.py

输入：output/02_anonymized/{projectName}/*.md
输出：就地修改，添加 Frontmatter
"""
import os
import sys
import yaml

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))

from file_utils import ensure_dir
from frontmatter_builder import FrontmatterBuilder


def load_config():
    config_path = os.path.join(os.path.dirname(__file__), 'config.yaml')
    with open(config_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def find_markdown_files(input_dir):
    """递归扫描目录，查找所有 .md 文件"""
    results = []
    for root, dirs, files in os.walk(input_dir):
        for f in files:
            if f.endswith('.md') and not f.startswith('_'):
                results.append(os.path.join(root, f))
    return sorted(results)


def main():
    config = load_config()
    script_dir = os.path.dirname(os.path.abspath(__file__))

    input_dir = os.path.join(script_dir, 'output', '02_anonymized')

    if not os.path.exists(input_dir):
        print(f"错误：输入目录不存在: {input_dir}")
        print("请先运行 python 02_anonymize.py")
        sys.exit(1)

    # 初始化 Frontmatter 构建器
    frontmatter_config = config.get('frontmatter', {})
    frontmatter_config['file_type_keywords'] = config.get('file_type_keywords', {})
    builder = FrontmatterBuilder(frontmatter_config)

    print("=" * 60)
    print("Wiki 数据准备 — Step 3: 注入 YAML Frontmatter")
    print("=" * 60)

    # 扫描文件
    md_files = find_markdown_files(input_dir)
    if not md_files:
        print(f"\n未找到 .md 文件。请检查 {input_dir} 目录。")
        sys.exit(1)

    # 按项目分组
    projects = {}
    for f in md_files:
        rel = os.path.relpath(f, input_dir)
        parts = rel.split(os.sep)
        proj = parts[0] if len(parts) > 1 else '_未分类'
        if proj not in projects:
            projects[proj] = []
        projects[proj].append(f)

    print(f"\n找到 {len(md_files)} 个 Markdown 文件，分布在 {len(projects)} 个项目中")

    # 统计
    success_count = 0
    skip_count = 0
    fail_count = 0
    type_stats = {}

    for proj, proj_files in sorted(projects.items()):
        print(f"\n📁 {proj}")

        for md_path in proj_files:
            filename = os.path.basename(md_path)
            stem = os.path.splitext(filename)[0]

            # 检测文件类型
            file_type = builder.detect_file_type(stem)
            type_stats[file_type] = type_stats.get(file_type, 0) + 1

            # 读取内容
            try:
                with open(md_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception as e:
                print(f"  ✗ {filename}: 读取失败 - {e}")
                fail_count += 1
                continue

            # 检查是否已有 Frontmatter
            if content.startswith('---'):
                # 已有 Frontmatter，检查是否是我们的格式
                if 'project_name:' in content[:500]:
                    print(f"  ⊘ {filename}: 已有 Frontmatter，跳过")
                    skip_count += 1
                    continue

            # 注入 Frontmatter
            new_content = builder.inject(content, proj, stem, file_type)

            try:
                with open(md_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"  ✓ {filename} [{file_type}]")
                success_count += 1
            except Exception as e:
                print(f"  ✗ {filename}: 写入失败 - {e}")
                fail_count += 1

    # 输出统计
    print(f"\n{'=' * 60}")
    print(f"Frontmatter 注入完成!")
    print(f"  处理: {success_count} 个文件")
    print(f"  跳过: {skip_count} 个（已有 Frontmatter）")
    print(f"  失败: {fail_count} 个")

    print(f"\n文档类型分布:")
    for file_type, count in sorted(type_stats.items(), key=lambda x: -x[1]):
        print(f"  {file_type}: {count}")

    print(f"\n下一步: 运行 python 04_organize_for_vitepress.py 整理目录")


if __name__ == '__main__':
    main()
