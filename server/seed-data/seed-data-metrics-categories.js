/**
 * 数据指标设计 - 种子数据
 * 预置示例项目和分类数据
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'ppa.db');

async function seedDataMetricsCategories() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log(`Connected to database: ${DB_PATH}`);
    });

    db.serialize(() => {
      // 1. 创建示例项目
      const projects = [
        { name: '示例大屏项目', desc: '用于演示数据指标设计功能的示例项目' },
      ];

      const projectStmt = db.prepare(
        'INSERT OR IGNORE INTO data_metrics_project (project_name, project_desc) VALUES (?, ?)'
      );

      for (const proj of projects) {
        projectStmt.run(proj.name, proj.desc, function(err) {
          if (err) {
            console.error(`Error inserting project ${proj.name}:`, err.message);
          } else if (this.changes > 0) {
            console.log(`Inserted project: ${proj.name} (id: ${this.lastID})`);
          } else {
            console.log(`Skipped project (exists): ${proj.name}`);
          }
        });
      }

      projectStmt.finalize();

      // 2. 查询项目ID
      db.get('SELECT id FROM data_metrics_project WHERE project_name = ?', ['示例大屏项目'], (err, project) => {
        if (err || !project) {
          console.log('Project not found, skipping categories');
          db.close();
          resolve();
          return;
        }

        const projectId = project.id;
        console.log(`\nUsing project ID: ${projectId}`);

        // 3. 创建分类数据
        const categories = [
          // 功能模块
          { type: 'module', name: '产销动态', parent_id: null, sort_order: 1 },
          { type: 'module', name: '开发生产', parent_id: null, sort_order: 2 },
          { type: 'module', name: '地面系统', parent_id: null, sort_order: 3 },
          { type: 'module', name: '安全环保', parent_id: null, sort_order: 4 },
          { type: 'module', name: '经营管理', parent_id: null, sort_order: 5 },
        ];

        const categoryStmt = db.prepare(
          'INSERT OR IGNORE INTO data_metric_categories (dm_project_id, type, name, parent_id, sort_order) VALUES (?, ?, ?, ?, ?)'
        );

        for (const cat of categories) {
          categoryStmt.run(projectId, cat.type, cat.name, cat.parent_id, cat.sort_order, function(err) {
            if (err) {
              console.error(`Error inserting category ${cat.name}:`, err.message);
            } else if (this.changes > 0) {
              console.log(`Inserted category: ${cat.name} (id: ${this.lastID})`);
            } else {
              console.log(`Skipped category (exists): ${cat.name}`);
            }
          });
        }

        categoryStmt.finalize();

        // 4. 查询结果
        db.all('SELECT * FROM data_metrics_project ORDER BY id', (err, projects) => {
          if (err) {
            console.error('Error querying projects:', err.message);
          } else {
            console.log('\n=== 数据指标项目 ===');
            console.log(`总数: ${projects.length}`);
            projects.forEach(p => {
              console.log(`  ${p.id}: ${p.project_name} (${p.metric_count} 指标)`);
            });
          }

          db.all('SELECT * FROM data_metric_categories ORDER BY dm_project_id, sort_order', (err, categories) => {
            if (err) {
              console.error('Error querying categories:', err.message);
            } else {
              console.log('\n=== 数据指标分类 ===');
              console.log(`总数: ${categories.length}`);
              categories.forEach(c => {
                console.log(`  ${c.type}: ${c.name} (project: ${c.dm_project_id})`);
              });
            }

            db.close((err) => {
              if (err) {
                reject(err);
                return;
              }
              console.log('\nSeed completed successfully!');
              resolve();
            });
          });
        });
      });
    });
  });
}

// 如果直接运行此脚本
if (require.main === module) {
  seedDataMetricsCategories()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed:', err.message);
      process.exit(1);
    });
}

module.exports = seedDataMetricsCategories;
