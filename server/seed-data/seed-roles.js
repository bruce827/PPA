/**
 * 角色数据初始化脚本
 * 根据CSV文件中的角色信息，向数据库中添加初始角色数据
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

// 根据CSV文件定义的角色数据
// 单价参考市场平均水平设定（单位：元/人天）
const roles = [
  { role_name: '项目经理', unit_price: 1600 },
  { role_name: '技术经理', unit_price: 1800 },
  { role_name: 'UI设计师', unit_price: 1200 },
  { role_name: 'DBA', unit_price: 1500 },
  { role_name: '产品经理', unit_price: 1400 },
  { role_name: '后端开发', unit_price: 1500 },
  { role_name: '前端开发', unit_price: 1400 },
  { role_name: '测试工程师', unit_price: 1200 },
  { role_name: '实施工程师', unit_price: 1300 },
];

// 清空现有数据（可选，如果不需要清空可以注释掉）
const clearExistingData = () => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM config_roles', (err) => {
      if (err) {
        console.error('Error clearing existing roles:', err.message);
        reject(err);
      } else {
        console.log('Existing roles cleared.');
        resolve();
      }
    });
  });
};

// 插入角色数据
const insertRole = (role) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO config_roles (role_name, unit_price) VALUES (?, ?)',
      [role.role_name, role.unit_price],
      function(err) {
        if (err) {
          console.error(`Error inserting role ${role.role_name}:`, err.message);
          reject(err);
        } else {
          console.log(`✓ Inserted role: ${role.role_name} (${role.unit_price} 元/人天)`);
          resolve(this.lastID);
        }
      }
    );
  });
};

// 主函数
const seedRoles = async () => {
  try {
    console.log('开始初始化角色数据...\n');
    
    // 清空现有数据（如果需要）
    await clearExistingData();
    console.log('');
    
    // 插入所有角色
    for (const role of roles) {
      await insertRole(role);
    }
    
    console.log('\n✅ 角色数据初始化完成！');
    console.log(`共插入 ${roles.length} 条角色记录。`);
    
    // 验证插入的数据
    db.all('SELECT * FROM config_roles', [], (err, rows) => {
      if (err) {
        console.error('Error verifying data:', err.message);
      } else {
        console.log('\n当前数据库中的角色列表：');
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
seedRoles();
