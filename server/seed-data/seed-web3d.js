#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'ppa.db');

const web3dRiskItems = [
  {
    step_order: 1,
    step_name: '项目背景与技术选型',
    item_name: '技术路线',
    description: '核心技术选型',
    weight: 2.0,
    options: [
      { label: 'Three.js（推荐）', value: 1 },
      { label: 'Babylon.js', value: 2 },
      { label: 'Cesium', value: 3 },
      { label: 'Unity WebGL', value: 4 },
      { label: 'Unreal Pixel Streaming', value: 5 },
      { label: '混合方案', value: 6 },
    ],
  },
  {
    step_order: 1,
    step_name: '项目背景与技术选型',
    item_name: '场景类型',
    description: '宏观 vs 微观',
    weight: 1.0,
    options: [
      { label: '单一产品展示', value: 1 },
      { label: '室内/楼层', value: 2 },
      { label: '园区/单体建筑 (BIM)', value: 3 },
      { label: '城市级/大地图 (GIS)', value: 4 },
    ],
  },
  {
    step_order: 1,
    step_name: '项目背景与技术选型',
    item_name: '业务目标',
    description: '核心用途',
    weight: 1.0,
    options: [
      { label: '营销展示 (重加载速度)', value: 2 },
      { label: '业务管理 (重数据交互)', value: 3 },
      { label: '炫酷大屏 (重视觉)', value: 4 },
      { label: '培训仿真 (重交互逻辑)', value: 4 },
    ],
  },
  {
    step_order: 1,
    step_name: '项目背景与技术选型',
    item_name: '部署环境',
    description: '硬件与终端',
    weight: 1.5,
    options: [
      { label: 'PC 浏览器', value: 1 },
      { label: '展厅大屏', value: 2 },
      { label: '移动端 (H5/小程序)', value: 5 },
      { label: '混合部署', value: 4 },
    ],
  },
  {
    step_order: 2,
    step_name: '数据资产现状',
    item_name: '数据源状况',
    description: '是否有现成模型',
    weight: 3.0,
    options: [
      { label: '有现成 glTF/GLB 模型', value: 1 },
      { label: '有 Revit/IFC 等 BIM 模型', value: 3 },
      { label: '只有 CAD/图纸', value: 4 },
      { label: '只有照片/视频', value: 5 },
      { label: '啥也没有，需凭空想象', value: 6 },
    ],
  },
  {
    step_order: 2,
    step_name: '数据资产现状',
    item_name: '数据质量',
    description: '轻量化程度',
    weight: 2.5,
    options: [
      { label: '已做过轻量化', value: 1 },
      { label: '原始设计稿 (未处理)', value: 5 },
    ],
  },
  {
    step_order: 2,
    step_name: '数据资产现状',
    item_name: '数据语义',
    description: '构件拆分情况',
    weight: 2.0,
    options: [
      { label: '已拆分单体', value: 1 },
      { label: '是一整坨 Mesh', value: 4 },
    ],
  },
  {
    step_order: 3,
    step_name: '开发需求评估',
    item_name: '美术风格',
    description: '期望的渲染效果',
    weight: 1.5,
    options: [
      { label: '极简风 (AO 白模)', value: 1 },
      { label: '科技风 (线框/全息/发光)', value: 3 },
      { label: '写实风 (PBR 材质)', value: 4 },
    ],
  },
  {
    step_order: 3,
    step_name: '开发需求评估',
    item_name: '光影特效',
    description: '后期处理需求',
    weight: 1.5,
    options: [
      { label: '无特效', value: 1 },
      { label: '简单泛光 (Bloom)', value: 2 },
      { label: '动态阴影', value: 3 },
      { label: '天气系统 (雨雪)', value: 5 },
    ],
  },
  {
    step_order: 3,
    step_name: '开发需求评估',
    item_name: '动画需求',
    description: '动态表现',
    weight: 1.5,
    options: [
      { label: '无动画', value: 1 },
      { label: '漫游动画 (相机动)', value: 2 },
      { label: '构件动画 (门开关、拆解)', value: 3 },
      { label: '粒子效果 (水流、火焰)', value: 5 },
    ],
  },
  {
    step_order: 3,
    step_name: '开发需求评估',
    item_name: '基础交互',
    description: '鼠标操作',
    weight: 1.0,
    options: [
      { label: '仅旋转/缩放/平移', value: 1 },
      { label: '限制视角范围', value: 2 },
      { label: '第一人称/第三人称切换', value: 3 },
    ],
  },
  {
    step_order: 3,
    step_name: '开发需求评估',
    item_name: '选中与反馈',
    description: 'Raycaster 交互',
    weight: 1.5,
    options: [
      { label: '无需选中', value: 1 },
      { label: '悬停/点击高亮', value: 2 },
      { label: '多选/框选', value: 4 },
    ],
  },
  {
    step_order: 3,
    step_name: '开发需求评估',
    item_name: '业务挂载',
    description: '3D + UI 联动',
    weight: 2.0,
    options: [
      { label: '无需联动', value: 1 },
      { label: '点击模型弹窗', value: 2 },
      { label: '3D 标签跟随', value: 3 },
      { label: '列表与模型联动', value: 4 },
    ],
  },
  {
    step_order: 3,
    step_name: '开发需求评估',
    item_name: '复杂功能',
    description: '高级逻辑',
    weight: 2.5,
    options: [
      { label: '无', value: 1 },
      { label: '测量工具 (测距/测面)', value: 3 },
      { label: '剖切 (Section Box)', value: 4 },
      { label: '路径规划/导航', value: 5 },
    ],
  },
  {
    step_order: 3,
    step_name: '开发需求评估',
    item_name: '目标 FPS',
    description: '帧率要求',
    weight: 1.0,
    options: [
      { label: '> 30 (及格)', value: 1 },
      { label: '> 50 (流畅)', value: 2 },
      { label: '> 60 (极致)', value: 4 },
    ],
  },
  {
    step_order: 3,
    step_name: '开发需求评估',
    item_name: '首屏加载时间',
    description: '加载速度要求',
    weight: 1.5,
    options: [
      { label: '< 15秒 (可接受)', value: 1 },
      { label: '< 5秒 (理想)', value: 3 },
      { label: '< 3秒 (极致)', value: 5 },
    ],
  },
];

const web3dWorkloadTemplates = [
  // 数据处理
  {
    category: 'data_processing',
    item_name: '现成 glTF/GLB 清理',
    description: '已有 Web 格式模型，主要合并检查与小幅优化',
    base_days: 0.5,
    unit: '个/套',
  },
  {
    category: 'data_processing',
    item_name: 'BIM 清洗与轻量化',
    description: 'Revit/IFC 转 glTF/3D Tiles，含减面与贴图修复',
    base_days: 4.0,
    unit: '栋',
  },
  {
    category: 'data_processing',
    item_name: '无模型建模（按面积）',
    description: '依据 CAD/图纸/照片建模，按每 1000 平米估算',
    base_days: 3.0,
    unit: '每1000平米',
  },
  {
    category: 'data_processing',
    item_name: '贴图与材质修复',
    description: '贴图路径、法线、材质批处理与修复',
    base_days: 1.5,
    unit: '栋',
  },
  // 核心开发
  {
    category: 'core_dev',
    item_name: '场景搭建与基础交互',
    description: '模型加载、相机/轨道控制、基本 UI 挂载',
    base_days: 3.0,
    unit: '套',
  },
  {
    category: 'core_dev',
    item_name: 'UI 联调',
    description: '3D 与前端框架联动，表单/列表交互',
    base_days: 2.0,
    unit: '套',
  },
  {
    category: 'core_dev',
    item_name: 'Shader/特效',
    description: 'Bloom/科技风/粒子等单个效果',
    base_days: 2.0,
    unit: '个效果',
  },
  // 业务逻辑
  {
    category: 'business_logic',
    item_name: '点击弹窗',
    description: '选中高亮 + 属性弹窗',
    base_days: 1.0,
    unit: '套',
  },
  {
    category: 'business_logic',
    item_name: '数据联动与图表',
    description: '3D-列表-图表联动与接口对接',
    base_days: 4.0,
    unit: '套',
  },
  {
    category: 'business_logic',
    item_name: '高级工具（测量/剖切/导航）',
    description: '测距、剖切、路径规划等高级工具组合',
    base_days: 3.0,
    unit: '套',
  },
];

function ensureTablesExist(db) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='web3d_risk_items';",
      (err, row) => {
        if (err) {
          return reject(err);
        }
        if (!row) {
          return reject(
            new Error('web3d_risk_items 表不存在，请先运行迁移脚本 004_web3d_assessment.js'),
          );
        }
        db.get(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='web3d_workload_templates';",
          (checkErr, templateRow) => {
            if (checkErr) {
              return reject(checkErr);
            }
            if (!templateRow) {
              return reject(
                new Error(
                  'web3d_workload_templates 表不存在，请先运行迁移脚本 004_web3d_assessment.js',
                ),
              );
            }
            resolve();
          },
        );
      },
    );
  });
}

function seedRiskItems(db) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM web3d_risk_items', (deleteErr) => {
      if (deleteErr) {
        return reject(deleteErr);
      }

      const stmt = db.prepare(
        'INSERT INTO web3d_risk_items (step_order, step_name, item_name, description, weight, options_json) VALUES (?, ?, ?, ?, ?, ?)',
      );

      web3dRiskItems.forEach((item) => {
        stmt.run(
          item.step_order,
          item.step_name,
          item.item_name,
          item.description,
          item.weight,
          JSON.stringify(item.options),
          (insertErr) => {
            if (insertErr) {
              console.error(`插入风险项 ${item.item_name} 失败:`, insertErr.message);
            }
          },
        );
      });

      stmt.finalize((finalizeErr) => {
        if (finalizeErr) {
          return reject(finalizeErr);
        }
        console.log(`✅ 已写入 ${web3dRiskItems.length} 条 Web3D 风险项`);
        resolve();
      });
    });
  });
}

function seedWorkloadTemplates(db) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM web3d_workload_templates', (deleteErr) => {
      if (deleteErr) {
        return reject(deleteErr);
      }

      const stmt = db.prepare(
        'INSERT INTO web3d_workload_templates (category, item_name, description, base_days, unit) VALUES (?, ?, ?, ?, ?)',
      );

      web3dWorkloadTemplates.forEach((item) => {
        stmt.run(
          item.category,
          item.item_name,
          item.description,
          item.base_days,
          item.unit,
          (insertErr) => {
            if (insertErr) {
              console.error(`插入工作量模板 ${item.item_name} 失败:`, insertErr.message);
            }
          },
        );
      });

      stmt.finalize((finalizeErr) => {
        if (finalizeErr) {
          return reject(finalizeErr);
        }
        console.log(`✅ 已写入 ${web3dWorkloadTemplates.length} 条 Web3D 工作量模板`);
        resolve();
      });
    });
  });
}

async function run() {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('无法连接 SQLite 数据库:', err.message);
      process.exit(1);
    }
  });

  try {
    await ensureTablesExist(db);
    await seedRiskItems(db);
    await seedWorkloadTemplates(db);
    console.log('🎉 Web3D 风险项与工作量模板初始化完成');
  } catch (error) {
    console.error('❌ 初始化失败:', error.message);
    process.exit(1);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('关闭数据库连接失败:', err.message);
      }
    });
  }
}

run();
