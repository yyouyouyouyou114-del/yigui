/**
 * 智能衣柜后端服务
 * 提供虚拟试穿 API，对接阿里云视觉智能服务
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
// 明确指定 .env 文件路径，确保从 backend 目录加载
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { virtualTryOn } = require('./services/aliyun-service');
const bailianService = require('./services/bailian-vton-service');
const { rateLimiter } = require('./middleware/rate-limiter');
const { initDatabase, testConnection } = require('./services/db');
const clothingService = require('./services/clothing-service');

const app = express();
const PORT = process.env.PORT || 3100;

// 配置文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 限制 20MB（支持高清示例图片）
  },
});

// CORS 配置
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));

app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '智能衣柜后端服务运行中' });
});

// 获取配置信息（不暴露敏感信息）
app.get('/api/config', (req, res) => {
  try {
    // 检查配置是否完整
    const hasConfig = !!(
      process.env.ALIYUN_BAILIAN_API_KEY &&
      process.env.ALIYUN_ACCESS_KEY_ID &&
      process.env.ALIYUN_ACCESS_KEY_SECRET &&
      process.env.OSS_BUCKET &&
      process.env.OSS_REGION
    );

    res.json({
      success: true,
      configured: hasConfig,
      config: {
        // 只返回非敏感信息
        bucket: process.env.OSS_BUCKET || '',
        region: process.env.OSS_REGION || '',
        // 不返回 API Key、AccessKey Secret 等敏感信息
        hasApiKey: !!process.env.ALIYUN_BAILIAN_API_KEY,
        hasAccessKey: !!process.env.ALIYUN_ACCESS_KEY_ID,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取配置失败',
    });
  }
});

// 百炼虚拟试穿 API（主要使用）
app.post(
  '/api/bailian-tryon',
  rateLimiter,
  upload.fields([
    { name: 'personImage', maxCount: 1 },
    { name: 'clothingImage', maxCount: 1 }, // 单件/兼容旧参数
    { name: 'topClothingImage', maxCount: 1 }, // 上下装-上装
    { name: 'bottomClothingImage', maxCount: 1 }, // 上下装-下装
  ]),
  async (req, res) => {
    try {
      console.log('收到百炼虚拟试穿请求');

      // 验证文件
      if (!req.files?.personImage) {
        return res.status(400).json({
          success: false,
          error: '缺少必要的图片文件',
        });
      }

      const personImage = req.files.personImage[0];
      const clothingImage = req.files?.clothingImage?.[0];
      const topClothingImage = req.files?.topClothingImage?.[0];
      const bottomClothingImage = req.files?.bottomClothingImage?.[0];
      const category = req.body.category || 'top';
      const mode = req.body.mode || 'separate'; // 'separate' | 'single'

      console.log('人物图片大小:', personImage.size);
      if (clothingImage) console.log('衣物图片大小:', clothingImage.size);
      if (topClothingImage) console.log('上装图片大小:', topClothingImage.size);
      if (bottomClothingImage) console.log('下装图片大小:', bottomClothingImage.size);
      console.log('衣物类别:', category);
      console.log('试穿模式:', mode);

      // 调用百炼服务
      const result = await bailianService.virtualTryOn({
        personImage: personImage.buffer,
        clothingImage: clothingImage?.buffer,
        topClothingImage: topClothingImage?.buffer,
        bottomClothingImage: bottomClothingImage?.buffer,
        category,
        mode,
      });

      console.log('准备返回给前端的结果:', JSON.stringify(result, null, 2));
      res.json(result);
    } catch (error) {
      console.error('百炼虚拟试穿失败:', error);
      res.status(500).json({
        success: false,
        error: error.message || '服务器内部错误',
      });
    }
  }
);

// 查询百炼任务结果
app.get('/api/bailian-tryon/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const result = await bailianService.getTaskResult(taskId);
    res.json(result);
  } catch (error) {
    console.error('查询任务失败:', error);
    res.status(500).json({
      success: false,
      error: '查询任务失败',
    });
  }
});

// 测试百炼连接
app.get('/api/test-connection', async (req, res) => {
  try {
    const result = await bailianService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '测试失败',
    });
  }
});

// 虚拟试穿 API（保留旧版本兼容）
app.post(
  '/api/virtual-tryon',
  rateLimiter,
  upload.fields([
    { name: 'personImage', maxCount: 1 },
    { name: 'clothingImage', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      console.log('收到虚拟试穿请求（旧版本）');

      // 验证文件
      if (!req.files?.personImage || !req.files?.clothingImage) {
        return res.status(400).json({
          success: false,
          error: '缺少必要的图片文件',
        });
      }

      const personImage = req.files.personImage[0];
      const clothingImage = req.files.clothingImage[0];
      const category = req.body.category || 'top';

      console.log('人物图片大小:', personImage.size);
      console.log('衣物图片大小:', clothingImage.size);
      console.log('衣物类别:', category);

      // 调用阿里云服务
      const result = await virtualTryOn({
        personImage: personImage.buffer,
        clothingImage: clothingImage.buffer,
        category,
      });

      res.json(result);
    } catch (error) {
      console.error('虚拟试穿失败:', error);
      res.status(500).json({
        success: false,
        error: error.message || '服务器内部错误',
      });
    }
  }
);

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: err.message || '服务器内部错误',
  });
});

// ==================== 衣物管理 API ====================

// 获取所有衣物
app.get('/api/clothing', async (req, res) => {
  try {
    const clothing = await clothingService.getAllClothing();
    res.json({
      success: true,
      data: clothing,
    });
  } catch (error) {
    console.error('获取衣物列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取衣物列表失败',
    });
  }
});

// 根据ID获取衣物
app.get('/api/clothing/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const clothing = await clothingService.getClothingById(id);
    
    if (!clothing) {
      return res.status(404).json({
        success: false,
        error: '衣物不存在',
      });
    }
    
    res.json({
      success: true,
      data: clothing,
    });
  } catch (error) {
    console.error('获取衣物失败:', error);
    res.status(500).json({
      success: false,
      error: '获取衣物失败',
    });
  }
});

// 获取衣物图片
app.get('/api/clothing/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    const imageInfo = await clothingService.getClothingImage(id);
    
    if (!imageInfo || !imageInfo.imageData) {
      return res.status(404).json({
        success: false,
        error: '图片不存在',
      });
    }
    
    // 设置响应头
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', imageInfo.imageData.length);
    res.send(imageInfo.imageData);
  } catch (error) {
    console.error('获取衣物图片失败:', error);
    res.status(500).json({
      success: false,
      error: '获取衣物图片失败',
    });
  }
});

// 添加衣物
app.post('/api/clothing', upload.single('image'), async (req, res) => {
  try {
    const {
      name,
      category,
      color,
      brand,
      price,
      seasons, // JSON 字符串数组
      tags,    // JSON 字符串数组
      occasions, // JSON 字符串数组
    } = req.body;

    // 验证必填字段
    if (!name || !category || !color) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段：名称、类别、颜色',
      });
    }

    // 解析 JSON 字段
    let seasonsArray = [];
    let tagsArray = [];
    let occasionsArray = [];

    try {
      seasonsArray = seasons ? JSON.parse(seasons) : [];
      tagsArray = tags ? JSON.parse(tags) : [];
      occasionsArray = occasions ? JSON.parse(occasions) : [];
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: 'JSON 字段格式错误',
      });
    }

    // 处理图片
    let imageData = null;
    if (req.file) {
      imageData = req.file.buffer;
    }

    const clothingData = {
      name,
      category,
      color,
      brand: brand || null,
      price: price ? parseFloat(price) : null,
      seasons: seasonsArray,
      tags: tagsArray,
      occasions: occasionsArray,
      imageData,
      imagePath: null, // 如果以后需要存储到文件系统或OSS，可以在这里设置
    };

    const id = await clothingService.addClothing(clothingData);

    res.json({
      success: true,
      data: { id },
      message: '衣物添加成功',
    });
  } catch (error) {
    console.error('添加衣物失败:', error);
    res.status(500).json({
      success: false,
      error: '添加衣物失败',
    });
  }
});

// 更新衣物
app.put('/api/clothing/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      color,
      brand,
      price,
      seasons,
      tags,
      occasions,
    } = req.body;

    // 解析 JSON 字段
    let seasonsArray = [];
    let tagsArray = [];
    let occasionsArray = [];

    try {
      seasonsArray = seasons ? JSON.parse(seasons) : [];
      tagsArray = tags ? JSON.parse(tags) : [];
      occasionsArray = occasions ? JSON.parse(occasions) : [];
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: 'JSON 字段格式错误',
      });
    }

    // 处理图片（如果上传了新图片）
    let imageData = null;
    if (req.file) {
      imageData = req.file.buffer;
    }

    const clothingData = {
      name,
      category,
      color,
      brand: brand || null,
      price: price ? parseFloat(price) : null,
      seasons: seasonsArray,
      tags: tagsArray,
      occasions: occasionsArray,
      imageData,
      imagePath: null,
    };

    await clothingService.updateClothing(id, clothingData);

    res.json({
      success: true,
      message: '衣物更新成功',
    });
  } catch (error) {
    console.error('更新衣物失败:', error);
    res.status(500).json({
      success: false,
      error: '更新衣物失败',
    });
  }
});

// 删除衣物
app.delete('/api/clothing/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await clothingService.deleteClothing(id);

    res.json({
      success: true,
      message: '衣物删除成功',
    });
  } catch (error) {
    console.error('删除衣物失败:', error);
    res.status(500).json({
      success: false,
      error: '删除衣物失败',
    });
  }
});

// 根据类别查询衣物
app.get('/api/clothing/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const clothing = await clothingService.getClothingByCategory(category);
    
    res.json({
      success: true,
      data: clothing,
    });
  } catch (error) {
    console.error('查询衣物失败:', error);
    res.status(500).json({
      success: false,
      error: '查询衣物失败',
    });
  }
});

// 根据季节查询衣物
app.get('/api/clothing/season/:season', async (req, res) => {
  try {
    const { season } = req.params;
    const clothing = await clothingService.getClothingBySeason(season);
    
    res.json({
      success: true,
      data: clothing,
    });
  } catch (error) {
    console.error('查询衣物失败:', error);
    res.status(500).json({
      success: false,
      error: '查询衣物失败',
    });
  }
});

// ==================== 数据库初始化 ====================

// 初始化数据库（仅在开发环境或手动调用）
app.post('/api/init-db', async (req, res) => {
  try {
    await initDatabase();
    res.json({
      success: true,
      message: '数据库初始化成功',
    });
  } catch (error) {
    console.error('数据库初始化失败:', error);
    res.status(500).json({
      success: false,
      error: '数据库初始化失败: ' + error.message,
    });
  }
});

// 测试数据库连接
app.get('/api/test-db', async (req, res) => {
  try {
    const connected = await testConnection();
    res.json({
      success: connected,
      message: connected ? '数据库连接正常' : '数据库连接失败',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '数据库连接测试失败: ' + error.message,
    });
  }
});

// 启动服务器
app.listen(PORT, async () => {
  console.log(`✅ 服务器启动成功: http://localhost:${PORT}`);
  console.log(`📝 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 阿里云 AccessKey: ${process.env.ALIYUN_ACCESS_KEY_ID ? '已配置' : '未配置'}`);
  
  // 自动初始化数据库
  try {
    console.log('🔧 正在初始化数据库...');
    await initDatabase();
    await testConnection();
  } catch (error) {
    console.error('⚠️  数据库初始化失败，请检查配置:', error.message);
    console.log('💡 提示：可以访问 POST /api/init-db 手动初始化数据库');
  }
});

