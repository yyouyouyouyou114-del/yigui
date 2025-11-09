/**
 * 数据备份与恢复服务
 * 支持导出到本地 JSON 文件和从文件恢复
 */

import { exportAllData, importAllData } from './db';

/**
 * 导出数据到 JSON 文件
 */
export async function exportToFile(): Promise<void> {
  try {
    // 获取所有数据
    const data = await exportAllData();

    // 转换为 JSON 字符串
    const jsonString = JSON.stringify(data, null, 2);

    // 创建 Blob
    const blob = new Blob([jsonString], { type: 'application/json' });

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // 生成文件名（包含日期时间）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    link.download = `智能衣柜备份_${timestamp}.json`;

    // 触发下载
    document.body.appendChild(link);
    link.click();

    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('✅ 数据导出成功');
  } catch (error) {
    console.error('❌ 数据导出失败:', error);
    throw new Error('数据导出失败');
  }
}

/**
 * 从 JSON 文件导入数据
 */
export async function importFromFile(file: File): Promise<void> {
  try {
    // 验证文件类型
    if (!file.name.endsWith('.json')) {
      throw new Error('请选择 JSON 格式的备份文件');
    }

    // 读取文件内容
    const text = await file.text();
    const data = JSON.parse(text);

    // 验证数据格式
    if (!data.version || !data.data) {
      throw new Error('备份文件格式不正确');
    }

    // 导入数据
    await importAllData(data);

    console.log('✅ 数据导入成功');
  } catch (error) {
    console.error('❌ 数据导入失败:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('数据导入失败');
  }
}

/**
 * 自动备份到 localStorage（作为应急备份）
 */
export async function autoBackupToLocalStorage(): Promise<void> {
  try {
    const data = await exportAllData();
    const jsonString = JSON.stringify(data);
    
    // 检查大小（localStorage 限制约 5-10MB）
    const sizeInMB = new Blob([jsonString]).size / (1024 * 1024);
    if (sizeInMB > 5) {
      console.warn('⚠️ 数据过大，跳过 localStorage 备份');
      return;
    }

    localStorage.setItem('wardrobe-auto-backup', jsonString);
    localStorage.setItem('wardrobe-auto-backup-time', new Date().toISOString());
    
    console.log('✅ 自动备份到 localStorage 成功');
  } catch (error) {
    console.error('❌ 自动备份失败:', error);
  }
}

/**
 * 从 localStorage 恢复备份
 */
export async function restoreFromLocalStorage(): Promise<boolean> {
  try {
    const backupString = localStorage.getItem('wardrobe-auto-backup');
    if (!backupString) {
      return false;
    }

    const data = JSON.parse(backupString);
    await importAllData(data);

    console.log('✅ 从 localStorage 恢复成功');
    return true;
  } catch (error) {
    console.error('❌ 从 localStorage 恢复失败:', error);
    return false;
  }
}

/**
 * 获取最后备份时间
 */
export function getLastBackupTime(): Date | null {
  const timeString = localStorage.getItem('wardrobe-auto-backup-time');
  if (!timeString) {
    return null;
  }
  return new Date(timeString);
}

/**
 * 检查是否需要自动备份（超过24小时）
 */
export function shouldAutoBackup(): boolean {
  const lastBackup = getLastBackupTime();
  if (!lastBackup) {
    return true;
  }

  const hoursSinceBackup = (Date.now() - lastBackup.getTime()) / (1000 * 60 * 60);
  return hoursSinceBackup >= 24;
}

/**
 * 启动自动备份定时器（每24小时）
 */
export function startAutoBackup(): void {
  // 立即执行一次检查
  if (shouldAutoBackup()) {
    autoBackupToLocalStorage();
  }

  // 每小时检查一次是否需要备份
  setInterval(() => {
    if (shouldAutoBackup()) {
      autoBackupToLocalStorage();
    }
  }, 60 * 60 * 1000); // 1小时

  console.log('🔄 自动备份定时器已启动');
}
