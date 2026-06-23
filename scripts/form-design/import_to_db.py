#!/usr/bin/env python3
"""
将 JSON 表单数据导入到 SQLite 数据库
用法: python3 import_to_db.py [--reset]
"""

import json
import sqlite3
import os
import sys

# 数据库路径
DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'server', 'ppa.db')
JSON_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'forms', 'forms.json')


def get_db():
    """获取数据库连接"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def create_tables(conn):
    """创建表结构"""
    cursor = conn.cursor()

    # 设计项目表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS form_project (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_name TEXT NOT NULL,
            project_desc TEXT,
            linked_project_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 应用表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS form_app (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            app_name TEXT NOT NULL UNIQUE,
            app_code TEXT NOT NULL UNIQUE,
            project_id INTEGER DEFAULT NULL,
            description TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES form_project(id) ON DELETE CASCADE
        )
    ''')

    # 检查并添加 project_id 字段（如果表已存在但没有该字段）
    cursor.execute('PRAGMA table_info(form_app)')
    columns = [col[1] for col in cursor.fetchall()]
    if 'project_id' not in columns:
        cursor.execute('ALTER TABLE form_app ADD COLUMN project_id INTEGER DEFAULT NULL')
        print('Added project_id column to form_app')

    # 表单定义表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS form_definition (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            app_id INTEGER NOT NULL,
            form_name TEXT NOT NULL,
            form_code TEXT NOT NULL UNIQUE,
            filter_condition TEXT,
            description TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (app_id) REFERENCES form_app(id) ON DELETE CASCADE
        )
    ''')

    # 字段定义表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS form_field (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            form_id INTEGER NOT NULL,
            field_name TEXT NOT NULL,
            field_code TEXT NOT NULL,
            is_primary_key INTEGER DEFAULT 0,
            is_virtual INTEGER DEFAULT 0,
            field_type TEXT,
            field_length INTEGER,
            field_precision INTEGER,
            default_value TEXT,

            input_type TEXT,
            input_type_code TEXT,
            input_component TEXT,
            input_params TEXT,

            is_required INTEGER DEFAULT 0,
            is_unique INTEGER DEFAULT 0,
            placeholder TEXT,
            remark TEXT,

            card_group TEXT DEFAULT '基本信息',
            card_sort INTEGER,
            card_width TEXT DEFAULT '半行',
            card_width_span INTEGER DEFAULT 12,

            add_control TEXT DEFAULT '读写',
            update_control TEXT DEFAULT '读写',
            detail_control TEXT DEFAULT '读写',

            list_width INTEGER,
            list_control TEXT DEFAULT '显示',
            list_sort INTEGER,
            list_formatter TEXT,

            is_filter INTEGER DEFAULT 0,
            filter_mode TEXT,
            filter_default TEXT,
            filter_placeholder TEXT,
            source_system TEXT,

            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (form_id) REFERENCES form_definition(id) ON DELETE CASCADE,
            UNIQUE(form_id, field_code)
        )
    ''')

    # 索引
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_form_field_form_id ON form_field(form_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_form_definition_app_id ON form_definition(app_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_form_app_project_id ON form_app(project_id)')

    conn.commit()
    print('表结构创建完成')


def reset_tables(conn):
    """清空表数据"""
    cursor = conn.cursor()
    cursor.execute('DELETE FROM form_field')
    cursor.execute('DELETE FROM form_definition')
    cursor.execute('DELETE FROM form_app')
    cursor.execute('DELETE FROM form_project')
    cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('form_app', 'form_definition', 'form_field', 'form_project')")
    conn.commit()
    print('已清空表数据')


def import_data(conn, json_data):
    """导入 JSON 数据到数据库"""
    cursor = conn.cursor()

    # 用于缓存 app_id 和 form_id
    app_cache = {}
    form_cache = {}

    forms = json_data.get('forms', [])
    total_fields = 0

    # 创建默认设计项目
    cursor.execute(
        'INSERT INTO form_project (project_name, project_desc) VALUES (?, ?)',
        ['监督管理项目', '青海油田安全生产智能管控平台 - 监督管理模块表单设计']
    )
    project_id = cursor.lastrowid
    print(f'创建设计项目: 监督管理项目 (id={project_id})')

    for form_data in forms:
        app_name = form_data.get('app_name', '')
        form_code = form_data.get('form_code', '')
        form_name = form_data.get('form_name', '')

        # 1. 插入或获取应用
        if app_name not in app_cache:
            app_code = app_name.replace(' ', '_').lower()[:50]
            cursor.execute(
                'INSERT OR IGNORE INTO form_app (app_name, app_code, project_id) VALUES (?, ?, ?)',
                [app_name, app_code, project_id]
            )
            cursor.execute('SELECT id FROM form_app WHERE app_name = ?', [app_name])
            app_cache[app_name] = cursor.fetchone()['id']
            print(f'  应用: {app_name} (id={app_cache[app_name]})')

        app_id = app_cache[app_name]

        # 2. 插入表单定义
        cursor.execute(
            'INSERT OR IGNORE INTO form_definition (app_id, form_name, form_code, filter_condition) VALUES (?, ?, ?, ?)',
            [app_id, form_name, form_code, form_data.get('filter_condition')]
        )
        cursor.execute('SELECT id FROM form_definition WHERE form_code = ?', [form_code])
        form_id = cursor.fetchone()['id']
        form_cache[form_code] = form_id
        print(f'  表单: {form_name} ({form_code}) id={form_id}')

        # 3. 插入字段
        fields = form_data.get('fields', [])
        for idx, field in enumerate(fields):
            input_params = field.get('input_params')
            if input_params and isinstance(input_params, dict):
                input_params_str = json.dumps(input_params, ensure_ascii=False)
            else:
                input_params_str = None

            cursor.execute('''
                INSERT OR REPLACE INTO form_field (
                    form_id, field_name, field_code, is_primary_key, is_virtual,
                    field_type, field_length, field_precision, default_value,
                    input_type, input_type_code, input_component, input_params,
                    is_required, is_unique, placeholder, remark,
                    card_group, card_sort, card_width, card_width_span,
                    add_control, update_control, detail_control,
                    list_width, list_control, list_sort, list_formatter,
                    is_filter, filter_mode, filter_default, filter_placeholder, source_system,
                    sort_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', [
                form_id,
                field.get('field_name', ''),
                field.get('field_code', ''),
                1 if field.get('is_primary_key') else 0,
                1 if field.get('is_virtual') else 0,
                field.get('field_type'),
                field.get('field_length'),
                field.get('field_precision'),
                field.get('default_value'),
                field.get('input_type'),
                field.get('input_type_code'),
                field.get('input_component'),
                input_params_str,
                1 if field.get('is_required') else 0,
                1 if field.get('is_unique') else 0,
                field.get('placeholder'),
                field.get('remark'),
                field.get('card_group', '基本信息'),
                field.get('card_sort'),
                field.get('card_width', '半行'),
                field.get('card_width_span', 12),
                field.get('add_control', '读写'),
                field.get('update_control', '读写'),
                field.get('detail_control', '读写'),
                field.get('list_width'),
                field.get('list_control', '显示'),
                field.get('list_sort'),
                field.get('list_formatter'),
                1 if field.get('is_filter') else 0,
                field.get('filter_mode'),
                field.get('filter_default'),
                field.get('filter_placeholder'),
                field.get('source_system'),
                idx
            ])
            total_fields += 1

    conn.commit()
    print(f'\n导入完成: 1 个项目, {len(forms)} 个表单, {total_fields} 个字段')


def main():
    # 检查参数
    reset = '--reset' in sys.argv

    # 读取 JSON
    if not os.path.exists(JSON_PATH):
        print(f'错误: JSON 文件不存在: {JSON_PATH}')
        return

    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        json_data = json.load(f)

    print(f'读取 JSON: {json_data["meta"]["total_forms"]} 个表单, {json_data["meta"]["total_fields"]} 个字段')

    # 连接数据库
    conn = get_db()

    try:
        # 创建表
        create_tables(conn)

        # 清空数据（如果指定 --reset）
        if reset:
            reset_tables(conn)

        # 导入数据
        import_data(conn, json_data)

        # 验证
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM form_project')
        project_count = cursor.fetchone()[0]
        cursor.execute('SELECT COUNT(*) FROM form_app')
        app_count = cursor.fetchone()[0]
        cursor.execute('SELECT COUNT(*) FROM form_definition')
        form_count = cursor.fetchone()[0]
        cursor.execute('SELECT COUNT(*) FROM form_field')
        field_count = cursor.fetchone()[0]

        print(f'\n验证: {project_count} 个项目, {app_count} 个应用, {form_count} 个表单, {field_count} 个字段')

    finally:
        conn.close()


if __name__ == '__main__':
    main()
