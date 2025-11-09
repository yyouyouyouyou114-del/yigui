/**
 * 图像分割服务 - 智能抠图
 * 使用 @imgly/background-removal 实现纯前端背景移除
 * 如果失败则使用简单的 Canvas 方案作为备用
 */

import { removeBackground, Config } from '@imgly/background-removal';
import { removeBackgroundSimple } from './simple-background-removal';

/**
 * 移除图片背景（智能抠图）
 * @param imageFile 原始图片文件
 * @param useSimple 是否直接使用简单方案
 * @returns 抠图后的 Blob (PNG格式，带透明通道)
 */
export async function removeImageBackground(
  imageFile: File,
  useSimple: boolean = false
): Promise<Blob> {
  // 如果指定使用简单方案，直接使用
  if (useSimple) {
    console.log('使用简单抠图方案...');
    return removeBackgroundSimple(imageFile);
  }

  try {
    console.log('开始 AI 智能抠图...文件大小:', (imageFile.size / 1024).toFixed(2), 'KB');
    console.log('⏳ 首次使用需要下载 AI 模型（约15MB），请稍候...');
    
    // 简化配置，让库自动处理资源路径
    const config: Config = {
      debug: false,
      progress: (key, current, total) => {
        const percent = ((current / total) * 100).toFixed(1);
        console.log(`📥 ${key}: ${percent}%`);
      },
    };
    
    // 执行背景移除
    const blob = await removeBackground(imageFile, config);
    
    console.log('✅ AI 智能抠图完成，结果大小:', (blob.size / 1024).toFixed(2), 'KB');
    return blob;
  } catch (error) {
    console.error('❌ AI 抠图失败，尝试使用备用方案:', error);
    
    // 使用简单方案作为备用
    try {
      console.log('🔄 切换到简单抠图方案...');
      const blob = await removeBackgroundSimple(imageFile, 60);
      console.log('✅ 简单抠图完成（提示：此方案适用于纯色背景）');
      return blob;
    } catch (simpleError) {
      console.error('❌ 简单抠图也失败了:', simpleError);
      
      // 提供更详细的错误信息
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error('网络连接失败，无法下载 AI 模型。请检查网络连接后重试。');
        } else if (error.message.includes('model')) {
          throw new Error('AI 模型加载失败。请刷新页面或检查网络连接。');
        }
        throw new Error(`抠图失败: ${error.message}`);
      }
      
      throw new Error('抠图功能暂时不可用，请稍后重试');
    }
  }
}

/**
 * 将 Blob 转换为 File
 * @param blob Blob 对象
 * @param fileName 文件名
 * @returns File 对象
 */
export function blobToFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, { type: blob.type });
}

/**
 * 创建图片预览 URL
 * @param blob Blob 对象
 * @returns 预览 URL
 */
export function createPreviewURL(blob: Blob): string {
  return URL.createObjectURL(blob);
}
