/**
 * 查看MySQL数据库内容
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Admin@123',
  charset: 'utf8mb4',
};

async function main() {
  try {
    console.log('🔍 正在连接MySQL数据库...\n');
    
    // 连接到MySQL（不指定数据库）
    const connection = await mysql.createConnection(dbConfig);
    
    // 1. 查看所有数据库
    console.log('📊 数据库列表：');
    console.log('='.repeat(50));
    const [databases] = await connection.query('SHOW DATABASES');
    databases.forEach(db => {
      const dbName = db.Database;
      const isProtected = dbName === 'hanzi_db' || dbName === 'tangshi_db';
      const isWardrobe = dbName === 'wardrobe_db';
      const marker = isProtected ? '🔒' : isWardrobe ? '✅' : '  ';
      console.log(`${marker} ${dbName}`);
    });
    console.log('='.repeat(50));
    console.log('🔒 = 受保护数据库（请勿修改）');
    console.log('✅ = 衣柜数据库\n');
    
    // 2. 查看wardrobe_db数据库中的表
    console.log('📋 wardrobe_db 数据库中的表：');
    console.log('='.repeat(50));
    await connection.query('USE `wardrobe_db`');
    const [tables] = await connection.query('SHOW TABLES');
    if (tables.length === 0) {
      console.log('  （暂无表）\n');
    } else {
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`  ✅ ${tableName}`);
      });
      console.log('='.repeat(50) + '\n');
    }
    
    // 3. 查看clothing表的结构
    if (tables.length > 0 && tables.some(t => Object.values(t)[0] === 'clothing')) {
      console.log('📐 clothing 表结构：');
      console.log('='.repeat(50));
      const [columns] = await connection.query('DESCRIBE `clothing`');
      console.table(columns);
      console.log('='.repeat(50) + '\n');
      
      // 4. 查看clothing表中的数据
      console.log('👔 clothing 表中的数据：');
      console.log('='.repeat(50));
      const [clothing] = await connection.query(`
        SELECT 
          id, name, category, color, brand, price,
          JSON_PRETTY(seasons) as seasons,
          JSON_PRETTY(tags) as tags,
          JSON_PRETTY(occasions) as occasions,
          CASE 
            WHEN image_data IS NOT NULL THEN CONCAT('有图片 (', LENGTH(image_data), ' bytes)')
            ELSE '无图片'
          END as image_info,
          created_at, updated_at
        FROM clothing
        ORDER BY created_at DESC
      `);
      
      if (clothing.length === 0) {
        console.log('  （暂无数据）\n');
      } else {
        console.log(`  共 ${clothing.length} 条记录：\n`);
        clothing.forEach((item, index) => {
          console.log(`  [${index + 1}] ${item.name}`);
          console.log(`       ID: ${item.id}`);
          console.log(`       类别: ${item.category}`);
          console.log(`       颜色: ${item.color}`);
          if (item.brand) console.log(`       品牌: ${item.brand}`);
          if (item.price) console.log(`       价格: ¥${item.price}`);
          console.log(`       适用季节: ${item.seasons}`);
          if (item.tags) console.log(`       标签: ${item.tags}`);
          console.log(`       适用场合: ${item.occasions}`);
          console.log(`       图片: ${item.image_info}`);
          console.log(`       创建时间: ${item.created_at}`);
          console.log(`       更新时间: ${item.updated_at}`);
          console.log('');
        });
      }
      console.log('='.repeat(50) + '\n');
    }
    
    // 5. 统计信息
    if (tables.length > 0 && tables.some(t => Object.values(t)[0] === 'clothing')) {
      const [stats] = await connection.query(`
        SELECT 
          COUNT(*) as total_count,
          COUNT(DISTINCT category) as category_count,
          COUNT(DISTINCT color) as color_count,
          SUM(CASE WHEN image_data IS NOT NULL THEN 1 ELSE 0 END) as with_image_count
        FROM clothing
      `);
      
      console.log('📈 统计信息：');
      console.log('='.repeat(50));
      console.log(`  总衣物数: ${stats[0].total_count}`);
      console.log(`  类别数: ${stats[0].category_count}`);
      console.log(`  颜色数: ${stats[0].color_count}`);
      console.log(`  有图片的衣物: ${stats[0].with_image_count}`);
      console.log('='.repeat(50) + '\n');
    }
    
    await connection.end();
    console.log('✅ 查询完成！');
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    process.exit(1);
  }
}

main();

