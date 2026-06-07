"""
文件工具函数
文件遍历、编码检测、命名清理
"""
import os
import re
import chardet


def find_docx_files(input_dir):
    """
    递归扫描目录，查找所有 .docx 文件

    Returns:
        list[dict]: 每项包含 {
            'path': 绝对路径,
            'relative_path': 相对于 input_dir 的路径,
            'project_folder': 所属项目文件夹名（一级子目录）,
            'filename': 文件名（含扩展名）,
            'stem': 文件名（不含扩展名）
        }
    """
    results = []
    input_dir = os.path.abspath(input_dir)

    for root, dirs, files in os.walk(input_dir):
        for f in files:
            if not f.lower().endswith('.docx'):
                continue
            if f.startswith('~$'):  # Word 临时文件
                continue

            abs_path = os.path.join(root, f)
            rel_path = os.path.relpath(abs_path, input_dir)
            parts = rel_path.split(os.sep)

            project_folder = parts[0] if len(parts) > 1 else '_未分类'
            stem = os.path.splitext(f)[0]

            results.append({
                'path': abs_path,
                'relative_path': rel_path,
                'project_folder': project_folder,
                'filename': f,
                'stem': stem,
            })

    return results


def sanitize_filename(name):
    """
    清理文件名，保留中文、字母、数字、连字符、下划线、点
    """
    # 替换不安全字符为下划线
    cleaned = re.sub(r'[<>:"/\\|?*\s]', '_', name)
    # 去除连续下划线
    cleaned = re.sub(r'_+', '_', cleaned)
    # 去除首尾下划线
    cleaned = cleaned.strip('_')
    return cleaned or 'unnamed'


def detect_encoding(file_path):
    """
    检测文件编码

    Returns:
        str: 编码名称（如 'utf-8', 'gbk', 'gb2312'）
    """
    with open(file_path, 'rb') as f:
        raw = f.read()
    result = chardet.detect(raw)
    encoding = result.get('encoding', 'utf-8')
    # chardet 有时返回 None 或不准确的编码
    if not encoding:
        return 'utf-8'
    return encoding.lower()


def read_text_file(file_path, encoding=None):
    """
    读取文本文件，自动处理编码

    Args:
        file_path: 文件路径
        encoding: 指定编码（None 则自动检测）

    Returns:
        str: 文件内容
    """
    if encoding is None:
        encoding = detect_encoding(file_path)

    with open(file_path, 'r', encoding=encoding, errors='replace') as f:
        return f.read()


def write_text_file(file_path, content, encoding='utf-8'):
    """
    写入文本文件

    Args:
        file_path: 文件路径
        content: 文件内容
        encoding: 输出编码（默认 utf-8）
    """
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, 'w', encoding=encoding) as f:
        f.write(content)


def ensure_dir(path):
    """确保目录存在"""
    os.makedirs(path, exist_ok=True)
