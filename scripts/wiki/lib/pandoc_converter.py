"""
Pandoc 调用封装
将 Word 文档转换为 Markdown
"""
import os
import subprocess
import shutil


class PandocConverter:
    """Word → Markdown 转换器"""

    def __init__(self, output_format='markdown_github', extract_media=True):
        """
        Args:
            output_format: Pandoc 输出格式（markdown_github / markdown）
            extract_media: 是否提取内嵌图片
        """
        self.output_format = output_format
        self.extract_media = extract_media
        self._check_pandoc()

    def _check_pandoc(self):
        """检查 Pandoc 是否已安装"""
        if not shutil.which('pandoc'):
            raise RuntimeError(
                "Pandoc 未安装。请先安装：\n"
                "  macOS:   brew install pandoc\n"
                "  Ubuntu:  sudo apt-get install pandoc"
            )

    def convert(self, docx_path, output_dir):
        """
        转换单个 Word 文档为 Markdown

        Args:
            docx_path: Word 文档路径
            output_dir: 输出目录

        Returns:
            dict: {
                'md_path': 生成的 .md 文件路径,
                'images_dir': 图片目录（如果提取了图片）,
                'success': bool,
                'error': 错误信息（如果失败）
            }
        """
        docx_path = os.path.abspath(docx_path)
        output_dir = os.path.abspath(output_dir)
        os.makedirs(output_dir, exist_ok=True)

        filename = os.path.splitext(os.path.basename(docx_path))[0]
        md_path = os.path.join(output_dir, f"{filename}.md")

        # 构建 Pandoc 命令
        cmd = [
            'pandoc', docx_path,
            '-f', 'docx',
            '-t', self.output_format,
            '-o', md_path,
            '--wrap=none',  # 不自动换行
        ]

        # 提取内嵌图片
        images_dir = None
        if self.extract_media:
            images_dir = os.path.join(output_dir, 'images')
            cmd.extend(['--extract-media', images_dir])

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode != 0:
                return {
                    'md_path': None,
                    'images_dir': None,
                    'success': False,
                    'error': result.stderr.strip() or 'Pandoc 转换失败',
                }

            # 检查是否有图片目录但为空
            if images_dir and not os.path.exists(images_dir):
                images_dir = None

            return {
                'md_path': md_path,
                'images_dir': images_dir,
                'success': True,
                'error': None,
            }

        except subprocess.TimeoutExpired:
            return {
                'md_path': None,
                'images_dir': None,
                'success': False,
                'error': 'Pandoc 转换超时（60秒）',
            }
        except Exception as e:
            return {
                'md_path': None,
                'images_dir': None,
                'success': False,
                'error': str(e),
            }

    def convert_batch(self, file_list, base_output_dir):
        """
        批量转换 Word 文档

        Args:
            file_list: find_docx_files() 返回的文件列表
            base_output_dir: 输出根目录

        Returns:
            dict: {
                'total': 总文件数,
                'success': 成功数,
                'failed': 失败数,
                'results': 详细结果列表
            }
        """
        results = []
        success_count = 0
        failed_count = 0

        for file_info in file_list:
            # 按项目文件夹组织输出
            output_dir = os.path.join(
                base_output_dir,
                file_info['project_folder']
            )

            print(f"  转换: {file_info['relative_path']} ... ", end='', flush=True)

            result = self.convert(file_info['path'], output_dir)
            result['source'] = file_info

            if result['success']:
                print("✓")
                success_count += 1
            else:
                print(f"✗ {result['error']}")
                failed_count += 1

            results.append(result)

        return {
            'total': len(file_list),
            'success': success_count,
            'failed': failed_count,
            'results': results,
        }
