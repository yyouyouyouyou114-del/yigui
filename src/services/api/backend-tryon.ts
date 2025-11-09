/**
 * 后端 API 虚拟试穿服务
 * 调用百度服务器上的 Node.js 后端，使用阿里云 VIAPI
 */

interface BackendTryOnRequest {
  personImage: Blob;
  clothingImage: Blob;
  category: string;
}

interface BackendTryOnResult {
  success: boolean;
  resultImage?: Blob;
  error?: string;
  remainingCalls?: number;
}

// 后端 API 地址（可配置）
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3100';

/**
 * 调用后端 API 进行虚拟试穿
 */
export async function backendVirtualTryOn(
  request: BackendTryOnRequest
): Promise<BackendTryOnResult> {
  try {
    console.log('调用后端 API 进行虚拟试穿...');

    // 创建 FormData
    const formData = new FormData();
    formData.append('personImage', request.personImage);
    formData.append('clothingImage', request.clothingImage);
    formData.append('category', request.category);

    // 调用后端 API
    const response = await fetch(`${API_BASE_URL}/api/virtual-tryon`, {
      method: 'POST',
      body: formData,
    });

    // 获取剩余调用次数
    const remainingCalls = parseInt(response.headers.get('X-RateLimit-Remaining') || '0');

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    if (!data.success) {
      throw new Error(data.error || '后端处理失败');
    }

    // 将 Base64 图片转换为 Blob
    // 注意：阿里云返回的是人体分割结果，还需要前端进行进一步合成
    const segmentedImage = data.data.segmentedPerson;
    const imageBlob = await base64ToBlob(segmentedImage);

    console.log('后端 API 调用成功，剩余次数:', remainingCalls);

    return {
      success: true,
      resultImage: imageBlob,
      remainingCalls,
    };
  } catch (error) {
    console.error('后端 API 调用失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 测试后端 API 连接
 */
export async function testBackendConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.status === 'ok';
  } catch (error) {
    console.error('后端连接测试失败:', error);
    return false;
  }
}

/**
 * 将 Base64 字符串转换为 Blob
 */
async function base64ToBlob(base64: string): Promise<Blob> {
  // 移除 data:image/... 前缀（如果有）
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  
  // 解码 Base64
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: 'image/png' });
}

/**
 * 获取 API 配置（从环境变量）
 */
export function getApiConfig() {
  return {
    baseUrl: API_BASE_URL,
    enabled: import.meta.env.VITE_ENABLE_BACKEND_API === 'true',
  };
}

