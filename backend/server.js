/**
 * 智能衣柜后端服务
 * 提供虚拟试穿 API，对接阿里云视觉智能服务
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const { virtualTryOn } = require('./services/aliyun-service');
const bailianService = require('./services/bailian-vton-service');
const { rateLimiter } = require('./middleware/rate-limiter');

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

// 启动服务器
app.listen(PORT, () => {
  console.log(`✅ 服务器启动成功: http://localhost:${PORT}`);
  console.log(`📝 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 阿里云 AccessKey: ${process.env.ALIYUN_ACCESS_KEY_ID ? '已配置' : '未配置'}`);
});

