/**
 * 差旅成本数据初始化脚本
 * 根据CSV文件中的差旅成本信息，向数据库中添加初始差旅成本数据
 */

const sqlite3 = require('sqlite3').verbose();

// 连接到SQLite数据库（数据库文件在上级目录）
const db = new sqlite3.Database('../ppa.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    process.exit(1);
  } else {
    console.log('Successfully connected to the SQLite database.');
  }
});

// 根据CSV文件定义的差旅成本数据
// 费用单位：元/人/月
const travelCosts = [
  { item_name: '市内通勤', cost_per_month: 1500 },
  { item_name: '住宿', cost_per_month: 6000 },
  { item_name: '餐补', cost_per_month: 900 },
  { item_name: '出差补助', cost_per_month: 2400 },
];

// 清空现有数据（可选，如果不需要清空可以注释掉）
const clearExistingData = () => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM config_travel_costs', (err) => {
      if (err) {
        console.error('Error clearing existing travel costs:', err.message);
        reject(err);
      } else {
        console.log('Existing travel costs cleared.');
        resolve();
      }
    });
  });
};

// 插入差旅成本数据
const insertTravelCost = (cost) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO config_travel_costs (item_name, cost_per_month) VALUES (?, ?)',
      [cost.item_name, cost.cost_per_month],
      function(err) {
        if (err) {
          console.error(`Error inserting travel cost ${cost.item_name}:`, err.message);
          reject(err);
        } else {
          console.log(`✓ Inserted travel cost: ${cost.item_name} (${cost.cost_per_month} 元/人/月)`);
          resolve(this.lastID);
        }
      }
    );
  });
};

// 主函数
const seedTravelCosts = async () => {
  try {
    console.log('开始初始化差旅成本数据...\n');
    
    // 清空现有数据（如果需要）
    await clearExistingData();
    console.log('');
    
    // 插入所有差旅成本项
    for (const cost of travelCosts) {
      await insertTravelCost(cost);
    }
    
    console.log('\n✅ 差旅成本数据初始化完成！');
    console.log(`共插入 ${travelCosts.length} 条差旅成本记录。`);
    
    // 计算总成本
    const totalCost = travelCosts.reduce((sum, item) => sum + item.cost_per_month, 0);
    console.log(`总计: ${totalCost} 元/人/月`);
    
    // 验证插入的数据
    db.all('SELECT * FROM config_travel_costs', [], (err, rows) => {
      if (err) {
        console.error('Error verifying data:', err.message);
      } else {
        console.log('\n当前数据库中的差旅成本列表：');
        console.table(rows);
      }
      
      // 关闭数据库连接
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('\n数据库连接已关闭。');
        }
      });
    });
    
  } catch (error) {
    console.error('❌ 初始化失败:', error.message);
    db.close();
    process.exit(1);
  }
};

// 运行脚本
seedTravelCosts();
