/**
 * 后端 API 调用服务
 * 所有配置都在后端，前端无需管理敏感信息
 */

const BACKEND_URL = 'http://localhost:3100';

/**
 * 统一的错误处理
 */
function handleBackendError(error: any, context: string): never {
  console.error(`${context} 失败:`, error);
  
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    throw new Error('无法连接到后端服务器，请确认后端服务已启动（端口3100）');
  }
  
  if (error instanceof Error) {
    throw error;
  }
  
  throw new Error(`${context}失败`);
}

/**
 * 测试后端连接
 */
export async function testBackendConnection() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/test-connection`, {
      signal: AbortSignal.timeout(10000), // 10秒超时
    });
    const data = await response.json();
    return data;
  } catch (error) {
    handleBackendError(error, '测试连接');
  }
}

/**
 * 获取配置状态
 */
export async function getConfigStatus() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/config`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取配置失败:', error);
    return {
      success: false,
      configured: false,
    };
  }
}

/**
 * 虚拟试穿（通过后端调用百炼AI）
 */
export async function virtualTryOn(
  personImage: File,
  clothingImage: File,
  category: string,
  mode: 'separate' | 'single' = 'separate',
  extra?: {
    topClothingImage?: File;
    bottomClothingImage?: File;
  }
) {
  try {
    const formData = new FormData();
    formData.append('personImage', personImage);
    formData.append('clothingImage', clothingImage);
    formData.append('category', category);
    formData.append('mode', mode);

    // 可选：上下装两件同时传输
    if (extra?.topClothingImage) {
      formData.append('topClothingImage', extra.topClothingImage);
    }
    if (extra?.bottomClothingImage) {
      formData.append('bottomClothingImage', extra.bottomClothingImage);
    }

    console.log('发送虚拟试穿请求到后端...');

    const response = await fetch(`${BACKEND_URL}/api/bailian-tryon`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('后端响应:', data);

    return data;
  } catch (error) {
    console.error('虚拟试穿失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '虚拟试穿失败',
    };
  }
}

/**
 * 查询任务结果
 */
export async function getTaskResult(taskId: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/bailian-tryon/${taskId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('查询任务失败:', error);
    return {
      success: false,
      error: '查询任务失败',
    };
  }
}

/**
 * 轮询任务结果直到完成
 */
export async function pollTaskResult(
  taskId: string,
  maxAttempts = 30,
  interval = 2000
): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await getTaskResult(taskId);

    if (result.success && result.status === 'completed') {
      return result;
    }

    if (!result.success || result.status === 'failed') {
      throw new Error(result.error || '任务失败');
    }

    // 等待一段时间后继续查询
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('任务超时');
}


