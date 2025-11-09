import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Clothing, Outfit, UserProfile, AppSettings, UserPhoto } from '@/types';

// 数据库 Schema 定义
interface WardrobeDB extends DBSchema {
  clothing: {
    key: string;
    value: Clothing;
    indexes: { 
      'by-category': string; 
      'by-season': string;
      'by-date': Date;
      'by-favorite': number;
    };
  };
  outfits: {
    key: string;
    value: Outfit;
    indexes: { 
      'by-occasion': string;
      'by-date': Date;
    };
  };
  userPhotos: {
    key: string;
    value: UserPhoto;
    indexes: {
      'by-default': number;
      'by-date': Date;
    };
  };
  profile: {
    key: string;
    value: UserProfile;
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

const DB_NAME = 'smart-wardrobe';
const DB_VERSION = 3; // 🔧 增加版本号强制重建数据库

let dbInstance: IDBPDatabase<WardrobeDB> | null = null;

// 初始化数据库
export async function initDB(): Promise<IDBPDatabase<WardrobeDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  console.log('🔧 初始化 IndexedDB 数据库...');
  console.log(`   数据库名称: ${DB_NAME}`);
  console.log(`   数据库版本: ${DB_VERSION}`);

  try {
    dbInstance = await openDB<WardrobeDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`📦 升级数据库: ${oldVersion} -> ${newVersion}`);
        
        // 创建衣物表
        if (!db.objectStoreNames.contains('clothing')) {
          console.log('   创建 clothing 表...');
          const clothingStore = db.createObjectStore('clothing', { keyPath: 'id' });
          clothingStore.createIndex('by-category', 'category');
          clothingStore.createIndex('by-season', 'season', { multiEntry: true });
          clothingStore.createIndex('by-date', 'createdAt');
          clothingStore.createIndex('by-favorite', 'favorite');
        }

        // 创建搭配表
        if (!db.objectStoreNames.contains('outfits')) {
          console.log('   创建 outfits 表...');
          const outfitStore = db.createObjectStore('outfits', { keyPath: 'id' });
          outfitStore.createIndex('by-occasion', 'occasion');
          outfitStore.createIndex('by-date', 'createdAt');
        }

        // 创建用户照片表
        if (!db.objectStoreNames.contains('userPhotos')) {
          console.log('   创建 userPhotos 表...');
          const photoStore = db.createObjectStore('userPhotos', { keyPath: 'id' });
          photoStore.createIndex('by-default', 'isDefault');
          photoStore.createIndex('by-date', 'createdAt');
        }

        // 创建用户配置表
        if (!db.objectStoreNames.contains('profile')) {
          console.log('   创建 profile 表...');
          db.createObjectStore('profile', { keyPath: 'id' });
        }

        // 创建设置表
        if (!db.objectStoreNames.contains('settings')) {
          console.log('   创建 settings 表...');
          db.createObjectStore('settings', { keyPath: 'userId' });
        }
        
        console.log('✅ 数据库结构创建完成');
      },
    });

    console.log('✅ IndexedDB 数据库初始化成功');
    return dbInstance;
  } catch (error) {
    console.error('❌ IndexedDB 初始化失败:', error);
    throw error;
  }
}

// 获取数据库实例
export async function getDB(): Promise<IDBPDatabase<WardrobeDB>> {
  if (!dbInstance) {
    return await initDB();
  }
  return dbInstance;
}

// 日期字段序列化/反序列化辅助函数
function serializeClothing(item: Clothing): any {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    purchaseDate: item.purchaseDate?.toISOString(),
    lastWornDate: item.lastWornDate?.toISOString(),
  };
}

function deserializeClothing(item: any): Clothing {
  return {
    ...item,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
    purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : undefined,
    lastWornDate: item.lastWornDate ? new Date(item.lastWornDate) : undefined,
  };
}

// 衣物数据操作
export const clothingStorage = {
  async add(item: Clothing): Promise<string> {
    const db = await getDB();
    return await db.add('clothing', serializeClothing(item) as any);
  },

  async get(id: string): Promise<Clothing | undefined> {
    const db = await getDB();
    const item = await db.get('clothing', id);
    return item ? deserializeClothing(item as any) : undefined;
  },

  async getAll(): Promise<Clothing[]> {
    const db = await getDB();
    const items = await db.getAll('clothing');
    return items.map((item) => deserializeClothing(item as any));
  },

  async update(item: Clothing): Promise<string> {
    const db = await getDB();
    return await db.put('clothing', serializeClothing(item) as any);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('clothing', id);
  },

  async getByCategory(category: string): Promise<Clothing[]> {
    const db = await getDB();
    const items = await db.getAllFromIndex('clothing', 'by-category', category);
    return items.map((item) => deserializeClothing(item as any));
  },

  async getBySeason(season: string): Promise<Clothing[]> {
    const db = await getDB();
    const items = await db.getAllFromIndex('clothing', 'by-season', season);
    return items.map((item) => deserializeClothing(item as any));
  },

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear('clothing');
  },
};

// Outfit 序列化/反序列化
function serializeOutfit(outfit: Outfit): any {
  return {
    ...outfit,
    createdAt: outfit.createdAt.toISOString(),
    updatedAt: outfit.updatedAt.toISOString(),
    lastWornDate: outfit.lastWornDate?.toISOString(),
  };
}

function deserializeOutfit(outfit: any): Outfit {
  return {
    ...outfit,
    createdAt: new Date(outfit.createdAt),
    updatedAt: new Date(outfit.updatedAt),
    lastWornDate: outfit.lastWornDate ? new Date(outfit.lastWornDate) : undefined,
  };
}

// 搭配数据操作
export const outfitStorage = {
  async add(outfit: Outfit): Promise<string> {
    const db = await getDB();
    return await db.add('outfits', serializeOutfit(outfit) as any);
  },

  async get(id: string): Promise<Outfit | undefined> {
    const db = await getDB();
    const outfit = await db.get('outfits', id);
    return outfit ? deserializeOutfit(outfit as any) : undefined;
  },

  async getAll(): Promise<Outfit[]> {
    const db = await getDB();
    const outfits = await db.getAll('outfits');
    return outfits.map((outfit) => deserializeOutfit(outfit as any));
  },

  async update(outfit: Outfit): Promise<string> {
    const db = await getDB();
    return await db.put('outfits', serializeOutfit(outfit) as any);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('outfits', id);
  },

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear('outfits');
  },
};

// 用户配置操作
export const profileStorage = {
  async get(userId: string): Promise<UserProfile | undefined> {
    const db = await getDB();
    return await db.get('profile', userId);
  },

  async save(profile: UserProfile): Promise<string> {
    const db = await getDB();
    return await db.put('profile', profile);
  },
};

// 设置操作
export const settingsStorage = {
  async get(userId: string): Promise<AppSettings | undefined> {
    const db = await getDB();
    return await db.get('settings', userId);
  },

  async save(settings: AppSettings): Promise<string> {
    const db = await getDB();
    return await db.put('settings', settings);
  },
};

// 用户照片操作
export const userPhotoStorage = {
  async add(photo: UserPhoto): Promise<string> {
    const db = await getDB();
    
    // 如果设置为默认照片，先取消其他照片的默认状态
    if (photo.isDefault) {
      const allPhotos = await db.getAll('userPhotos');
      for (const p of allPhotos) {
        if (p.isDefault) {
          p.isDefault = false;
          await db.put('userPhotos', p);
        }
      }
    }
    
    return await db.add('userPhotos', photo);
  },

  async get(id: string): Promise<UserPhoto | undefined> {
    const db = await getDB();
    return await db.get('userPhotos', id);
  },

  async getAll(): Promise<UserPhoto[]> {
    const db = await getDB();
    return await db.getAll('userPhotos');
  },

  async getDefault(): Promise<UserPhoto | undefined> {
    const db = await getDB();
    const allPhotos = await db.getAll('userPhotos');
    return allPhotos.find(p => p.isDefault);
  },

  async update(photo: UserPhoto): Promise<string> {
    const db = await getDB();
    
    // 如果设置为默认照片，先取消其他照片的默认状态
    if (photo.isDefault) {
      const allPhotos = await db.getAll('userPhotos');
      for (const p of allPhotos) {
        if (p.isDefault && p.id !== photo.id) {
          p.isDefault = false;
          await db.put('userPhotos', p);
        }
      }
    }
    
    return await db.put('userPhotos', photo);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('userPhotos', id);
  },

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear('userPhotos');
  },
};

// 导出所有数据（用于备份）
export async function exportAllData() {
  const db = await getDB();
  
  const [clothing, outfits, userPhotos, profiles, settings] = await Promise.all([
    clothingStorage.getAll(),
    outfitStorage.getAll(),
    userPhotoStorage.getAll(),
    db.getAll('profile'),
    db.getAll('settings'),
  ]);

  return {
    version: DB_VERSION,
    exportDate: new Date().toISOString(),
    data: {
      clothing,
      outfits,
      userPhotos,
      profiles,
      settings,
    },
  };
}

// 导入数据（从备份恢复）
export async function importAllData(data: any) {
  const db = await getDB();
  
  // 清空现有数据
  await Promise.all([
    db.clear('clothing'),
    db.clear('outfits'),
    db.clear('userPhotos'),
    db.clear('profile'),
    db.clear('settings'),
  ]);

  // 导入新数据（使用序列化函数）
  const imports = [
    ...data.data.clothing.map((item: Clothing) => clothingStorage.add(item)),
    ...data.data.outfits.map((item: Outfit) => outfitStorage.add(item)),
    ...data.data.profiles.map((item: UserProfile) => profileStorage.save(item)),
    ...data.data.settings.map((item: AppSettings) => settingsStorage.save(item)),
  ];

  // 添加用户照片（如果存在）
  if (data.data.userPhotos) {
    imports.push(...data.data.userPhotos.map((item: UserPhoto) => userPhotoStorage.add(item)));
  }

  await Promise.all(imports);
}

