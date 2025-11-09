/**
 * 图片处理工具
 */

// 压缩图片
export async function compressImage(
  file: File | Blob,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('无法获取 Canvas 上下文'));
      return;
    }

    img.onload = () => {
      let { width, height } = img;

      // 计算缩放比例
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // 绘制图片（如果是PNG，先填充白色背景避免黑色）
      const fileType = file instanceof Blob ? file.type : '';
      const isPNG = fileType === 'image/png';
      
      if (!isPNG) {
        // JPEG 不支持透明，填充白色背景
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx.drawImage(img, 0, 0, width, height);

      // 根据原始格式选择输出格式
      const mimeType = isPNG ? 'image/png' : 'image/jpeg';
      
      // 转换为 Blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('图片压缩失败'));
          }
        },
        mimeType,
        isPNG ? 1.0 : quality // PNG 使用无损压缩
      );
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    img.src = URL.createObjectURL(file);
  });
}

// 创建缩略图
export async function createThumbnail(
  file: File,
  size: number = 300
): Promise<Blob> {
  return compressImage(file, size, size, 0.7);
}

// 提取主色调
export async function extractDominantColor(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('无法获取 Canvas 上下文'));
      return;
    }

    img.onload = () => {
      // 缩小图片以加快处理速度
      const size = 100;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;

      // 统计颜色
      const colorMap: Record<string, number> = {};
      
      for (let i = 0; i < data.length; i += 4) {
        const r = Math.floor(data[i] / 32) * 32;
        const g = Math.floor(data[i + 1] / 32) * 32;
        const b = Math.floor(data[i + 2] / 32) * 32;
        
        // 跳过太亮或太暗的颜色
        const brightness = (r + g + b) / 3;
        if (brightness > 240 || brightness < 15) continue;

        const key = `${r},${g},${b}`;
        colorMap[key] = (colorMap[key] || 0) + 1;
      }

      // 找到出现次数最多的颜色
      let maxCount = 0;
      let dominantColor = '128,128,128';

      for (const [color, count] of Object.entries(colorMap)) {
        if (count > maxCount) {
          maxCount = count;
          dominantColor = color;
        }
      }

      const [r, g, b] = dominantColor.split(',').map(Number);
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      
      resolve(hex);
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    img.src = URL.createObjectURL(file);
  });
}

// Blob 转 ArrayBuffer
export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

// ArrayBuffer 转 Blob
export function arrayBufferToBlob(buffer: ArrayBuffer, type: string = 'image/jpeg'): Blob {
  return new Blob([buffer], { type });
}

// ArrayBuffer 转 Data URL
export function arrayBufferToDataURL(buffer: ArrayBuffer, type: string = 'image/jpeg'): string {
  const blob = arrayBufferToBlob(buffer, type);
  return URL.createObjectURL(blob);
}

// 从 Data URL 获取颜色名称（简化版）
export function getColorName(hex: string): string {
  const colorNames: Record<string, string> = {
    '#000000': '黑色',
    '#ffffff': '白色',
    '#ff0000': '红色',
    '#00ff00': '绿色',
    '#0000ff': '蓝色',
    '#ffff00': '黄色',
    '#ff00ff': '紫色',
    '#00ffff': '青色',
    '#ffa500': '橙色',
    '#ffc0cb': '粉色',
    '#808080': '灰色',
    '#a52a2a': '棕色',
  };

  // 简单的颜色匹配逻辑
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  if (r < 50 && g < 50 && b < 50) return '黑色';
  if (r > 200 && g > 200 && b > 200) return '白色';
  if (r > 200 && g < 100 && b < 100) return '红色';
  if (r < 100 && g > 200 && b < 100) return '绿色';
  if (r < 100 && g < 100 && b > 200) return '蓝色';
  if (r > 200 && g > 200 && b < 100) return '黄色';
  if (r > 150 && g < 100 && b > 150) return '紫色';
  if (r > 200 && g > 100 && b < 100) return '橙色';
  if (r > 150 && g < 100 && b < 100) return '棕色';
  if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30) return '灰色';

  return '其他';
}

// 去除图片背景（简化版，使用 Canvas API）
export async function removeBackground(file: File): Promise<Blob> {
  // 这是一个占位实现，真实的背景去除需要使用 AI 模型
  // 可以考虑集成 @imgly/background-removal 或调用 API
  return compressImage(file);
}

