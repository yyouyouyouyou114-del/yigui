/**
 * 衣物数据服务
 */

const { query, transaction } = require('./db');

/**
 * 生成唯一ID
 */
function generateId() {
  return `clothing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 添加衣物
 */
async function addClothing(clothingData) {
  const {
    name,
    category,
    color,
    brand = null,
    price = null,
    seasons = [],
    tags = [],
    occasions = [],
    imageData = null,
    imagePath = null,
  } = clothingData;

  const id = generateId();
  const now = new Date();

  const sql = `
    INSERT INTO clothing (
      id, name, category, color, brand, price,
      seasons, tags, occasions, image_path, image_data,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    id,
    name,
    category,
    color,
    brand,
    price,
    JSON.stringify(seasons),
    JSON.stringify(tags),
    JSON.stringify(occasions),
    imagePath,
    imageData,
    now,
    now,
  ];

  await query(sql, params);
  return id;
}

/**
 * 获取所有衣物
 */
async function getAllClothing() {
  const sql = `
    SELECT 
      id, name, category, color, brand, price,
      seasons, tags, occasions, image_path,
      created_at, updated_at
    FROM clothing
    ORDER BY created_at DESC
  `;

  const results = await query(sql);
  
  // 解析 JSON 字段
  return results.map(item => ({
    ...item,
    seasons: JSON.parse(item.seasons || '[]'),
    tags: JSON.parse(item.tags || '[]'),
    occasions: JSON.parse(item.occasions || '[]'),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
}

/**
 * 根据ID获取衣物
 */
async function getClothingById(id) {
  const sql = `
    SELECT 
      id, name, category, color, brand, price,
      seasons, tags, occasions, image_path, image_data,
      created_at, updated_at
    FROM clothing
    WHERE id = ?
  `;

  const results = await query(sql, [id]);
  if (results.length === 0) {
    return null;
  }

  const item = results[0];
  return {
    ...item,
    seasons: JSON.parse(item.seasons || '[]'),
    tags: JSON.parse(item.tags || '[]'),
    occasions: JSON.parse(item.occasions || '[]'),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

/**
 * 获取衣物图片数据
 */
async function getClothingImage(id) {
  const sql = `
    SELECT image_data, image_path
    FROM clothing
    WHERE id = ?
  `;

  const results = await query(sql, [id]);
  if (results.length === 0) {
    return null;
  }

  return {
    imageData: results[0].image_data,
    imagePath: results[0].image_path,
  };
}

/**
 * 更新衣物信息
 */
async function updateClothing(id, clothingData) {
  const {
    name,
    category,
    color,
    brand = null,
    price = null,
    seasons = [],
    tags = [],
    occasions = [],
    imageData = null,
    imagePath = null,
  } = clothingData;

  const sql = `
    UPDATE clothing
    SET 
      name = ?,
      category = ?,
      color = ?,
      brand = ?,
      price = ?,
      seasons = ?,
      tags = ?,
      occasions = ?,
      image_path = ?,
      image_data = ?,
      updated_at = ?
    WHERE id = ?
  `;

  const params = [
    name,
    category,
    color,
    brand,
    price,
    JSON.stringify(seasons),
    JSON.stringify(tags),
    JSON.stringify(occasions),
    imagePath,
    imageData,
    new Date(),
    id,
  ];

  await query(sql, params);
  return id;
}

/**
 * 删除衣物
 */
async function deleteClothing(id) {
  const sql = `DELETE FROM clothing WHERE id = ?`;
  await query(sql, [id]);
  return true;
}

/**
 * 根据类别查询衣物
 */
async function getClothingByCategory(category) {
  const sql = `
    SELECT 
      id, name, category, color, brand, price,
      seasons, tags, occasions, image_path,
      created_at, updated_at
    FROM clothing
    WHERE category = ?
    ORDER BY created_at DESC
  `;

  const results = await query(sql, [category]);
  
  return results.map(item => ({
    ...item,
    seasons: JSON.parse(item.seasons || '[]'),
    tags: JSON.parse(item.tags || '[]'),
    occasions: JSON.parse(item.occasions || '[]'),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
}

/**
 * 根据季节查询衣物
 */
async function getClothingBySeason(season) {
  const sql = `
    SELECT 
      id, name, category, color, brand, price,
      seasons, tags, occasions, image_path,
      created_at, updated_at
    FROM clothing
    WHERE JSON_CONTAINS(seasons, ?)
    ORDER BY created_at DESC
  `;

  const results = await query(sql, [JSON.stringify(season)]);
  
  return results.map(item => ({
    ...item,
    seasons: JSON.parse(item.seasons || '[]'),
    tags: JSON.parse(item.tags || '[]'),
    occasions: JSON.parse(item.occasions || '[]'),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
}

module.exports = {
  addClothing,
  getAllClothing,
  getClothingById,
  getClothingImage,
  updateClothing,
  deleteClothing,
  getClothingByCategory,
  getClothingBySeason,
};

