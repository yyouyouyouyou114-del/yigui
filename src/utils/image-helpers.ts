/**
 * 图片辅助工具
 * 用于检测图片是否已有透明背景
 */

/**
 * 检测图片是否有透明背景
 * @param file 图片文件
 * @returns Promise<boolean> true 表示已有透明背景
 */
export async function hasTransparentBackground(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(false);
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // 检查是否有透明像素（Alpha < 255）
        let hasTransparency = false;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 255) {
            hasTransparency = true;
            break;
          }
        }
        
        resolve(hasTransparency);
      };
      
      img.onerror = () => resolve(false);
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => resolve(false);
    reader.readAsDataURL(file);
  });
}

/**
 * 计算图片透明度百分比
 * @param file 图片文件
 * @returns Promise<number> 透明像素占比（0-100）
 */
export async function calculateTransparencyPercentage(file: File): Promise<number> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(0);
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let transparentPixels = 0;
        let totalPixels = data.length / 4;
        
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 255) {
            transparentPixels++;
          }
        }
        
        const percentage = (transparentPixels / totalPixels) * 100;
        resolve(percentage);
      };
      
      img.onerror = () => resolve(0);
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => resolve(0);
    reader.readAsDataURL(file);
  });
}

/**
 * 检测图片格式是否支持透明度
 * @param file 图片文件
 * @returns boolean
 */
export function supportsTransparency(file: File): boolean {
  const transparencyFormats = ['image/png', 'image/webp', 'image/gif'];
  return transparencyFormats.includes(file.type.toLowerCase());
}
