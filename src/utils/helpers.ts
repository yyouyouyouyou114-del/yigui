import { ClothingCategory, Season } from '@/types';

// 生成唯一 ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 格式化日期
export function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 周前`;
  if (days < 365) return `${Math.floor(days / 30)} 个月前`;
  
  return date.toLocaleDateString('zh-CN');
}

// 格式化价格
export function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`;
}

// 获取类别显示名称
export function getCategoryName(category: ClothingCategory): string {
  const names: Record<ClothingCategory, string> = {
    top: '上衣',
    bottom: '裤装',
    dress: '连衣裙',
    outerwear: '外套',
    shoes: '鞋履',
    accessory: '配饰',
  };
  return names[category] || category;
}

// 获取季节显示名称
export function getSeasonName(season: Season): string {
  const names: Record<Season, string> = {
    spring: '春季',
    summer: '夏季',
    autumn: '秋季',
    winter: '冬季',
  };
  return names[season] || season;
}

// 获取当前季节
export function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

// 颜色协调判断（简化版）
export function areColorsHarmonious(color1: string, color2: string): boolean {
  // 基本的颜色搭配规则
  const harmonies: Record<string, string[]> = {
    '黑色': ['白色', '灰色', '红色', '蓝色', '黄色', '粉色'],
    '白色': ['黑色', '灰色', '蓝色', '红色', '绿色', '紫色'],
    '灰色': ['黑色', '白色', '蓝色', '粉色', '黄色'],
    '红色': ['黑色', '白色', '灰色', '蓝色'],
    '蓝色': ['白色', '黑色', '灰色', '黄色', '橙色'],
    '绿色': ['白色', '黑色', '黄色', '棕色'],
    '黄色': ['黑色', '白色', '蓝色', '灰色'],
    '橙色': ['蓝色', '白色', '黑色', '棕色'],
    '紫色': ['白色', '黑色', '灰色', '黄色'],
    '粉色': ['白色', '灰色', '黑色'],
    '棕色': ['白色', '绿色', '橙色', '黄色'],
  };

  return harmonies[color1]?.includes(color2) || harmonies[color2]?.includes(color1) || false;
}

// 文件大小格式化
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// 下载文件
export function downloadFile(data: any, filename: string, type: string = 'application/json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 读取文件
export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

