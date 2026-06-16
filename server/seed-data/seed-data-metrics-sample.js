/**
 * 数据指标设计 - 样例项目数据
 * 基于Excel模板创建完整的样例项目（幂等版本）
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'ppa.db');
const PROJECT_NAME = '油田生产可视化大屏';

async function seedSampleData() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log(`Connected to database: ${DB_PATH}`);
    });

    db.serialize(() => {
      // 1. 检查项目是否已存在
      db.get(
        'SELECT id FROM data_metrics_project WHERE project_name = ?',
        [PROJECT_NAME],
        (err, existingProject) => {
          if (err) {
            console.error('Error checking project:', err.message);
            db.close();
            reject(err);
            return;
          }

          if (existingProject) {
            console.log(`⚠️ 项目已存在: ${PROJECT_NAME} (id: ${existingProject.id})`);
            console.log('跳过样例数据创建，如需重新创建请先删除该项目');
            db.close();
            resolve();
            return;
          }

          // 2. 创建样例项目
          const projectDesc = '基于可视化指标清单V0.9.1模板的样例项目，展示数据指标设计功能';

          db.run(
            'INSERT INTO data_metrics_project (project_name, project_desc) VALUES (?, ?)',
            [PROJECT_NAME, projectDesc],
            function(err) {
              if (err) {
                console.error('Error creating project:', err.message);
                db.close();
                reject(err);
                return;
              }

              const projectId = this.lastID;
              console.log(`✅ Created project: ${PROJECT_NAME} (id: ${projectId})`);

              // 3. 创建分类数据
              const categories = [
                { type: 'module', name: '产销动态', parent_id: null, sort_order: 1 },
                { type: 'module', name: '开发生产', parent_id: null, sort_order: 2 },
                { type: 'module', name: '地面系统', parent_id: null, sort_order: 3 },
              ];

              const categoryStmt = db.prepare(
                'INSERT OR IGNORE INTO data_metric_categories (dm_project_id, type, name, parent_id, sort_order) VALUES (?, ?, ?, ?, ?)'
              );

              for (const cat of categories) {
                categoryStmt.run(projectId, cat.type, cat.name, cat.parent_id, cat.sort_order, function(err) {
                  if (!err && this.changes > 0) {
                    console.log(`  📁 Category: ${cat.name} (id: ${this.lastID})`);
                  }
                });
              }

              categoryStmt.finalize(() => {
                // 4. 创建数据指标
                const metrics = getSampleMetrics();

                const metricStmt = db.prepare(`
                  INSERT INTO data_metrics (
                    dm_project_id, module_name, scene_l1, scene_l2, metric_name, 
                    display_type, data_source_logic, algorithm, collection_cycle, 
                    source_system, source_module, integration_method
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                let insertedCount = 0;

                for (const metric of metrics) {
                  metricStmt.run(
                    projectId,
                    metric.module_name,
                    metric.scene_l1,
                    metric.scene_l2,
                    metric.metric_name,
                    metric.display_type,
                    metric.data_source_logic,
                    metric.algorithm,
                    metric.collection_cycle,
                    metric.source_system,
                    metric.source_module,
                    metric.integration_method,
                    function(err) {
                      if (!err) {
                        insertedCount++;
                      }
                    }
                  );
                }

                metricStmt.finalize(() => {
                  // 5. 更新项目指标数量
                  db.run(
                    'UPDATE data_metrics_project SET metric_count = ? WHERE id = ?',
                    [insertedCount, projectId],
                    (err) => {
                      if (!err) {
                        console.log(`✅ Updated project metric count: ${insertedCount}`);
                      }

                      // 6. 输出统计信息
                      printStats(db, projectId, () => {
                        console.log('\n✅ Sample data seeded successfully!');
                        db.close();
                        resolve();
                      });
                    }
                  );
                });
              });
            }
          );
        }
      );
    });
  });
}

// 获取样例数据
function getSampleMetrics() {
  return [
    // ===== 产销动态 - 油气产量 - 原油产量 =====
    {
      module_name: '产销动态',
      scene_l1: '油气产量',
      scene_l2: '原油产量',
      metric_name: '日完成',
      display_type: '统计数据',
      data_source_logic: '接口调用，接口字段包括日期、单位名称、日采油（t）、月累计（t）、年累计（t）、总井数、开井数、备注',
      algorithm: '当前日，各单位"日采油"相加，单位万吨',
      collection_cycle: '日',
      source_system: '青海油田生产信息管理系统',
      source_module: '综合查询-生产动态查询-采油动态查询',
      integration_method: '数据中台',
    },
    {
      module_name: '产销动态',
      scene_l1: '油气产量',
      scene_l2: '原油产量',
      metric_name: '较昨日',
      display_type: '统计数据',
      data_source_logic: '计算',
      algorithm: '与前一天日完成比较，低于昨日用红色，高于用绿色，其它用白色',
      collection_cycle: null,
      source_system: '青海油田生产信息管理系统',
      source_module: '综合查询-生产动态查询-采油动态查询',
      integration_method: null,
    },
    {
      module_name: '产销动态',
      scene_l1: '油气产量',
      scene_l2: '原油产量',
      metric_name: '月累计',
      display_type: '统计数据',
      data_source_logic: '接口调用，接口字段包括日期、单位名称、日采油（t）、月累计（t）、年累计（t）、总井数、开井数、备注',
      algorithm: '月累计',
      collection_cycle: '日',
      source_system: '青海油田生产信息管理系统',
      source_module: '综合查询-生产动态查询-采油动态查询',
      integration_method: null,
    },
    {
      module_name: '产销动态',
      scene_l1: '油气产量',
      scene_l2: '原油产量',
      metric_name: '月计划',
      display_type: '统计数据',
      data_source_logic: '月计划',
      algorithm: '月计划',
      collection_cycle: null,
      source_system: '青海油田生产信息管理系统',
      source_module: '统计分析-采油动态信息（生产动态）-采油',
      integration_method: null,
    },
    {
      module_name: '产销动态',
      scene_l1: '油气产量',
      scene_l2: '原油产量',
      metric_name: '计划完成率',
      display_type: '统计数据',
      data_source_logic: '计算',
      algorithm: '(月累计/月计划)*100%',
      collection_cycle: null,
      source_system: null,
      source_module: null,
      integration_method: null,
    },
    {
      module_name: '产销动态',
      scene_l1: '油气产量',
      scene_l2: '原油产量',
      metric_name: '年累计',
      display_type: '统计数据',
      data_source_logic: '接口调用，接口字段包括日期、单位名称、日采油（t）、月累计（t）、年累计（t）、总井数、开井数、备注',
      algorithm: '年累计',
      collection_cycle: '日',
      source_system: '青海油田生产信息管理系统',
      source_module: '综合查询-生产动态查询-采油动态查询',
      integration_method: null,
    },
    {
      module_name: '产销动态',
      scene_l1: '油气产量',
      scene_l2: '原油产量',
      metric_name: '年计划',
      display_type: '统计数据',
      data_source_logic: '年计划、年累计、年完成率',
      algorithm: '年计划',
      collection_cycle: '日',
      source_system: '青海油田生产信息管理系统',
      source_module: '统计分析-采油动态信息（生产动态）-采油',
      integration_method: null,
    },
    {
      module_name: '产销动态',
      scene_l1: '油气产量',
      scene_l2: '原油产量',
      metric_name: '年计划完成率',
      display_type: '统计数据',
      data_source_logic: '计算',
      algorithm: '(年累计/年计划) * 100%',
      collection_cycle: null,
      source_system: null,
      source_module: null,
      integration_method: null,
    },
    {
      module_name: '产销动态',
      scene_l1: '油气产量',
      scene_l2: '原油产量',
      metric_name: '原油产量分析',
      display_type: '柱状图',
      data_source_logic: '各二级单位的月累计',
      algorithm: '月累计，采油一厂～采油五厂、采气一厂、采气二厂堆积柱状图',
      collection_cycle: '日',
      source_system: '青海油田生产信息管理系统',
      source_module: '统计分析-采油动态信息（生产动态）-采油',
      integration_method: null,
    },
    {
      module_name: '产销动态',
      scene_l1: '油气产量',
      scene_l2: '原油产量',
      metric_name: '产量趋势分析',
      display_type: '条形图',
      data_source_logic: '指标名称：采油',
      algorithm: '各油田公司及二级单位的日数据，与日计划，左侧为单位导航，右侧为折线图，展示计划与实际产量',
      collection_cycle: '日',
      source_system: '青海油田生产信息管理系统',
      source_module: '统计分析-生产动态分析-日动态分析',
      integration_method: null,
    },

    // ===== 产销动态 - 油气产量 - 天然气产量 =====
    {
      module_name: '产销动态',
      scene_l1: '油气产量',
      scene_l2: '天然气产量',
      metric_name: '日完成',
      display_type: '统计数据',
      data_source_logic: '接口调用"采气"表格的接口',
      algorithm: '生产日报全公司合计中"日完成"字段。单位亿方',
      collection_cycle: '日',
      source_system: '青海油田生产信息管理系统',
      source_module: '统计分析-天然气信息-采气',
      integration_method: null,
    },
    {
      module_name: '产销动态',
      scene_l1: '油气产量',
      scene_l2: '天然气产量',
      metric_name: '较昨日',
      display_type: '统计数据',
      data_source_logic: '计算',
      algorithm: '与前一天日完成比较，低于昨日用红色，高于用绿色，其它用白色',
      collection_cycle: '日',
      source_system: '青海油田生产信息管理系统',
      source_module: '统计分析-天然气信息-采气',
      integration_method: null,
    },
    {
      module_name: '产销动态',
      scene_l1: '油气产量',
      scene_l2: '天然气产量',
      metric_name: '月累计',
      display_type: '统计数据',
      data_source_logic: '接口调用',
      algorithm: '月累计',
      collection_cycle: '日',
      source_system: '青海油田生产信息管理系统',
      source_module: '统计分析-天然气信息-采气',
      integration_method: null,
    },
    {
      module_name: '产销动态',
      scene_l1: '油气产量',
      scene_l2: '天然气产量',
      metric_name: '计划完成率',
      display_type: '统计数据',
      data_source_logic: '计算',
      algorithm: '（月累计/月计划）*100%',
      collection_cycle: '日',
      source_system: null,
      source_module: null,
      integration_method: null,
    },
    {
      module_name: '产销动态',
      scene_l1: '油气产量',
      scene_l2: '天然气产量',
      metric_name: '天然气产量分析',
      display_type: '柱状图',
      data_source_logic: '各二级单位的月累计',
      algorithm: '月累计，采气一厂～采气三厂、伴生气，堆积柱状图',
      collection_cycle: '日',
      source_system: '青海油田生产信息管理系统',
      source_module: '统计分析-天然气信息-采气',
      integration_method: null,
    },

    // ===== 产销动态 - 库存 - 原油库存 =====
    {
      module_name: '产销动态',
      scene_l1: '库存',
      scene_l2: '原油库存',
      metric_name: '原油总库存',
      display_type: '统计数据',
      data_source_logic: '单位、罐号、库存等所有字段',
      algorithm: '当日所有二级单位的所有储油罐库存合计',
      collection_cycle: '日',
      source_system: '青海油田生产信息管理系统',
      source_module: '综合查询-库存动态查询-原油库存查询',
      integration_method: null,
    },
    {
      module_name: '产销动态',
      scene_l1: '库存',
      scene_l2: '原油库存',
      metric_name: '原油库存趋势分析',
      display_type: '折线图',
      data_source_logic: '计算',
      algorithm: '左侧为各二级单位导航，右侧为各二级单位原油库存日数据',
      collection_cycle: '日',
      source_system: '青海油田生产信息管理系统',
      source_module: null,
      integration_method: null,
    },

    // ===== 产销动态 - 库存 - 储气库 =====
    {
      module_name: '产销动态',
      scene_l1: '库存',
      scene_l2: '储气库',
      metric_name: '累计注气',
      display_type: '统计数据',
      data_source_logic: '计算',
      algorithm: '前一年累计注气量+当前年累计注气量-前一年累计采气量-当前年累计采气量',
      collection_cycle: '日',
      source_system: '青海油田生产信息管理系统',
      source_module: null,
      integration_method: null,
    },
    {
      module_name: '产销动态',
      scene_l1: '库存',
      scene_l2: '储气库',
      metric_name: '日采气量',
      display_type: '统计数据',
      data_source_logic: '日完成、月累计等全部字段',
      algorithm: '采气-日完成，单位为亿方',
      collection_cycle: '日',
      source_system: '青海油田生产信息管理系统',
      source_module: '统计分析-储气库信息',
      integration_method: null,
    },
    {
      module_name: '产销动态',
      scene_l1: '库存',
      scene_l2: '储气库',
      metric_name: '日注气量',
      display_type: '统计数据',
      data_source_logic: '全公司合计，注气-日累计',
      algorithm: null,
      collection_cycle: '日',
      source_system: '青海油田生产信息管理系统',
      source_module: '统计分析-储气库信息',
      integration_method: null,
    },
  ];
}

// 输出统计信息
function printStats(db, projectId, callback) {
  db.get('SELECT * FROM data_metrics_project WHERE id = ?', [projectId], (err, project) => {
    if (!err && project) {
      console.log('\n=== 样例项目信息 ===');
      console.log(`项目名称: ${project.project_name}`);
      console.log(`项目描述: ${project.project_desc}`);
      console.log(`指标数量: ${project.metric_count}`);
    }

    db.all('SELECT display_type, COUNT(*) as count FROM data_metrics WHERE dm_project_id = ? GROUP BY display_type ORDER BY count DESC', [projectId], (err, types) => {
      if (!err && types) {
        console.log('\n=== 展示方式统计 ===');
        for (const type of types) {
          console.log(`  ${type.display_type}: ${type.count} 个`);
        }
      }
      callback();
    });
  });
}

// 如果直接运行此脚本
if (require.main === module) {
  seedSampleData()
    .then(() => {
      console.log('\nDone!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\nFailed:', err.message);
      process.exit(1);
    });
}

module.exports = seedSampleData;
