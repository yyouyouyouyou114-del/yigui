/**
 * 阿里云百炼 AI试衣服务
 * 使用百炼虚拟试穿模型
 */

const axios = require('axios');
const OSS = require('ali-oss');

// 从环境变量读取配置
const BAILIAN_API_KEY = process.env.ALIYUN_BAILIAN_API_KEY;
const OSS_BUCKET = process.env.OSS_BUCKET;
const OSS_REGION = process.env.OSS_REGION;
const OSS_ACCESS_KEY_ID = process.env.ALIYUN_ACCESS_KEY_ID;
const OSS_ACCESS_KEY_SECRET = process.env.ALIYUN_ACCESS_KEY_SECRET;

// 百炼 API 端点（AI试衣-基础版）
// 文档：image2image/image-synthesis + model: aitryon
const BAILIAN_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis';

/**
 * 初始化 OSS 客户端
 */
function createOSSClient() {
  if (!OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET || !OSS_BUCKET || !OSS_REGION) {
    throw new Error('OSS 配置不完整');
  }

  return new OSS({
    region: OSS_REGION,
    accessKeyId: OSS_ACCESS_KEY_ID,
    accessKeySecret: OSS_ACCESS_KEY_SECRET,
    bucket: OSS_BUCKET,
    secure: true, // 强制使用 HTTPS
  });
}

/**
 * 上传图片到 OSS（带重试机制）
 */
async function uploadToOSS(buffer, filename, retries = 3) {
  const client = createOSSClient();
  const objectName = `tryon/${Date.now()}-${filename}`;
  
  console.log(`上传图片到 OSS: ${objectName}`);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // 上传文件并设置为公共读，这样百炼API就能直接访问
      const putResult = await client.put(objectName, buffer, {
        headers: {
          'x-oss-object-acl': 'public-read', // 设置文件为公共可读
        },
        timeout: 60000, // 60秒超时
      });

      // 由于文件已设置为public-read，直接使用公共URL（不需要签名）
      // 这样百炼API就能稳定访问，不会出现403错误
      const publicUrl = `https://${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com/${objectName}`;
      
      console.log(`上传成功，公共URL: ${publicUrl}`);

      return publicUrl;
    } catch (error) {
      console.error(`OSS 上传失败（尝试 ${attempt}/${retries}）:`, error.message);
      
      if (attempt === retries) {
        // 最后一次尝试失败，抛出错误
        throw new Error(`OSS 上传失败（已重试${retries}次）: ${error.message}`);
      }
      
      // 等待后重试（指数退避）
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`等待 ${waitTime}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// 检查签名 URL 是否可从公网访问（用于定位 url error）
async function ensureReachable(url) {
  try {
    const headResp = await axios.head(url, { timeout: 8000, validateStatus: () => true });
    console.log('URL 可达性检查:', url, headResp.status);
    return headResp.status >= 200 && headResp.status < 400;
  } catch (e) {
    console.warn('URL 可达性检查失败:', url, e.message);
    return false;
  }
}

/**
 * 调用百炼虚拟试穿 API
 */
async function virtualTryOn({ personImage, clothingImage, topClothingImage, bottomClothingImage, category, mode = 'separate' }) {
  try {
    console.log('开始百炼虚拟试穿...');

    // 1. 上传图片到 OSS
    console.log('上传人物图片到 OSS...');
    const personUrl = await uploadToOSS(personImage, 'person.jpg');
    
    let clothingUrl;
    let topUrl;
    let bottomUrl;

    if (mode === 'separate' && topClothingImage && bottomClothingImage) {
      console.log('上传上装图片到 OSS...');
      topUrl = await uploadToOSS(topClothingImage, 'top.jpg');
      console.log('上传下装图片到 OSS...');
      bottomUrl = await uploadToOSS(bottomClothingImage, 'bottom.jpg');
    } else if (clothingImage) {
      console.log('上传衣物图片到 OSS...');
      clothingUrl = await uploadToOSS(clothingImage, 'clothing.jpg');
    } else {
      throw new Error('缺少衣物图片');
    }

    // 额外可达性校验日志（帮助定位 URL 问题）
    await ensureReachable(personUrl);
    if (clothingUrl) await ensureReachable(clothingUrl);
    if (topUrl) await ensureReachable(topUrl);
    if (bottomUrl) await ensureReachable(bottomUrl);

    // 2. 调用百炼 API（AI试衣-基础版）
    console.log('调用百炼 API...');

    // 根据类别决定上装/下装
    const isTop =
      !category ||
      category === 'top' ||
      category === 'outerwear' ||
      category === 'dress';

    // 依据实际可用的 URL 来组装 input，更健壮：
    // 生成 input：优先 top/bottom；单件模式按类别映射到 top/bottom（aitryon 对 garment_image_url 兼容性较差）
    let input = {
      person_image_url: personUrl,
      ...(topUrl ? { top_garment_url: topUrl } : {}),
      ...(bottomUrl ? { bottom_garment_url: bottomUrl } : {}),
    };

    if (!topUrl && !bottomUrl && clothingUrl) {
      const treatAsTop =
        !category ||
        category === 'top' ||
        category === 'outerwear' ||
        category === 'dress';
      input = {
        ...input,
        ...(treatAsTop ? { top_garment_url: clothingUrl } : { bottom_garment_url: clothingUrl }),
      };
      // 如果未来确认 aitryon 支持 garment_image_url，可改为：{ garment_image_url: clothingUrl }
    }

    // 二次校验，至少有一件衣物
    if (!input.garment_image_url && !input.top_garment_url && !input.bottom_garment_url) {
      throw new Error('缺少衣物图片（单件或上下装至少一件）');
    }

    const payload = {
      model: 'aitryon',
      input,
      parameters: {
        resolution: -1, // 保持原图尺寸
        restore_face: true,
      },
    };

    // 发送请求（带重试策略：字段名不兼容时尝试替代字段）
    const tryCall = async (endpoint, body, tag) => {
      try {
        console.log(`发送到 DashScope [${tag}] -> ${endpoint}`);
        // 避免打印真实 URL
        console.log('请求体(隐藏URL)：', {
          ...body,
          input: Object.fromEntries(
            Object.entries(body.input).map(([k, v]) => [k, typeof v === 'string' ? '***' : v])
          ),
        });
        const resp = await axios.post(endpoint, body, {
          headers: {
            Authorization: `Bearer ${BAILIAN_API_KEY}`,
            'Content-Type': 'application/json',
            'X-DashScope-Async': 'enable',
          },
          timeout: 60000,
        });
        return resp;
      } catch (err) {
        const data = err.response?.data;
        console.error(`DashScope 返回错误 [${tag}]`, data || err.message);
        throw err;
      }
    };

    let response;
    try {
      // A: 标准用法（aitryon + top/bottom）
      response = await tryCall(BAILIAN_API_URL, payload, 'A-aitryon-top/bottom');
    } catch (eA) {
      const code = eA.response?.data?.code || '';
      const msg = (eA.response?.data?.message || '').toLowerCase();
      if (String(code).includes('InvalidParameter') || msg.includes('url')) {
        // B: 不分上/下装，统一 garment_image_url
        const payloadB = {
          model: 'aitryon',
          input: {
            person_image_url: personUrl,
            garment_image_url: clothingUrl,
          },
          parameters: {
            resolution: -1,
            restore_face: true,
          },
        };
        try {
          response = await tryCall(BAILIAN_API_URL, payloadB, 'B-aitryon-garment_image_url');
        } catch (eB) {
          const codeB = eB.response?.data?.code || '';
          const msgB = (eB.response?.data?.message || '').toLowerCase();
          if (String(codeB).includes('InvalidParameter') || msgB.includes('url')) {
            // C: 旧接口 + wanx-v1 + human_image_url/cloth_image_url
            const FALLBACK_ENDPOINT = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/virtualtryon/virtual-try-on';
            const payloadC = {
              model: 'wanx-v1',
              input: {
                human_image_url: personUrl,
                cloth_image_url: clothingUrl,
              },
            };
            response = await tryCall(FALLBACK_ENDPOINT, payloadC, 'C-virtual-try-on-wanx');
          } else {
            throw eB;
          }
        }
      } else {
        throw eA;
      }
    }

    console.log('百炼 API 响应:', JSON.stringify(response.data, null, 2));

    // 3. 处理响应
    if (response.data.output && response.data.output.task_id) {
      // 异步模式：返回任务 ID
      return {
        success: true,
        taskId: response.data.output.task_id,
        status: 'processing',
        message: '任务已提交，正在处理中...',
      };
    } else if (response.data.output && response.data.output.image_url) {
      // 同步模式：直接返回结果
      return {
        success: true,
        resultUrl: response.data.output.image_url,
        status: 'completed',
        message: '试穿成功',
      };
    } else {
      throw new Error('API 响应格式异常');
    }
  } catch (error) {
    console.error('百炼虚拟试穿失败:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message || '虚拟试穿失败',
    };
  }
}

/**
 * 查询异步任务结果
 */
async function getTaskResult(taskId) {
  try {
    const response = await axios.get(
      `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${BAILIAN_API_KEY}`,
        },
        timeout: 10000,
      }
    );

    const task = response.data.output || {};
    
    if (task.task_status === 'SUCCEEDED') {
      // 兼容不同返回结构：优先 image_url，其次 results[0].url
      const imageUrl = task.image_url || (Array.isArray(task.results) && task.results[0] && task.results[0].url);
      if (!imageUrl) {
        return {
          success: false,
          status: 'failed',
          error: '任务成功但未返回图片URL',
        };
      }
      return {
        success: true,
        status: 'completed',
        resultUrl: imageUrl,
      };
    } else if (task.task_status === 'FAILED') {
      return {
        success: false,
        status: 'failed',
        error: task.message || '任务失败',
      };
    } else {
      return {
        success: true,
        status: 'processing',
        message: '任务处理中...',
      };
    }
  } catch (error) {
    console.error('查询任务失败:', error.response?.data || error.message);
    return {
      success: false,
      error: '查询任务失败',
    };
  }
}

/**
 * 测试配置是否正确
 */
async function testConnection() {
  try {
    if (!BAILIAN_API_KEY) {
      return {
        success: false,
        message: '百炼 API Key 未配置',
      };
    }

    if (!OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET || !OSS_BUCKET || !OSS_REGION) {
      return {
        success: false,
        message: 'OSS 配置不完整',
      };
    }

    // 测试 OSS 连接
    const client = createOSSClient();
    await client.list({ 'max-keys': 1 });

    return {
      success: true,
      message: '配置正确，连接成功',
    };
  } catch (error) {
    return {
      success: false,
      message: `连接失败: ${error.message}`,
    };
  }
}

module.exports = {
  virtualTryOn,
  getTaskResult,
  testConnection,
};

