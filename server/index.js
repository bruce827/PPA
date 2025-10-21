
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3001; // 使用3001端口，以避免与前端可能使用的3000端口冲突

// 连接到SQLite数据库 (如果db文件不存在，则会自动创建)
const db = new sqlite3.Database('./ppa.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Successfully connected to the SQLite database.');
  }
});

app.use(express.json()); // 中间件，用于解析JSON格式的请求体

// API 健康检查端点
app.get('/api/health', (req, res) => {
  // 简单查询数据库以确认连接正常
  db.get('SELECT 1', (err, row) => {
    if (err) {
      res.status(500).json({ status: 'error', message: 'Database connection failed' });
    } else {
      res.json({ status: 'ok', message: 'Backend is healthy and connected to database' });
    }
  });
});

// 根路由的一个简单响应
app.get('/', (req, res) => {
  res.send('Hello from the backend server!');
});

// --- 角色配置 (config_roles) CRUD API ---

// GET: 获取所有角色
app.get('/api/config/roles', (req, res) => {
  db.all("SELECT * FROM config_roles", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ data: rows });
  });
});

// POST: 创建一个新角色
app.post('/api/config/roles', (req, res) => {
  const { role_name, unit_price } = req.body;
  db.run(`INSERT INTO config_roles (role_name, unit_price) VALUES (?, ?)`, [role_name, unit_price], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID });
  });
});

// PUT: 更新一个角色
app.put('/api/config/roles/:id', (req, res) => {
  const { role_name, unit_price } = req.body;
  db.run(`UPDATE config_roles SET role_name = ?, unit_price = ? WHERE id = ?`, [role_name, unit_price, req.params.id], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ updated: this.changes });
  });
});

// DELETE: 删除一个角色
app.delete('/api/config/roles/:id', (req, res) => {
  db.run(`DELETE FROM config_roles WHERE id = ?`, req.params.id, function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

// --- 风险评估项 (config_risk_items) CRUD API ---

// GET: 获取所有风险评估项
app.get('/api/config/risk-items', (req, res) => {
  db.all("SELECT * FROM config_risk_items", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ data: rows });
  });
});

// POST: 创建一个新风险评估项
app.post('/api/config/risk-items', (req, res) => {
  const { category, item_name, options_json } = req.body;
  db.run(`INSERT INTO config_risk_items (category, item_name, options_json) VALUES (?, ?, ?)`, [category, item_name, options_json], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID });
  });
});

// PUT: 更新一个风险评估项
app.put('/api/config/risk-items/:id', (req, res) => {
  const { category, item_name, options_json } = req.body;
  db.run(`UPDATE config_risk_items SET category = ?, item_name = ?, options_json = ? WHERE id = ?`, [category, item_name, options_json, req.params.id], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ updated: this.changes });
  });
});

// DELETE: 删除一个风险评估项
app.delete('/api/config/risk-items/:id', (req, res) => {
  db.run(`DELETE FROM config_risk_items WHERE id = ?`, req.params.id, function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

// --- 差旅成本 (config_travel_costs) CRUD API ---

// GET: 获取所有差旅成本项
app.get('/api/config/travel-costs', (req, res) => {
  db.all("SELECT * FROM config_travel_costs", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ data: rows });
  });
});

// POST: 创建一个新差旅成本项
app.post('/api/config/travel-costs', (req, res) => {
  const { item_name, cost_per_month } = req.body;
  db.run(`INSERT INTO config_travel_costs (item_name, cost_per_month) VALUES (?, ?)`, [item_name, cost_per_month], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID });
  });
});

// PUT: 更新一个差旅成本项
app.put('/api/config/travel-costs/:id', (req, res) => {
  const { item_name, cost_per_month } = req.body;
  db.run(`UPDATE config_travel_costs SET item_name = ?, cost_per_month = ? WHERE id = ?`, [item_name, cost_per_month, req.params.id], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ updated: this.changes });
  });
});

// DELETE: 删除一个差旅成本项
app.delete('/api/config/travel-costs/:id', (req, res) => {
  db.run(`DELETE FROM config_travel_costs WHERE id = ?`, req.params.id, function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

// --- 聚合配置 API ---
app.get('/api/config/all', (req, res) => {
  const promises = [
    new Promise((resolve, reject) => {
      db.all("SELECT * FROM config_roles", [], (err, rows) => {
        if (err) reject(err);
        else resolve({ roles: rows });
      });
    }),
    new Promise((resolve, reject) => {
      db.all("SELECT * FROM config_risk_items", [], (err, rows) => {
        if (err) reject(err);
        else resolve({ risk_items: rows });
      });
    }),
    new Promise((resolve, reject) => {
      db.all("SELECT * FROM config_travel_costs", [], (err, rows) => {
        if (err) reject(err);
        else resolve({ travel_costs: rows });
      });
    }),
  ];

  Promise.all(promises)
    .then(results => {
      const combinedResult = results.reduce((acc, current) => ({ ...acc, ...current }), {});
      res.json({ data: combinedResult });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

// --- 实时计算 API ---
app.post('/api/calculate', (req, res) => {
  const assessmentData = req.body;

  try {
    // 1. 计算评分因子
    const riskScore = Object.values(assessmentData.risk_scores || {}).reduce((sum, score) => sum + Number(score), 0);
    const ratingFactor = riskScore / 100;

    // 2. 计算各项工作量和费用
    const calculateWorkloadCost = (workloadItems, roles) => {
      let totalWorkload = 0;
      let totalCost = 0;
      const rolePriceMap = new Map(roles.map(r => [r.role_name, r.unit_price / 10000])); // 转换为万元

      workloadItems.forEach(item => {
        let itemRoleCost = 0;
        let itemRoleDays = 0;
        roles.forEach(role => {
          const days = Number(item[role.role_name] || 0);
          itemRoleDays += days;
          itemRoleCost += days * (rolePriceMap.get(role.role_name) || 0);
        });

        const workload = itemRoleDays * Number(item.delivery_factor || 1);
        const cost = itemRoleCost * Number(item.delivery_factor || 1) * ratingFactor * (item.scope_factor || 1) * (item.tech_factor || 1);
        
        totalWorkload += workload;
        totalCost += cost;
      });
      return { totalWorkload, totalCost };
    };

    const dev = calculateWorkloadCost(assessmentData.development_workload || [], assessmentData.roles || []);
    const integration = calculateWorkloadCost(assessmentData.integration_workload || [], assessmentData.roles || []);

    // 3. 计算其他成本
    // 3.1 差旅成本：从配置表查询所有差旅成本项的总和（元/人/月）
    const travelCostPerMonth = await new Promise((resolve, reject) => {
      db.get(
        'SELECT SUM(cost_per_month) as total FROM config_travel_costs WHERE is_active = 1',
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.total || 10800); // 默认值10800元/月（向后兼容）
        }
      );
    });
    const travelCost = (assessmentData.travel_months || 0) * (travelCostPerMonth / 10000); // 转换为万元

    // 3.2 维护成本（待配置化，当前使用硬编码）
    const maintenanceWorkload = (assessmentData.maintenance_months || 0) * (assessmentData.maintenance_headcount || 0) * 21.5;
    const maintenanceCost = maintenanceWorkload * 0.16;

    // 3.3 风险成本
    const riskCost = (assessmentData.risk_items || []).reduce((sum, item) => sum + Number(item.cost || 0), 0);

    // 4. 汇总
    const totalExactCost = dev.totalCost + integration.totalCost + travelCost + maintenanceCost + riskCost;

    const result = {
      software_dev_cost: Math.round(dev.totalCost),
      system_integration_cost: Math.round(integration.totalCost),
      travel_cost: Math.round(travelCost),
      maintenance_cost: Math.round(maintenanceCost),
      risk_cost: Math.round(riskCost),
      total_cost: Math.round(totalExactCost),
    };

    res.json({ data: result });

  } catch (error) {
    res.status(500).json({ error: 'Calculation failed', message: error.message });
  }
});

// --- 项目管理 API ---

// POST: 创建一个新项目
app.post('/api/projects', (req, res) => {
  const { name, description, is_template, assessmentData } = req.body;

  // --- 在后端重新执行完整的计算逻辑，以确保数据一致性 ---
  try {
    const riskScore = Object.values(assessmentData.risk_scores || {}).reduce((sum, score) => sum + Number(score), 0);
    const ratingFactor = riskScore / 100;

    const calculateWorkloadCost = (workloadItems, roles) => {
      let totalWorkload = 0;
      let totalCost = 0;
      workloadItems.forEach(item => {
        const totalRoleDays = roles.reduce((sum, role) => sum + Number(item[role.role_name] || 0), 0);
        const workload = totalRoleDays * Number(item.delivery_factor || 1);
        const averageUnitPrice = 0.16; // 万元
        const cost = workload * ratingFactor * (item.scope_factor || 1) * (item.tech_factor || 1) * averageUnitPrice;
        totalWorkload += workload;
        totalCost += cost;
      });
      return { totalWorkload, totalCost };
    };

    const dev = calculateWorkloadCost(assessmentData.development_workload || [], assessmentData.roles || []);
    const integration = calculateWorkloadCost(assessmentData.integration_workload || [], assessmentData.roles || []);

    // 差旅成本：从配置表查询所有差旅成本项的总和（元/人/月）
    const travelCostPerMonth = await new Promise((resolve, reject) => {
      db.get(
        'SELECT SUM(cost_per_month) as total FROM config_travel_costs WHERE is_active = 1',
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.total || 10800); // 默认值10800元/月（向后兼容）
        }
      );
    });
    const travelCost = (assessmentData.travel_months || 0) * (travelCostPerMonth / 10000); // 转换为万元

    const maintenanceWorkload = (assessmentData.maintenance_months || 0) * (assessmentData.maintenance_headcount || 0) * 21.5;
    const maintenanceCost = maintenanceWorkload * 0.16;
    const riskCost = (assessmentData.risk_items || []).reduce((sum, item) => sum + Number(item.cost || 0), 0);

    const totalExactCost = dev.totalCost + integration.totalCost + travelCost + maintenanceCost + riskCost;
    const finalTotalCost = Math.round(totalExactCost);
    const finalWorkloadDays = dev.totalWorkload + integration.totalWorkload + maintenanceWorkload;

    // --- 数据入库 ---
    const assessmentDetailsJson = JSON.stringify(assessmentData);
    const sql = `INSERT INTO projects (name, description, is_template, final_total_cost, final_risk_score, final_workload_days, assessment_details_json) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [name, description, is_template || 0, finalTotalCost, riskScore, finalWorkloadDays, assessmentDetailsJson];

    db.run(sql, params, function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    });

  } catch (error) {
    res.status(500).json({ error: 'Save failed', message: error.message });
  }
});

// GET: 获取所有模板列表
app.get('/api/templates', (req, res) => {
  db.all("SELECT id, name, description FROM projects WHERE is_template = 1 ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ data: rows });
  });
});

// GET: 获取单个项目或模板的完整数据
app.get('/api/projects/:id', (req, res) => {
  db.get("SELECT * FROM projects WHERE id = ?", [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }
    res.json({ data: row });
  });
});

// GET: 获取所有项目列表
app.get('/api/projects', (req, res) => {
  db.all("SELECT id, name, final_total_cost, final_risk_score, created_at FROM projects WHERE is_template = 0 ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ data: rows });
  });
});

// PUT: 更新一个项目
app.put('/api/projects/:id', (req, res) => {
  const { name, description, is_template, assessmentData } = req.body;
  const projectId = req.params.id;

  try {
    // ... (此处应复制 POST /api/projects 中的完整计算逻辑) ...
    const finalTotalCost = 0; // 重新计算
    const finalRiskScore = 0; // 重新计算
    const finalWorkloadDays = 0; // 重新计算

    const assessmentDetailsJson = JSON.stringify(assessmentData);
    const sql = `UPDATE projects SET name = ?, description = ?, is_template = ?, final_total_cost = ?, final_risk_score = ?, final_workload_days = ?, assessment_details_json = ? WHERE id = ?`;
    const params = [name, description, is_template || 0, finalTotalCost, finalRiskScore, finalWorkloadDays, assessmentDetailsJson, projectId];

    db.run(sql, params, function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ updated: this.changes });
    });
  } catch (error) {
    res.status(500).json({ error: 'Update failed', message: error.message });
  }
});

// DELETE: 删除一个项目
app.delete('/api/projects/:id', (req, res) => {
  db.run(`DELETE FROM projects WHERE id = ?`, req.params.id, function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// ... (existing code) ...

// --- 导出 API ---

// GET: 导出项目为 PDF
app.get('/api/projects/:id/export/pdf', (req, res) => {
  db.get("SELECT * FROM projects WHERE id = ?", [req.params.id], (err, project) => {
    if (err || !project) {
      return res.status(404).send('Project not found');
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(project.name)}.pdf`);
    doc.pipe(res);

    // --- PDF 内容 ---
    doc.fontSize(25).text(project.name, { align: 'center' });
    doc.fontSize(12).text(project.description || '', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(18).text('评估总览');
    doc.fontSize(14).text(`报价总计: ${project.final_total_cost} 万元`);
    doc.fontSize(14).text(`风险总分: ${project.final_risk_score}`);
    doc.fontSize(14).text(`总工作量: ${project.final_workload_days.toFixed(2)} 人天`);
    // ... 可添加更多信息

    doc.end();
  });
});

// GET: 导出项目为 Excel
app.get('/api/projects/:id/export/excel', async (req, res) => {
  db.get("SELECT * FROM projects WHERE id = ?", [req.params.id], async (err, project) => {
    if (err || !project) {
      return res.status(404).send('Project not found');
    }

    const assessmentData = JSON.parse(project.assessment_details_json);
    const workbook = new ExcelJS.Workbook();

    // 1. 风险评分 sheet
    const riskSheet = workbook.addWorksheet('风险评分');
    riskSheet.columns = [
      { header: '评估项', key: 'name', width: 40 },
      { header: '选择/描述', key: 'choice', width: 40 },
      { header: '得分', key: 'score', width: 10 },
    ];
    // ... (需要从 assessmentData.risk_scores 中解析数据并添加行)

    // 2. 工作量 sheet (简化版)
    const devSheet = workbook.addWorksheet('新功能开发');
    // ... (需要从 assessmentData.development_workload 中解析数据并添加行)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(project.name)}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
