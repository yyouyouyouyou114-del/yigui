import { create } from 'zustand';
import { Clothing, Outfit, ClothingFilter, SortOption, UserProfile, AppSettings } from '@/types';
import { clothingStorage, outfitStorage, profileStorage, settingsStorage } from '@/services/storage';

interface WardrobeState {
  // 数据
  clothing: Clothing[];
  outfits: Outfit[];
  profile: UserProfile | null;
  settings: AppSettings | null;
  
  // UI 状态
  loading: boolean;
  filter: ClothingFilter;
  sortBy: SortOption;
  selectedItems: string[];
  
  // 动作
  initialize: () => Promise<void>;
  
  // 衣物操作
  addClothing: (item: Clothing) => Promise<void>;
  updateClothing: (item: Clothing) => Promise<void>;
  deleteClothing: (id: string) => Promise<void>;
  getClothingById: (id: string) => Clothing | undefined;
  
  // 搭配操作
  addOutfit: (outfit: Outfit) => Promise<void>;
  updateOutfit: (outfit: Outfit) => Promise<void>;
  deleteOutfit: (id: string) => Promise<void>;
  
  // 筛选和排序
  setFilter: (filter: ClothingFilter) => void;
  setSortBy: (sortBy: SortOption) => void;
  getFilteredClothing: () => Clothing[];
  
  // 选择
  toggleSelectItem: (id: string) => void;
  clearSelection: () => void;
  
  // 配置
  updateProfile: (profile: UserProfile) => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
}

export const useWardrobeStore = create<WardrobeState>((set, get) => ({
  // 初始状态
  clothing: [],
  outfits: [],
  profile: null,
  settings: null,
  loading: false,
  filter: {},
  sortBy: 'date-desc',
  selectedItems: [],

  // 初始化
  initialize: async () => {
    set({ loading: true });
    try {
      const [clothing, outfits, profile, settings] = await Promise.all([
        clothingStorage.getAll(),
        outfitStorage.getAll(),
        profileStorage.get('default'),
        settingsStorage.get('default'),
      ]);

      // 如果没有配置，创建默认配置
      let finalSettings = settings;
      if (!finalSettings) {
        finalSettings = {
          userId: 'default',
          theme: 'light',
          language: 'zh-CN',
          virtualTryOn: {
            enabled: false,
            provider: 'none',
          },
          autoBackup: true,
          imageQuality: 'medium',
          updatedAt: new Date(),
        };
        await settingsStorage.save(finalSettings);
      }

      // 如果本地衣柜为空，尝试注入示例衣服（从 public/ 读取，不存在则跳过）
      let seededClothing = clothing;
      const needSeed =
        !Array.isArray(seededClothing) ||
        seededClothing.length === 0 ||
        !seededClothing.some((c) => c.id === 'sample-dress-pink') ||
        !seededClothing.some((c) => c.id === 'sample-dress-green');

      if (needSeed) {
        const seeded = await seedSampleClothingIfAvailable();
        if (seeded.length > 0) {
          seededClothing = [...seededClothing, ...seeded];
        }
      }

      set({
        clothing: seededClothing,
        outfits,
        profile: profile || null,
        settings: finalSettings,
        loading: false,
      });
    } catch (error) {
      console.error('初始化失败:', error);
      set({ loading: false });
    }
  },

  // 衣物操作
  addClothing: async (item: Clothing) => {
    await clothingStorage.add(item);
    set((state) => ({ clothing: [...state.clothing, item] }));
  },

  updateClothing: async (item: Clothing) => {
    await clothingStorage.update(item);
    set((state) => ({
      clothing: state.clothing.map((c) => (c.id === item.id ? item : c)),
    }));
  },

  deleteClothing: async (id: string) => {
    await clothingStorage.delete(id);
    set((state) => ({
      clothing: state.clothing.filter((c) => c.id !== id),
    }));
  },

  getClothingById: (id: string) => {
    return get().clothing.find((c) => c.id === id);
  },

  // 搭配操作
  addOutfit: async (outfit: Outfit) => {
    await outfitStorage.add(outfit);
    set((state) => ({ outfits: [...state.outfits, outfit] }));
  },

  updateOutfit: async (outfit: Outfit) => {
    await outfitStorage.update(outfit);
    set((state) => ({
      outfits: state.outfits.map((o) => (o.id === outfit.id ? outfit : o)),
    }));
  },

  deleteOutfit: async (id: string) => {
    await outfitStorage.delete(id);
    set((state) => ({
      outfits: state.outfits.filter((o) => o.id !== id),
    }));
  },

  // 筛选和排序
  setFilter: (filter: ClothingFilter) => {
    set({ filter });
  },

  setSortBy: (sortBy: SortOption) => {
    set({ sortBy });
  },

  getFilteredClothing: () => {
    const { clothing, filter, sortBy } = get();
    let filtered = [...clothing];

    // 应用筛选
    if (filter.category && filter.category.length > 0) {
      filtered = filtered.filter((item) => filter.category!.includes(item.category));
    }

    if (filter.season && filter.season.length > 0) {
      filtered = filtered.filter((item) =>
        item.season.some((s) => filter.season!.includes(s))
      );
    }

    if (filter.color && filter.color.length > 0) {
      filtered = filtered.filter((item) => filter.color!.includes(item.color));
    }

    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter((item) =>
        filter.tags!.some((tag) => item.tags.includes(tag))
      );
    }

    if (filter.favorite) {
      filtered = filtered.filter((item) => item.favorite);
    }

    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.tags.some((tag) => tag.toLowerCase().includes(searchLower)) ||
          (item.brand && item.brand.toLowerCase().includes(searchLower))
      );
    }

    // 应用排序
    switch (sortBy) {
      case 'date-desc':
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'date-asc':
        filtered.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'name-asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name, 'zh-CN'));
        break;
      case 'wear-count':
        filtered.sort((a, b) => (b.wearCount || 0) - (a.wearCount || 0));
        break;
    }

    return filtered;
  },

  // 选择
  toggleSelectItem: (id: string) => {
    set((state) => ({
      selectedItems: state.selectedItems.includes(id)
        ? state.selectedItems.filter((i) => i !== id)
        : [...state.selectedItems, id],
    }));
  },

  clearSelection: () => {
    set({ selectedItems: [] });
  },

  // 配置
  updateProfile: async (profile: UserProfile) => {
    await profileStorage.save(profile);
    set({ profile });
  },

  updateSettings: async (settings: AppSettings) => {
    await settingsStorage.save(settings);
    set({ settings });
  },
}));

// ---------- helpers: seed sample clothing ----------
async function seedSampleClothingIfAvailable() {
  try {
    const results: any[] = [];

    const samples: Array<{
      id: string;
      name: string;
      url: string;
      color: string;
    }> = [
      {
        id: 'sample-dress-pink',
        name: '粉色连衣裙（示例）',
        url: '/sample-dress-pink.jpg',
        color: '粉色',
      },
      {
        id: 'sample-dress-green',
        name: '绿色连衣裙（示例）',
        url: '/sample-dress-green.jpg',
        color: '绿色',
      },
    ];

    for (const s of samples) {
      try {
        const resp = await fetch(s.url, { cache: 'no-cache' });
        if (!resp.ok) {
          continue;
        }
        const blob = await resp.blob();
        const buffer = await blob.arrayBuffer();

        // 生成缩略图（失败也不中断，继续写入原图）
        let thumbnailBuffer: ArrayBuffer | undefined = undefined;
        try {
          const thumbnailBlob = await createThumbnailFromBlob(blob);
          thumbnailBuffer = await thumbnailBlob.arrayBuffer();
        } catch (thumbErr) {
          console.warn('示例衣物缩略图生成失败，将使用原图展示:', thumbErr);
        }

        const item: any = {
          id: s.id,
          userId: 'default',
          name: s.name,
          category: 'dress',
          season: ['spring', 'autumn'],
          color: s.color,
          tags: ['示例衣物'],
          occasions: ['casual'],
          imageData: buffer,
          thumbnailData: thumbnailBuffer,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await clothingStorage.add(item);
        results.push(item);
      } catch (err) {
        console.warn(`注入示例衣物 ${s.name} 失败:`, err);
        // 忽略单个失败
      }
    }

    return results;
  } catch (e) {
    console.warn('注入示例衣物失败', e);
    return [];
  }
}

// 从 Blob 创建缩略图
async function createThumbnailFromBlob(blob: Blob, size: number = 300): Promise<Blob> {
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
      if (width > size || height > size) {
        const ratio = Math.min(size / width, size / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // 绘制图片
      ctx.drawImage(img, 0, 0, width, height);

      // 转换为 Blob
      canvas.toBlob(
        (resultBlob) => {
          if (resultBlob) {
            resolve(resultBlob);
          } else {
            reject(new Error('缩略图生成失败'));
          }
        },
        'image/jpeg',
        0.7
      );
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    img.src = URL.createObjectURL(blob);
  });
}

