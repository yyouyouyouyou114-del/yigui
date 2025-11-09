/**
 * 虚拟试穿 API 集成
 * 支持多种第三方服务
 */

import { VirtualTryOnConfig } from '@/types';

export interface TryOnRequest {
  personImage: Blob;
  clothingImage: Blob;
  options?: {
    category?: string;
    autoMask?: boolean;
  };
}

export interface TryOnResult {
  success: boolean;
  resultImage?: Blob;
  error?: string;
  processingTime?: number;
}

/**
 * 虚拟试穿服务基类
 */
abstract class VirtualTryOnService {
  constructor(protected config: VirtualTryOnConfig) {}

  abstract tryOn(request: TryOnRequest): Promise<TryOnResult>;
  
  abstract testConnection(): Promise<boolean>;
}

/**
 * 自定义 API 服务
 */
class CustomAPIService extends VirtualTryOnService {
  async tryOn(request: TryOnRequest): Promise<TryOnResult> {
    try {
      const formData = new FormData();
      formData.append('person', request.personImage);
      formData.append('clothing', request.clothingImage);

      const response = await fetch(this.config.apiEndpoint!, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.statusText}`);
      }

      const blob = await response.blob();

      return {
        success: true,
        resultImage: blob,
      };
    } catch (error) {
      console.error('虚拟试穿失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/health`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * 简化版虚拟试穿（图层叠加）
 * 改进的对齐算法
 */
class SimpleTryOnService extends VirtualTryOnService {
  async tryOn(request: TryOnRequest): Promise<TryOnResult> {
    try {
      // 加载图片
      const personImg = await this.loadImage(request.personImage);
      const clothingImg = await this.loadImage(request.clothingImage);

      // 创建主画布
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = personImg.width;
      canvas.height = personImg.height;

      // 1. 绘制人物背景
      ctx.drawImage(personImg, 0, 0);

      // 2. 根据衣物类别计算位置
      const { scale, offsetX, offsetY, alpha, cropRegion } = this.calculateClothingPosition(
        request.category,
        canvas.width,
        canvas.height,
        clothingImg.width,
        clothingImg.height
      );

      // 3. 移除原有衣物（智能擦除）
      await this.removeOriginalClothing(ctx, canvas.width, canvas.height, cropRegion);

      const clothingWidth = clothingImg.width * scale;
      const clothingHeight = clothingImg.height * scale;
      const x = (canvas.width - clothingWidth) / 2 + offsetX;
      const y = offsetY;

      // 4. 创建衣物临时画布
      const clothingCanvas = document.createElement('canvas');
      const clothingCtx = clothingCanvas.getContext('2d')!;
      clothingCanvas.width = canvas.width;
      clothingCanvas.height = canvas.height;

      // 绘制缩放后的衣物
      clothingCtx.drawImage(clothingImg, x, y, clothingWidth, clothingHeight);

      // 5. 创建遮罩（保留头部、手臂、腿部区域）
      const maskCanvas = this.createBodyMask(
        canvas.width,
        canvas.height,
        cropRegion
      );

      // 6. 应用遮罩到衣物
      clothingCtx.globalCompositeOperation = 'destination-in';
      clothingCtx.drawImage(maskCanvas, 0, 0);

      // 7. 边缘柔化（创建渐变过渡）
      this.applySoftEdges(clothingCtx, canvas.width, canvas.height, cropRegion);

      // 8. 将衣物合成到主画布
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(clothingCanvas, 0, 0);

      // 9. 添加阴影效果增强真实感
      this.addSubtleShadow(ctx, x, y, clothingWidth, clothingHeight);

      // 转换为 Blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png', 1.0);
      });

      return {
        success: true,
        resultImage: blob,
      };
    } catch (error) {
      console.error('智能试穿失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

      /**
       * 移除原有衣物（智能擦除衣物区域）- 增强版
       * 更激进地移除原衣物，确保新衣物能完全覆盖
       */
      private async removeOriginalClothing(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        cropRegion: { headEnd: number; armStart: number; armEnd: number; legStart: number }
      ): Promise<void> {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // 定义肤色范围（RGB）
        const isSkinColor = (r: number, g: number, b: number): boolean => {
          const brightness = (r + g + b) / 3;
          // 肤色特征：偏红，中等亮度
          return (
            brightness > 80 && brightness < 240 &&
            r > 95 && g > 40 && b > 20 &&
            r > g && r > b &&
            Math.abs(r - g) > 10
          );
        };

        // 定义衣物区域（更宽松的检测，确保移除所有衣物）
        const isClothing = (r: number, g: number, b: number): boolean => {
          const brightness = (r + g + b) / 3;
          const saturation = Math.max(r, g, b) - Math.min(r, g, b);
          
          // 浅色衣物（白色、米色等）- 扩大范围
          const isLight = brightness > 150 && saturation < 120;
          
          // 深色衣物
          const isDark = brightness < 100;
          
          // 中等色彩衣物
          const isMedium = brightness >= 100 && brightness <= 150 && saturation > 15;
          
          // 检测特定颜色衣物（粉色、蓝色等）
          const hasColor = saturation > 30;
          
          return (isLight || isDark || isMedium || hasColor) && !isSkinColor(r, g, b);
        };

        // 计算躯干中心区域（扩大范围以确保覆盖）
        const centerX = width / 2;
        const bodyWidth = width * 0.45; // 扩大到45%

        // 遍历像素，移除衣物区域
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // 定义衣物区域（躯干中心部分，排除手臂）
            const distanceFromCenter = Math.abs(x - centerX);
            const isInClothingRegion = 
              y > cropRegion.headEnd && 
              y < cropRegion.legStart &&
              distanceFromCenter < bodyWidth / 2;

            if (isInClothingRegion) {
              // 更激进的移除策略
              if (isClothing(r, g, b)) {
                // 估算身体颜色
                const avgColor = this.estimateBodyColor(data, width, height, x, y);
                
                // 使用更透明的值，确保新衣物完全覆盖
                data[i] = avgColor.r * 0.9; // 稍微调暗
                data[i + 1] = avgColor.g * 0.9;
                data[i + 2] = avgColor.b * 0.9;
                data[i + 3] = 80; // 更透明（从120降到80）
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
      }

  /**
   * 估算身体颜色（使用周围肤色像素的平均值）
   */
  private estimateBodyColor(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number
  ): { r: number; g: number; b: number } {
    // 搜索半径
    const radius = 20;
    let totalR = 0, totalG = 0, totalB = 0, count = 0;

    // 在周围搜索肤色像素
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const i = (ny * width + nx) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // 检测是否为肤色
          const brightness = (r + g + b) / 3;
          if (
            brightness > 80 && brightness < 240 &&
            r > 95 && g > 40 && b > 20 &&
            r > g && r > b
          ) {
            totalR += r;
            totalG += g;
            totalB += b;
            count++;
          }
        }
      }
    }

    // 如果找到肤色，返回平均值；否则返回中性灰色
    if (count > 0) {
      return {
        r: Math.round(totalR / count),
        g: Math.round(totalG / count),
        b: Math.round(totalB / count)
      };
    } else {
      return { r: 200, g: 190, b: 180 }; // 默认肤色
    }
  }

  /**
   * 创建人体遮罩（保留特定区域）
   */
  private createBodyMask(
    width: number,
    height: number,
    cropRegion: { headEnd: number; armStart: number; armEnd: number; legStart: number }
  ): HTMLCanvasElement {
    const mask = document.createElement('canvas');
    const ctx = mask.getContext('2d')!;
    mask.width = width;
    mask.height = height;

    // 填充白色（保留区域）
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // 移除头部区域（设为黑色/透明）
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, cropRegion.headEnd);

    // 移除手臂区域（左右两侧）
    const armWidth = width * 0.15;
    ctx.fillRect(0, cropRegion.armStart, armWidth, cropRegion.armEnd - cropRegion.armStart);
    ctx.fillRect(width - armWidth, cropRegion.armStart, armWidth, cropRegion.armEnd - cropRegion.armStart);

    // 移除腿部区域
    ctx.fillRect(0, cropRegion.legStart, width, height - cropRegion.legStart);

    return mask;
  }

      /**
       * 应用边缘柔化效果 - 增强版
       * 更大的渐变区域，更自然的过渡
       */
      private applySoftEdges(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        cropRegion: { headEnd: number; armStart: number; armEnd: number; legStart: number }
      ): void {
        const gradientSize = 30; // 增大渐变区域（从20到30）

        // 顶部渐变（头部/颈部边缘）- 更平滑
        const topGradient = ctx.createLinearGradient(
          0, cropRegion.headEnd - gradientSize, 
          0, cropRegion.headEnd + gradientSize * 0.5
        );
        topGradient.addColorStop(0, 'rgba(0,0,0,1)');
        topGradient.addColorStop(0.3, 'rgba(0,0,0,0.5)');
        topGradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = topGradient;
        ctx.fillRect(0, cropRegion.headEnd - gradientSize, width, gradientSize * 1.5);

        // 底部渐变（裙摆边缘）- 更平滑
        const bottomGradient = ctx.createLinearGradient(
          0, cropRegion.legStart - gradientSize * 0.5, 
          0, cropRegion.legStart + gradientSize
        );
        bottomGradient.addColorStop(0, 'rgba(0,0,0,0)');
        bottomGradient.addColorStop(0.7, 'rgba(0,0,0,0.5)');
        bottomGradient.addColorStop(1, 'rgba(0,0,0,1)');
        
        ctx.fillStyle = bottomGradient;
        ctx.fillRect(0, cropRegion.legStart - gradientSize * 0.5, width, gradientSize * 1.5);

        // 左右两侧渐变（手臂边缘）
        const sideGradientSize = 25;
        
        // 左侧
        const leftGradient = ctx.createLinearGradient(0, 0, sideGradientSize, 0);
        leftGradient.addColorStop(0, 'rgba(0,0,0,1)');
        leftGradient.addColorStop(0.5, 'rgba(0,0,0,0.3)');
        leftGradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = leftGradient;
        ctx.fillRect(0, cropRegion.armStart, sideGradientSize, cropRegion.armEnd - cropRegion.armStart);

        // 右侧
        const rightGradient = ctx.createLinearGradient(width - sideGradientSize, 0, width, 0);
        rightGradient.addColorStop(0, 'rgba(0,0,0,0)');
        rightGradient.addColorStop(0.5, 'rgba(0,0,0,0.3)');
        rightGradient.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = rightGradient;
        ctx.fillRect(width - sideGradientSize, cropRegion.armStart, sideGradientSize, cropRegion.armEnd - cropRegion.armStart);
      }

  /**
   * 添加细微阴影增强立体感
   */
  private addSubtleShadow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = 'black';
    ctx.fillRect(x + 5, y + 5, width, height);
  }

      /**
       * 根据衣物类别计算最佳位置和尺寸（含区域裁剪信息）
       * 优化版：更精准的定位和裁剪
       */
      private calculateClothingPosition(
        category: string,
        canvasWidth: number,
        canvasHeight: number,
        clothingWidth: number,
        clothingHeight: number
      ): { 
        scale: number; 
        offsetX: number; 
        offsetY: number; 
        alpha: number;
        cropRegion: { headEnd: number; armStart: number; armEnd: number; legStart: number };
      } {
        const aspectRatio = clothingHeight / clothingWidth;
        
        switch (category) {
          case 'top': // 上衣
            return {
              scale: Math.min(0.48, canvasWidth * 0.48 / clothingWidth),
              offsetX: 0,
              offsetY: canvasHeight * 0.20, // 肩膀位置（下调）
              alpha: 0.95, // 提高不透明度
              cropRegion: {
                headEnd: canvasHeight * 0.18,      // 保留头部
                armStart: canvasHeight * 0.22,     // 手臂开始
                armEnd: canvasHeight * 0.58,       // 手臂结束
                legStart: canvasHeight * 0.63,     // 保留腿部
              },
            };
          
          case 'dress': // 连衣裙
            return {
              scale: Math.min(0.52, canvasWidth * 0.52 / clothingWidth),
              offsetX: 0,
              offsetY: canvasHeight * 0.17, // 从肩膀开始（下调）
              alpha: 0.98, // 提高不透明度，减少透视
              cropRegion: {
                headEnd: canvasHeight * 0.15,      // 保留头部
                armStart: canvasHeight * 0.19,     // 手臂开始
                armEnd: canvasHeight * 0.48,       // 手臂结束（收窄范围）
                legStart: canvasHeight * 0.82,     // 保留腿部（裙子较长，扩大范围）
              },
            };
      
      case 'bottom': // 裤子/裙子
        return {
          scale: Math.min(0.45, canvasWidth * 0.45 / clothingWidth),
          offsetX: 0,
          offsetY: canvasHeight * 0.45, // 腰部位置
          alpha: 0.88,
          cropRegion: {
            headEnd: canvasHeight * 0.43,      // 保留上半身
            armStart: canvasHeight * 0.45,     // 手臂区域（不遮挡）
            armEnd: canvasHeight * 0.70,       
            legStart: canvasHeight * 0.85,     // 保留小腿
          },
        };
      
      case 'outerwear': // 外套
        return {
          scale: Math.min(0.58, canvasWidth * 0.58 / clothingWidth),
          offsetX: 0,
          offsetY: canvasHeight * 0.15,
          alpha: 0.88,
          cropRegion: {
            headEnd: canvasHeight * 0.14,
            armStart: canvasHeight * 0.18,
            armEnd: canvasHeight * 0.70,       // 外套手臂较长
            legStart: canvasHeight * 0.72,
          },
        };
      
      default:
        // 默认：根据长宽比智能调整
        const isLong = aspectRatio > 1.3; // 连衣裙等长款
        return {
          scale: isLong ? 0.55 : 0.50,
          offsetX: 0,
          offsetY: isLong ? canvasHeight * 0.15 : canvasHeight * 0.18,
          alpha: 0.90,
          cropRegion: {
            headEnd: canvasHeight * (isLong ? 0.14 : 0.17),
            armStart: canvasHeight * (isLong ? 0.18 : 0.20),
            armEnd: canvasHeight * (isLong ? 0.50 : 0.60),
            legStart: canvasHeight * (isLong ? 0.78 : 0.65),
          },
        };
    }
  }

  async testConnection(): Promise<boolean> {
    return true; // 本地处理，总是可用
  }

  private loadImage(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }
}

/**
 * 阿里云百炼服务（推荐）
 */
class AliyunBailianService extends VirtualTryOnService {
  async tryOn(request: TryOnRequest): Promise<TryOnResult> {
    try {
      if (!this.config.apiKey) {
        throw new Error('请先配置阿里云百炼 API Key');
      }

      console.log('🌟 使用阿里云百炼 AI试衣服务...');

      // 动态导入阿里云百炼服务
      const { AliyunBailianVTONService } = await import('./aliyun-bailian-vton');
      
      // 创建服务实例，如果配置了OSS则传递配置
      const ossConfig = this.config.oss ? {
        region: this.config.oss.region,
        bucket: this.config.oss.bucket,
        accessKeyId: this.config.oss.accessKeyId,
        accessKeySecret: this.config.oss.accessKeySecret,
      } : undefined;
      
      const service = new AliyunBailianVTONService(this.config.apiKey, ossConfig);

      // 调用阿里云百炼 API
      const result = await service.tryOn({
        personImage: request.personImage,
        clothingImage: request.clothingImage,
        category: request.options?.category,
      });

      if (result.success && result.resultImage) {
        console.log('✅ 阿里云百炼处理完成');
        console.log(`⏱️ 耗时: ${result.processingTime}秒`);
        console.log(`💰 成本: ¥${(result.cost || 0).toFixed(2)}`);
        
        return {
          success: true,
          resultImage: result.resultImage,
        };
      } else {
        throw new Error(result.error || '阿里云百炼处理失败');
      }
    } catch (error) {
      console.error('阿里云百炼服务失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.config.apiKey) return false;
      
      const { AliyunBailianVTONService } = await import('./aliyun-bailian-vton');
      
      // 创建服务实例，如果配置了OSS则传递配置
      const ossConfig = this.config.oss ? {
        region: this.config.oss.region,
        bucket: this.config.oss.bucket,
        accessKeyId: this.config.oss.accessKeyId,
        accessKeySecret: this.config.oss.accessKeySecret,
      } : undefined;
      
      const service = new AliyunBailianVTONService(this.config.apiKey, ossConfig);
      return await service.testConnection();
    } catch {
      return false;
    }
  }
}

/**
 * 虚拟试穿服务工厂（简化版）
 */
export class VirtualTryOnFactory {
  static createService(config: VirtualTryOnConfig): VirtualTryOnService {
    switch (config.provider) {
      case 'aliyun-bailian':
        return new AliyunBailianService(config);
      case 'none':
      default:
        return new SimpleTryOnService(config);
    }
  }
}

/**
 * 虚拟试穿管理器
 */
export class VirtualTryOnManager {
  private service: VirtualTryOnService;

  constructor(config: VirtualTryOnConfig) {
    this.service = VirtualTryOnFactory.createService(config);
  }

  async tryOn(request: TryOnRequest): Promise<TryOnResult> {
    return this.service.tryOn(request);
  }

  async testConnection(): Promise<boolean> {
    return this.service.testConnection();
  }

  updateConfig(config: VirtualTryOnConfig): void {
    this.service = VirtualTryOnFactory.createService(config);
  }
}

