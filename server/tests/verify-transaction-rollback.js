/**
 * 验证事务回滚方案是否可行
 *
 * 测试步骤：
 * 1. 开启事务
 * 2. 插入测试数据
 * 3. 回滚事务
 * 4. 验证数据是否真的被回滚了
 */

// 设置环境变量 - 从父目录的 .env 文件读取
const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'test';
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = envContent.split('\n').filter(line => line && !line.startsWith('#'));
  for (const line of envVars) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^"|"$/g, '');
    }
  }
  console.log(`✅ 已加载环境变量: ${envPath}\n`);
}

const dbUtil = require('../utils/db');

async function testTransactionRollback() {
  console.log('开始验证事务回滚方案...\n');

  try {
    // 1. 初始化数据库连接
    console.log('1. 连接数据库...');
    await dbUtil.init();
    const dbType = dbUtil.getDbType();
    console.log(`   ✅ 连接成功 (${dbType})\n`);

    // 2. 开启事务
    console.log('2. 开启事务...');
    await dbUtil.run('BEGIN');
    console.log('   ✅ 事务已开启\n');

    // 3. 插入测试数据
    console.log('3. 插入测试数据...');

    // 插入角色
    const roleRes = await dbUtil.run(
      'INSERT INTO config_roles (role_name, unit_price, is_active) VALUES (?, ?, ?)',
      ['transaction-test-role', 999999, 1]
    );
    const roleId = roleRes.id;
    console.log(`   ✅ 角色已创建: id=${roleId}`);

    // 插入项目
    const projectRes = await dbUtil.run(
      `INSERT INTO projects (name, description, is_template, project_type, assessment_details_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      ['transaction-test-project', '测试事务回滚', 0, 'standard', '{}']
    );
    const projectId = projectRes.id;
    console.log(`   ✅ 项目已创建: id=${projectId}\n`);

    // 4. 验证数据是否存在 (事务未提交前应该能查到)
    console.log('4. 验证事务内数据...');
    const roleInTx = await dbUtil.get('SELECT * FROM config_roles WHERE id = ?', [roleId]);
    const projectInTx = await dbUtil.get('SELECT * FROM projects WHERE id = ?', [projectId]);

    if (roleInTx && projectInTx) {
      console.log('   ✅ 事务内数据可查询 (符合预期)\n');
    } else {
      console.log('   ❌ 事务内数据不可查询 (异常！)\n');
      await dbUtil.run('ROLLBACK');
      await dbUtil.close();
      return;
    }

    // 5. 回滚事务
    console.log('5. 回滚事务...');
    await dbUtil.run('ROLLBACK');
    console.log('   ✅ 事务已回滚\n');

    // 6. 开启新连接验证数据是否真的被删除
    console.log('6. 验证回滚效果 (开启新连接)...');
    await dbUtil.close();
    await dbUtil.init();

    const roleAfterRollback = await dbUtil.get('SELECT * FROM config_roles WHERE id = ?', [roleId]);
    const projectAfterRollback = await dbUtil.get('SELECT * FROM projects WHERE id = ?', [projectId]);

    if (!roleAfterRollback && !projectAfterRollback) {
      console.log('   ✅ 数据已被完全回滚 (事务方案有效！)\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ 验证通过：事务回滚方案可行！');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log('   ❌ 数据未被回滚 (事务方案无效！)\n');
      console.log('   role:', roleAfterRollback);
      console.log('   project:', projectAfterRollback);
    }

    // 7. 清理（保险起见）
    if (roleAfterRollback) {
      await dbUtil.run('DELETE FROM config_roles WHERE id = ?', [roleId]);
      console.log('   ⚠️  清理残留数据: role');
    }
    if (projectAfterRollback) {
      await dbUtil.run('DELETE FROM projects WHERE id = ?', [projectId]);
      console.log('   ⚠️  清理残留数据: project');
    }

  } catch (error) {
    console.error('❌ 验证失败:', error);
    console.error(error.stack);

    // 尝试回滚
    try {
      await dbUtil.run('ROLLBACK');
      console.log('   ⚠️  已回滚事务');
    } catch (_) {}

  } finally {
    await dbUtil.close();
    console.log('\n数据库连接已关闭');
  }
}

// 执行验证
testTransactionRollback();
