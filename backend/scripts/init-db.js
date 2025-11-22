/**
 * 数据库初始化脚本
 * 用于手动初始化数据库和表结构
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { initDatabase, testConnection } = require('../services/db');

async function main() {
  console.log('🚀 开始初始化数据库...\n');
  
  try {
    // 初始化数据库
    await initDatabase();
    console.log('\n✅ 数据库初始化完成！\n');
    
    // 测试连接
    console.log('🔍 测试数据库连接...');
    const connected = await testConnection();
    
    if (connected) {
      console.log('✅ 数据库连接测试成功！\n');
      console.log('📊 数据库信息:');
      console.log(`   数据库名: ${process.env.DB_NAME || 'wardrobe_db'}`);
      console.log(`   主机: ${process.env.DB_HOST || 'localhost'}`);
      console.log(`   端口: ${process.env.DB_PORT || 3306}`);
      console.log(`   用户: ${process.env.DB_USER || 'root'}\n`);
      process.exit(0);
    } else {
      console.log('❌ 数据库连接测试失败！\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    console.error('\n请检查:');
    console.error('1. MySQL 服务是否启动');
    console.error('2. 数据库配置是否正确（.env 文件）');
    console.error('3. 用户权限是否足够\n');
    process.exit(1);
  }
}

main();

