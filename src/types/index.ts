// 衣物类别
export type ClothingCategory = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'accessory';

// 季节类型
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

// 场合类型
export type Occasion = 'casual' | 'work' | 'formal' | 'sport' | 'party' | 'outdoor';

// 衣物数据模型
export interface Clothing {
  id: string;
  userId: string;
  name: string;
  category: ClothingCategory;
  subcategory?: string;
  season: Season[];
  color: string;
  colorHex?: string; // 主色调的十六进制值
  brand?: string;
  purchaseDate?: Date;
  price?: number;
  imageData: ArrayBuffer;
  thumbnailData?: ArrayBuffer; // 缩略图
  tags: string[];
  occasions: Occasion[]; // 适用场合（必填）
  favorite?: boolean;
  wearCount?: number; // 穿着次数
  lastWornDate?: Date; // 最后穿着日期
  createdAt: Date;
  updatedAt: Date;
}

// 搭配方案
export interface Outfit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  items: string[]; // clothing IDs
  occasion: Occasion;
  season: Season[];
  rating?: number; // 1-5 星评分
  imageData?: ArrayBuffer; // 搭配效果图
  tags: string[];
  favorite?: boolean;
  wearCount?: number;
  lastWornDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 用户照片（用于虚拟试穿）
export interface UserPhoto {
  id: string;
  userId: string;
  name: string;
  imageData: ArrayBuffer;
  thumbnailData?: ArrayBuffer; // 缩略图
  description?: string; // 备注（如：正面全身照、侧面照等）
  isDefault: boolean; // 是否为默认照片
  createdAt: Date;
  updatedAt: Date;
}

// 用户配置
export interface UserProfile {
  id: string;
  name?: string;
  avatarImage?: ArrayBuffer; // 用于虚拟试穿的全身照
  bodyMeasurements?: {
    height?: number;
    weight?: number;
    bust?: number;
    waist?: number;
    hips?: number;
  };
  preferredStyles?: string[];
  preferredColors?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// 虚拟试穿 API 配置
export type VirtualTryOnProvider = 'none' | 'aliyun-bailian';

export interface VirtualTryOnConfig {
  enabled: boolean;
  provider: VirtualTryOnProvider;
  // 阿里云百炼 API Key
  apiKey?: string;
  // 阿里云OSS配置（用于图片上传）
  oss?: {
    region: string;
    bucket: string;
    accessKeyId: string;
    accessKeySecret: string;
  };
}

// 应用设置
export interface AppSettings {
  userId: string;
  theme: 'light' | 'dark' | 'auto';
  language: 'zh-CN' | 'en-US';
  virtualTryOn: VirtualTryOnConfig;
  autoBackup: boolean;
  imageQuality: 'low' | 'medium' | 'high';
  updatedAt: Date;
}

// 筛选条件
export interface ClothingFilter {
  category?: ClothingCategory[];
  season?: Season[];
  color?: string[];
  tags?: string[];
  favorite?: boolean;
  searchText?: string;
}

// 排序选项
export type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'wear-count';

// 统计数据
export interface WardrobeStats {
  totalItems: number;
  byCategory: Record<ClothingCategory, number>;
  bySeason: Record<Season, number>;
  totalOutfits: number;
  mostWornItems: Clothing[];
  leastWornItems: Clothing[];
  recentlyAdded: Clothing[];
}

