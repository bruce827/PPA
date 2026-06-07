#!/usr/bin/env python3
"""
02_anonymize.py
对 Step 1 生成的 Markdown 文件进行 AI 智能脱敏

使用方法：
    python 02_anonymize.py

输入：output/01_markdown/{projectName}/*.md
输出：output/02_anonymized/{projectName}/*.md + _report.json

注意：此脚本会调用 DeepSeek API，请确保 config.yaml 中已配置 api_key
"""
import os
import sys
import json
import time
import yaml

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))

from file_utils import find_docx_files, ensure_dir, write_text_file
from ai_anonymizer import AIAnonymizer
from sensitive_detector import SensitiveDetector


def load_config():
    config_path = os.path.join(os.path.dirname(__file__), 'config.yaml')
    with open(config_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def find_markdown_files(input_dir):
    """递归扫描目录，查找所有 .md 文件"""
    results = []
    for root, dirs, files in os.walk(input_dir):
        for f in files:
            if f.endswith('.md'):
                results.append(os.path.join(root, f))
    return sorted(results)


def save_report(report, output_dir):
    """保存脱敏报告"""
    report_path = os.path.join(output_dir, '_report.json')
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    return report_path


def main():
    config = load_config()
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # 检查 API Key
    api_key = config['anonymize'].get('api_key', '')
    if not api_key:
        print("错误：未配置 DeepSeek API Key")
        print("请编辑 config.yaml，填入 anonymize.api_key")
        sys.exit(1)

    # 输入/输出目录
    input_dir = os.path.join(script_dir, 'output', '01_markdown')
    output_dir = os.path.join(script_dir, 'output', '02_anonymized')

    if not os.path.exists(input_dir):
        print(f"错误：输入目录不存在: {input_dir}")
        print("请先运行 python 01_word_to_markdown.py")
        sys.exit(1)

    ensure_dir(output_dir)

    # 扫描 Markdown 文件
    print("=" * 60)
    print("Wiki 数据准备 — Step 2: AI 智能脱敏")
    print("=" * 60)

    md_files = find_markdown_files(input_dir)
    if not md_files:
        print(f"\n未找到 .md 文件。请检查 {input_dir} 目录。")
        sys.exit(1)

    # 按项目分组统计
    projects = {}
    for f in md_files:
        rel = os.path.relpath(f, input_dir)
        proj = rel.split(os.sep)[0] if os.sep in rel else '_未分类'
        if proj not in projects:
            projects[proj] = []
        projects[proj].append(f)

    print(f"\n找到 {len(md_files)} 个 Markdown 文件，分布在 {len(projects)} 个项目中：")
    for proj, proj_files in sorted(projects.items()):
        print(f"  📁 {proj} ({len(proj_files)} 个文件)")

    print(f"\nAI 模型: {config['anonymize']['model']}")
    print(f"API 地址: {config['anonymize']['api_base']}")
    print(f"温度: {config['anonymize']['temperature']}")

    # 预估费用（粗略）
    total_chars = 0
    for f in md_files:
        with open(f, 'r', encoding='utf-8') as fh:
            total_chars += len(fh.read())
    estimated_cost = total_chars / 1000 * 0.002  # DeepSeek 约 ¥0.002/千字符
    print(f"\n预估文档总字符数: {total_chars:,}")
    print(f"预估 API 费用: 约 ¥{estimated_cost:.2f}")

    # 确认继续
    confirm = input("\n确认开始脱敏？(y/N): ").strip().lower()
    if confirm != 'y':
        print("已取消。")
        sys.exit(0)

    # 初始化脱敏器
    anonymizer = AIAnonymizer(config['anonymize'])

    # 按项目逐个处理
    start_time = time.time()
    all_results = []
    total_api_calls = 0
    total_tokens = 0

    for proj_idx, (proj, proj_files) in enumerate(sorted(projects.items())):
        print(f"\n{'─' * 40}")
        print(f"📁 项目 [{proj_idx + 1}/{len(projects)}]: {proj}")
        print(f"{'─' * 40}")

        # 为每个项目创建输出子目录
        proj_output_dir = os.path.join(output_dir, proj)
        ensure_dir(proj_output_dir)

        for file_idx, md_path in enumerate(proj_files):
            filename = os.path.basename(md_path)
            print(f"\n  [{file_idx + 1}/{len(proj_files)}] {filename}")

            result = anonymizer.anonymize_file(md_path)
            result['project'] = proj
            result['filename'] = filename

            if result['content']:
                # 保存脱敏后文件
                out_path = os.path.join(proj_output_dir, filename)
                with open(out_path, 'w', encoding='utf-8') as f:
                    f.write(result['content'])
                print(f"    ✓ 已保存 ({result['api_calls']} 次 API 调用, {result['total_tokens']} tokens)")

                # 残留敏感词检测
                detector = SensitiveDetector()
                detection = detector.detect(result['content'], filename)
                if detection['has_sensitive']:
                    print(f"    ⚠ 检测到可能的残留敏感信息:")
                    for key, count in detection['summary'].items():
                        if count > 0:
                            print(f"      {key}: {count} 处")
                    result['warnings'] = detection['findings']
                else:
                    print(f"    ✓ 未检测到残留敏感信息")
                    result['warnings'] = []
            else:
                print(f"    ✗ 脱敏失败: {result.get('error', '未知错误')}")
                result['warnings'] = []

            total_api_calls += result['api_calls']
            total_tokens += result['total_tokens']
            all_results.append(result)

    # 生成报告
    duration = time.time() - start_time
    report = {
        'generated_at': time.strftime('%Y-%m-%d %H:%M:%S'),
        'summary': {
            'total_files': len(md_files),
            'api_calls': total_api_calls,
            'total_tokens': total_tokens,
            'duration_seconds': round(duration, 2),
            'estimated_cost_yuan': round(total_tokens * 0.000002, 4),  # DeepSeek 定价
        },
        'files': [],
    }

    for r in all_results:
        file_report = {
            'project': r.get('project', ''),
            'filename': r.get('filename', ''),
            'success': r.get('success', False),
            'api_calls': r.get('api_calls', 0),
            'tokens': r.get('total_tokens', 0),
            'error': r.get('error'),
            'warnings_count': len(r.get('warnings', [])),
        }
        report['files'].append(file_report)

    report_path = save_report(report, output_dir)

    # 输出统计
    print(f"\n{'=' * 60}")
    print(f"脱敏完成!")
    print(f"  总文件数: {len(md_files)}")
    print(f"  API 调用次数: {total_api_calls}")
    print(f"  总 Token 用量: {total_tokens:,}")
    print(f"  总耗时: {duration:.1f} 秒")
    print(f"  预估费用: 约 ¥{report['summary']['estimated_cost_yuan']:.4f}")

    # 统计警告
    files_with_warnings = sum(1 for r in all_results if r.get('warnings'))
    if files_with_warnings > 0:
        print(f"\n  ⚠ {files_with_warnings} 个文件可能有残留敏感信息，请检查报告")

    failed_count = sum(1 for r in all_results if not r.get('success'))
    if failed_count > 0:
        print(f"\n  ✗ {failed_count} 个文件脱敏失败（已保留原文）")

    print(f"\n脱敏报告: {report_path}")
    print("下一步: 人工审核脱敏结果，然后运行 python 03_inject_frontmatter.py")


if __name__ == '__main__':
    main()
