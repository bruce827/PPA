#!/usr/bin/env node

const path = require('path');

const db = require('../utils/db');
const biddingSiteModel = require('../models/biddingSiteModel');
const biddingSiteService = require('../services/biddingSiteService');

const biddingSites = require('./bidding-sites.data');

async function run() {
  const dbPath = path.join(__dirname, '..', 'ppa.db');
  console.log('开始初始化招标网站默认数据...');
  console.log('数据库路径:', dbPath);

  try {
    await db.init(dbPath);
    await biddingSiteModel.ensureSchema();

    let processed = 0;
    for (const site of biddingSites) {
      await biddingSiteService.upsertSeedSite(site);
      processed += 1;
    }

    console.log(`✅ 招标网站默认数据初始化完成，共处理 ${processed} 条记录`);
  } catch (error) {
    console.error('❌ 初始化招标网站失败:', error.message);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

run();
