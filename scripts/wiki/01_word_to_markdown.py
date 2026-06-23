#!/usr/bin/env python3
"""
01_word_to_markdown.py
将 input/ 目录下的 Word 文档批量转换为 Markdown

使用方法：
    python 01_word_to_markdown.py

输入：input/{projectName}/*.docx
输出：output/01_markdown/{projectName}/*.md + images/
"""
import os
import sys
import yaml

# 添加 lib 目录到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))

from file_utils import find_docx_files, ensure_dir
from pandoc_converter import PandocConverter


def load_config():
    """加载配置文件"""
    config_path = os.path.join(os.path.dirname(__file__), 'config.yaml')
    with open(config_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def main():
    config = load_config()
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # 输入目录
    input_dir = os.path.join(script_dir, config['pandoc']['input_dir'])
    if not os.path.exists(input_dir):
        print(f"错误：输入目录不存在: {input_dir}")
        print("请将 Word 文档按项目放入 input/ 目录：")
        print("  input/")
        print("  ├── 01_项目A/")
        print("  │   ├── 需求文档.docx")
        print("  │   └── 设计文档.docx")
        print("  └── 02_项目B/")
        print("      └── 测试报告.docx")
        sys.exit(1)

    # 输出目录
    output_dir = os.path.join(script_dir, 'output', '01_markdown')
    ensure_dir(output_dir)

    # 扫描 Word 文件
    print("=" * 60)
    print("Wiki 数据准备 — Step 1: Word → Markdown")
    print("=" * 60)
    print(f"\n输入目录: {input_dir}")
    print(f"输出目录: {output_dir}")

    files = find_docx_files(input_dir)
    if not files:
        print(f"\n未找到 .docx 文件。请检查 {input_dir} 目录。")
        sys.exit(1)

    # 按项目分组统计
    projects = {}
    for f in files:
        proj = f['project_folder']
        if proj not in projects:
            projects[proj] = []
        projects[proj].append(f)

    print(f"\n找到 {len(files)} 个 Word 文档，分布在 {len(projects)} 个项目中：")
    for proj, proj_files in sorted(projects.items()):
        print(f"  📁 {proj} ({len(proj_files)} 个文件)")

    # 初始化转换器
    try:
        converter = PandocConverter(
            output_format=config['pandoc']['output_format'],
            extract_media=config['pandoc']['extract_media'],
        )
    except RuntimeError as e:
        print(f"\n错误：{e}")
        sys.exit(1)

    # 执行转换
    print(f"\n开始转换...")
    result = converter.convert_batch(files, output_dir)

    # 输出统计
    print(f"\n{'=' * 60}")
    print(f"转换完成!")
    print(f"  总文件数: {result['total']}")
    print(f"  成功: {result['success']}")
    print(f"  失败: {result['failed']}")

    if result['failed'] > 0:
        print(f"\n失败详情:")
        for r in result['results']:
            if not r['success']:
                print(f"  ✗ {r['source']['relative_path']}: {r['error']}")

    print(f"\n输出目录: {output_dir}")
    print("下一步: 运行 python 02_anonymize.py 进行 AI 脱敏")


if __name__ == '__main__':
    main()
