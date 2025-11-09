/**
 * 阿里云视觉智能服务封装
 * 使用阿里云 VIAPI 实现虚拟试穿
 */

const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');

// 阿里云配置
const ACCESS_KEY_ID = process.env.ALIYUN_ACCESS_KEY_ID;
const ACCESS_KEY_SECRET = process.env.ALIYUN_ACCESS_KEY_SECRET;

// API 端点
const SEGMENT_BODY_API = 'https://vision.cn-shanghai.aliyuncs.com/segment/SegmentBody';
const DETECT_BODY_API = 'https://vision.cn-shanghai.aliyuncs.com/body/DetectBodyCount';

/**
 * 生成阿里云 API 签名
 */
function generateSignature(params, method = 'POST') {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const stringToSign = `${method}&${encodeURIComponent('/')}&${encodeURIComponent(sortedParams)}`;
  const signature = crypto
    .createHmac('sha1', `${ACCESS_KEY_SECRET}&`)
    .update(stringToSign)
    .digest('base64');

  return signature;
}

/**
 * 调用阿里云人体分割 API
 * 用于抠出人物和背景
 */
async function segmentBody(imageBuffer) {
  try {
    console.log('调用阿里云人体分割 API...');

    const formData = new FormData();
    formData.append('ImageURL', ''); // 使用 ImageContent 时留空
    formData.append('ImageContent', imageBuffer.toString('base64'));

    const timestamp = new Date().toISOString();
    const params = {
      Format: 'JSON',
      Version: '2019-12-30',
      AccessKeyId: ACCESS_KEY_ID,
      SignatureMethod: 'HMAC-SHA1',
      Timestamp: timestamp,
      SignatureVersion: '1.0',
      SignatureNonce: Math.random().toString(),
      Action: 'SegmentBody',
    };

    params.Signature = generateSignature(params);

    const response = await axios.post(SEGMENT_BODY_API, formData, {
      params,
      headers: formData.getHeaders(),
      timeout: 30000,
    });

    console.log('人体分割成功');
    return response.data;
  } catch (error) {
    console.error('人体分割失败:', error.response?.data || error.message);
    throw new Error('人体分割失败');
  }
}

/**
 * 虚拟试穿主函数
 * 组合人体分割和图像处理实现试穿效果
 */
async function virtualTryOn({ personImage, clothingImage, category }) {
  try {
    console.log('开始处理虚拟试穿...');

    // 1. 分割人物图片（抠出人物）
    const segmentResult = await segmentBody(personImage);

    if (!segmentResult || !segmentResult.Data) {
      throw new Error('人体分割失败，未返回有效数据');
    }

    // 2. 获取分割后的图片（Base64）
    const segmentedImage = segmentResult.Data.ImageURL || segmentResult.Data.Elements?.[0]?.ImageURL;

    if (!segmentedImage) {
      throw new Error('未能获取分割后的图片');
    }

    // 3. 简单合成（这里可以做更复杂的处理）
    // 由于阿里云没有直接的虚拟试穿 API，我们返回分割后的数据
    // 前端可以使用这些数据进行进一步处理

    console.log('虚拟试穿处理完成');

    return {
      success: true,
      data: {
        segmentedPerson: segmentedImage, // 抠出的人物
        originalPerson: personImage.toString('base64'),
        clothing: clothingImage.toString('base64'),
        category,
        message: '人体分割成功，请在前端进行图像合成',
      },
    };
  } catch (error) {
    console.error('虚拟试穿处理失败:', error);
    return {
      success: false,
      error: error.message || '虚拟试穿失败',
    };
  }
}

/**
 * 测试阿里云连接
 */
async function testConnection() {
  try {
    if (!ACCESS_KEY_ID || !ACCESS_KEY_SECRET) {
      return {
        success: false,
        message: '阿里云 AccessKey 未配置',
      };
    }

    // 使用一个小的测试图片测试连接
    const testImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    
    await segmentBody(testImage);

    return {
      success: true,
      message: '阿里云连接正常',
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
  segmentBody,
  testConnection,
};

