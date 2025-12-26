/**
 * 重新分配项目更新时间
 * 规则：今天的数据不改，其他数据分配到2025年3月至12月，每月至少1条
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'ppa.db');
const db = new sqlite3.Database(dbPath);

// 获取今天的日期（UTC）
const today = new Date().toISOString().split('T')[0];

// 目标月份：2025年3月到12月（共10个月）
const targetMonths = [
  '2025-03', '2025-04', '2025-05', '2025-06', '2025-07',
  '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'
];

// 生成随机日期时间
function randomDateTime(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Math.floor(Math.random() * daysInMonth) + 1;
  const hour = Math.floor(Math.random() * 10) + 2; // 02:00 - 11:00 UTC
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);
  
  const dayStr = String(day).padStart(2, '0');
  const hourStr = String(hour).padStart(2, '0');
  const minStr = String(minute).padStart(2, '0');
  const secStr = String(second).padStart(2, '0');
  
  return `${yearMonth}-${dayStr} ${hourStr}:${minStr}:${secStr}`;
}

db.serialize(() => {
  // 获取需要更新的项目（排除今天的和模板）
  db.all(
    `SELECT id FROM projects 
     WHERE is_template = 0 
       AND date(updated_at) != date('now')
     ORDER BY id`,
    [],
    (err, rows) => {
      if (err) {
        console.error('查询失败:', err);
        db.close();
        return;
      }

      const projectIds = rows.map(r => r.id);
      console.log(`需要更新的项目数: ${projectIds.length}`);
      console.log(`目标月份数: ${targetMonths.length}`);

      // 计算每个月分配多少项目
      const perMonth = Math.floor(projectIds.length / targetMonths.length);
      const remainder = projectIds.length % targetMonths.length;
      
      console.log(`每月基础分配: ${perMonth}, 余数: ${remainder}`);

      // 分配项目到各月
      const assignments = [];
      let idx = 0;
      
      targetMonths.forEach((month, monthIdx) => {
        // 前 remainder 个月多分配1个
        const count = perMonth + (monthIdx < remainder ? 1 : 0);
        for (let i = 0; i < count && idx < projectIds.length; i++) {
          const newDate = randomDateTime(month);
          assignments.push({ id: projectIds[idx], month, newDate });
          idx++;
        }
      });

      console.log('\n分配计划:');
      const monthCounts = {};
      assignments.forEach(a => {
        monthCounts[a.month] = (monthCounts[a.month] || 0) + 1;
      });
      Object.entries(monthCounts).forEach(([m, c]) => {
        console.log(`  ${m}: ${c} 个项目`);
      });

      // 执行更新
      console.log('\n开始更新...');
      const stmt = db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?');
      
      assignments.forEach(({ id, newDate }) => {
        stmt.run(newDate, id, (err) => {
          if (err) console.error(`更新 id=${id} 失败:`, err);
        });
      });

      stmt.finalize(() => {
        console.log('更新完成!');
        
        // 验证结果
        db.all(
          `SELECT STRFTIME('%Y-%m', updated_at) as month, COUNT(*) as count 
           FROM projects WHERE is_template = 0 
           GROUP BY month ORDER BY month`,
          [],
          (err, result) => {
            if (err) {
              console.error('验证查询失败:', err);
            } else {
              console.log('\n更新后的月度分布:');
              result.forEach(r => console.log(`  ${r.month}: ${r.count} 个项目`));
            }
            db.close();
          }
        );
      });
    }
  );
});
