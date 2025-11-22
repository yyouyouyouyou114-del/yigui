/**
 * MySQL 数据库连接服务
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Admin@123',
  database: process.env.DB_NAME || 'wardrobe_db',
  charset: 'utf8mb4',
  timezone: '+08:00',
  // 连接池配置
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// 创建连接池
let pool = null;

/**
 * 获取数据库连接池
 */
function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    console.log('✅ MySQL 连接池已创建');
  }
  return pool;
}

/**
 * 测试数据库连接
 */
async function testConnection() {
  try {
    const connection = await getPool().getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ MySQL 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ MySQL 数据库连接失败:', error.message);
    return false;
  }
}

/**
 * 执行查询
 */
async function query(sql, params = []) {
  try {
    const [results] = await getPool().execute(sql, params);
    return results;
  } catch (error) {
    console.error('数据库查询错误:', error);
    throw error;
  }
}

/**
 * 执行事务
 */
async function transaction(callback) {
  const connection = await getPool().getConnection();
  await connection.beginTransaction();
  
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 初始化数据库（创建数据库和表）
 */
async function initDatabase() {
  try {
    // 先连接到 MySQL（不指定数据库）
    const adminConfig = {
      ...dbConfig,
      database: undefined, // 不指定数据库，连接到 MySQL 服务器
    };
    const adminPool = mysql.createPool(adminConfig);
    
    const dbName = dbConfig.database;
    
    // 创建数据库（如果不存在）- 使用query而不是execute
    const [createDbResult] = await adminPool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ 数据库 ${dbName} 已创建或已存在`);
    
    // 关闭管理连接池
    await adminPool.end();
    
    // 使用目标数据库创建新的连接池
    const targetPool = mysql.createPool(dbConfig);
    
    // 创建衣物表
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS \`clothing\` (
        \`id\` VARCHAR(50) PRIMARY KEY COMMENT '衣物ID',
        \`name\` VARCHAR(200) NOT NULL COMMENT '衣物名称',
        \`category\` VARCHAR(50) NOT NULL COMMENT '类别',
        \`color\` VARCHAR(50) NOT NULL COMMENT '颜色',
        \`brand\` VARCHAR(100) DEFAULT NULL COMMENT '品牌',
        \`price\` DECIMAL(10, 2) DEFAULT NULL COMMENT '价格',
        \`seasons\` JSON NOT NULL COMMENT '适用季节（JSON数组）',
        \`tags\` JSON DEFAULT NULL COMMENT '标签（JSON数组）',
        \`occasions\` JSON NOT NULL COMMENT '适用场合（JSON数组）',
        \`image_path\` VARCHAR(500) DEFAULT NULL COMMENT '图片存储路径',
        \`image_data\` LONGBLOB DEFAULT NULL COMMENT '图片二进制数据',
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX \`idx_category\` (\`category\`),
        INDEX \`idx_color\` (\`color\`),
        INDEX \`idx_created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='衣物信息表';
    `;
    
    await targetPool.query(createTableSQL);
    console.log('✅ 衣物表 clothing 已创建或已存在');
    
    // 关闭临时连接池
    await targetPool.end();
    
    // 重新初始化主连接池（使用目标数据库）
    pool = mysql.createPool(dbConfig);
    
    return true;
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  }
}

module.exports = {
  getPool,
  testConnection,
  query,
  transaction,
  initDatabase,
};

