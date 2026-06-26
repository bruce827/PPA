#!/usr/bin/env node

/**
 * SQLite -> PostgreSQL 数据迁移脚本
 * 迁移 AI 模型配置数据
 */

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// 手动加载 .env 文件
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const [key, ...values] = line.split('=');
    if (key && !key.startsWith('#')) {
      process.env[key.trim()] = values.join('=').trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

// 临时使用 SQLite 读取源数据
const SQLITE_DB_PATH = path.join(__dirname, '..', 'ppa.db');

async function migrateData() {
  console.log('📦 开始迁移 AI 模型配置数据...\n');
  
  // 1. 从 SQLite 读取数据
  const sourceDb = new sqlite3.Database(SQLITE_DB_PATH);
  
  const readFromSqlite = (sql) => new Promise((resolve, reject) => {
    sourceDb.all(sql, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  try {
    const rows = await readFromSqlite('SELECT * FROM ai_model_configs');
    console.log(`📊 从 SQLite 读取到 ${rows.length} 条 AI 模型配置\n`);
    
    if (rows.length === 0) {
      console.log('✅ 没有数据需要迁移');
      return;
    }

    // 2. 连接 PostgreSQL
    // 临时设置环境变量
    process.env.DB_TYPE = 'postgres';
    const db = require('../utils/db');
    await db.init();
    
    console.log('✅ 已连接 PostgreSQL\n');

    // 3. 迁移数据
    let successCount = 0;
    let skipCount = 0;
    
    for (const row of rows) {
      try {
        // 检查是否已存在
        const existing = await db.get(
          'SELECT id FROM ai_model_configs WHERE config_name = ?',
          [row.config_name]
        );
        
        if (existing) {
          console.log(`⏭️  跳过已存在: ${row.config_name}`);
          skipCount++;
          continue;
        }

        // 插入数据（PostgreSQL 使用 $1, $2... 占位符）
        await db.run(
          `INSERT INTO ai_model_configs 
            (config_name, description, provider, api_key, api_host, model_name, 
             temperature, max_tokens, timeout, is_current, is_active, 
             last_test_time, test_status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            row.config_name,
            row.description,
            row.provider,
            row.api_key,
            row.api_host,
            row.model_name,
            row.temperature,
            row.max_tokens,
            row.timeout,
            row.is_current,
            row.is_active,
            row.last_test_time,
            row.test_status,
            row.created_at,
            row.updated_at,
          ]
        );
        
        console.log(`✅ 迁移成功: ${row.config_name} (${row.provider}/${row.model_name})`);
        successCount++;
      } catch (err) {
        console.error(`❌ 迁移失败 ${row.config_name}:`, err.message);
      }
    }

    // 4. 迁移 prompt_templates（如果需要）
    console.log('\n📦 检查 Prompt 模板数据...');
    const prompts = await readFromSqlite('SELECT * FROM prompt_templates');
    
    if (prompts.length > 0) {
      console.log(`📊 从 SQLite 读取到 ${prompts.length} 条 Prompt 模板\n`);
      
      for (const row of prompts) {
        try {
          const existing = await db.get(
            'SELECT id FROM prompt_templates WHERE name = ? AND category = ?',
            [row.name, row.category]
          );
          
          if (existing) {
            console.log(`⏭️  跳过已存在: ${row.name}`);
            skipCount++;
            continue;
          }

          await db.run(
            `INSERT INTO prompt_templates 
              (name, category, content, variables_json, is_system, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [row.name, row.category, row.content, row.variables_json, row.is_system, row.is_active, row.created_at, row.updated_at]
          );
          
          console.log(`✅ 迁移成功: ${row.name}`);
          successCount++;
        } catch (err) {
          console.error(`❌ 迁移失败 ${row.name}:`, err.message);
        }
      }
    }

    // 5. 迁移 ai_prompts（如果存在）
    try {
      const aiPrompts = await readFromSqlite('SELECT * FROM ai_prompts');
      if (aiPrompts.length > 0) {
        console.log(`\n📊 从 SQLite 读取到 ${aiPrompts.length} 条 AI Prompts\n`);
        
        for (const row of aiPrompts) {
          try {
            const existing = await db.get(
              'SELECT id FROM ai_prompts WHERE name = ?',
              [row.name]
            );
            
            if (existing) {
              console.log(`⏭️  跳过已存在: ${row.name}`);
              skipCount++;
              continue;
            }

            await db.run(
              `INSERT INTO ai_prompts (name, content, category, description, variables_json, is_active, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [row.name, row.content, row.category, row.description, row.variables_json, row.is_active, row.created_at, row.updated_at]
            );
            
            console.log(`✅ 迁移成功: ${row.name}`);
            successCount++;
          } catch (err) {
            console.error(`❌ 迁移失败 ${row.name}:`, err.message);
          }
        }
      }
    } catch (e) {
      // ai_prompts 表可能不存在，忽略
    }

    console.log('\n' + '='.repeat(60));
    console.log(`🎉 迁移完成！成功: ${successCount}，跳过: ${skipCount}`);
    console.log('='.repeat(60));

  } catch (err) {
    console.error('\n❌ 迁移过程中出错:', err.message);
    console.error(err.stack);
  } finally {
    sourceDb.close();
    process.exit(0);
  }
}

migrateData();
