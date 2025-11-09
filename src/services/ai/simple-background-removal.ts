/**
 * 简单的背景移除方案（基于 Canvas）
 * 作为 @imgly/background-removal 的备用方案
 */

/**
 * 使用色度键（Chroma Key）移除背景
 * 适用于纯色背景的图片
 * @param file 原始图片文件
 * @param tolerance 颜色容差 (0-255)
 * @returns 抠图后的 Blob
 */
export async function removeBackgroundSimple(
  file: File,
  tolerance: number = 50
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      reject(new Error('无法创建 Canvas 上下文'));
      return;
    }

    img.onload = () => {
      try {
        canvas.width = img.width;
        canvas.height = img.height;

        // 绘制原图
        ctx.drawImage(img, 0, 0);

        // 获取图像数据
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // 假设四个角的颜色为背景色
        const corners = [
          { x: 0, y: 0 },
          { x: canvas.width - 1, y: 0 },
          { x: 0, y: canvas.height - 1 },
          { x: canvas.width - 1, y: canvas.height - 1 },
        ];

        // 计算平均背景色
        let totalR = 0, totalG = 0, totalB = 0;
        corners.forEach(({ x, y }) => {
          const i = (y * canvas.width + x) * 4;
          totalR += data[i];
          totalG += data[i + 1];
          totalB += data[i + 2];
        });

        const bgR = totalR / corners.length;
        const bgG = totalG / corners.length;
        const bgB = totalB / corners.length;

        console.log(`检测到的背景色: RGB(${bgR.toFixed(0)}, ${bgG.toFixed(0)}, ${bgB.toFixed(0)})`);

        // 移除相似颜色的像素
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // 计算颜色差异
          const diff = Math.sqrt(
            Math.pow(r - bgR, 2) +
            Math.pow(g - bgG, 2) +
            Math.pow(b - bgB, 2)
          );

          // 如果颜色差异小于容差，设为透明
          if (diff < tolerance) {
            data[i + 3] = 0; // Alpha 通道设为 0
          }
        }

        // 应用修改后的图像数据
        ctx.putImageData(imageData, 0, 0);

        // 转换为 Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('转换为 Blob 失败'));
            }
          },
          'image/png',
          1.0
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * 使用边缘检测进行简单分割
 * @param file 原始图片文件
 * @returns 抠图后的 Blob
 */
export async function removeBackgroundEdge(file: File): Promise<Blob> {
  // 这是一个更复杂的实现，可以后续添加
  // 暂时返回简单的色度键结果
  return removeBackgroundSimple(file, 60);
}
