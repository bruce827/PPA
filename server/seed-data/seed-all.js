#!/usr/bin/env node

/**
 * 一键初始化所有基础数据
 * 按顺序运行所有数据初始化脚本
 */

const { spawn } = require('child_process');
const path = require('path');

// 需要运行的脚本列表
const scripts = [
  'seed-roles.js',
  'seed-travel-costs.js',
  'seed-ai-prompts.js',
  'seed-web3d.js',
  // 'seed-risk-items.js', // 暂时注释，等待创建
];

// 运行单个脚本
function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`▶️  正在运行: ${scriptName}`);
    console.log('='.repeat(60));
    
    const scriptPath = path.join(__dirname, scriptName);
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: __dirname,
    });
    
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${scriptName} 执行失败，退出码: ${code}`));
      } else {
        console.log(`✅ ${scriptName} 执行成功`);
        resolve();
      }
    });
    
    child.on('error', (err) => {
      reject(err);
    });
  });
}

// 主函数
async function runAllScripts() {
  console.log('\n🚀 开始初始化所有基础数据...\n');
  
  try {
    for (const script of scripts) {
      await runScript(script);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 所有数据初始化完成！');
    console.log('='.repeat(60));
    console.log(`\n共执行了 ${scripts.length} 个初始化脚本。\n`);
    
  } catch (error) {
    console.error('\n❌ 初始化过程中出现错误:');
    console.error(error.message);
    process.exit(1);
  }
}

// 运行
runAllScripts();
