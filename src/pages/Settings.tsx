import { useState, useEffect } from 'react';
import { useWardrobeStore } from '@/store/wardrobe';
import { VirtualTryOnConfig } from '@/types';
import { VirtualTryOnManager } from '@/services/api/virtual-tryon';
import { exportAllData, importAllData } from '@/services/storage';
import { 
  exportToFile, 
  importFromFile, 
  getLastBackupTime,
  autoBackupToLocalStorage 
} from '@/services/storage/backup';
import { downloadFile, readFile, formatDate } from '@/utils/helpers';
import * as BackendAPI from '@/services/api/backend-api';
import { 
  Save, 
  Download, 
  Upload, 
  Trash2, 
  CheckCircle,
  AlertCircle,
  Loader,
  HardDrive,
  Clock,
  Server
} from 'lucide-react';

export default function Settings() {
  const { settings, updateSettings } = useWardrobeStore();
  const [virtualTryOnConfig, setVirtualTryOnConfig] = useState<VirtualTryOnConfig>(
    settings?.virtualTryOn || {
      enabled: true,
      provider: 'aliyun-bailian',
    }
  );
  
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saving, setSaving] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);
  
  // 后端配置状态
  const [backendConfigStatus, setBackendConfigStatus] = useState<any>(null);
  const [loadingBackendStatus, setLoadingBackendStatus] = useState(false);

  // 获取最后备份时间
  useEffect(() => {
    setLastBackupTime(getLastBackupTime());
  }, []);

  // 加载后端配置状态
  useEffect(() => {
    loadBackendConfig();
  }, []);

  const loadBackendConfig = async () => {
    setLoadingBackendStatus(true);
    try {
      const status = await BackendAPI.getConfigStatus();
      setBackendConfigStatus(status);
      if (status.configured) {
        setConnectionStatus('success');
      }
    } catch (error) {
      console.error('加载后端配置失败:', error);
    } finally {
      setLoadingBackendStatus(false);
    }
  };

  // 保存设置
  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      await updateSettings({
        ...settings,
        virtualTryOn: virtualTryOnConfig,
        updatedAt: new Date(),
      });
      alert('设置已保存');
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 测试后端连接
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus('idle');

    try {
      const result = await BackendAPI.testBackendConnection();
      setConnectionStatus(result.success ? 'success' : 'error');
      
      if (result.success) {
        alert('✅ ' + result.message);
        // 重新加载配置状态
        await loadBackendConfig();
      } else {
        alert('❌ ' + result.message);
      }
    } catch (error) {
      console.error('连接测试失败:', error);
      setConnectionStatus('error');
      alert('❌ 无法连接到后端服务器');
    } finally {
      setTestingConnection(false);
    }
  };

  // 快速备份到文件
  const handleQuickBackup = async () => {
    setExporting(true);
    try {
      await exportToFile();
      // 同时更新本地备份
      await autoBackupToLocalStorage();
      setLastBackupTime(new Date());
      alert('✅ 备份成功！文件已下载到本地。');
    } catch (error) {
      console.error('备份失败:', error);
      alert('备份失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  // 导出数据（兼容旧方法）
  const handleExport = async () => {
    setExporting(true);
    try {
      await exportToFile();
      alert('✅ 导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  // 导入数据
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('导入数据将覆盖现有数据，确定继续吗？')) {
      e.target.value = '';
      return;
    }

    try {
      await importFromFile(file);
      alert('✅ 导入成功！页面将刷新。');
      window.location.reload();
    } catch (error) {
      console.error('导入失败:', error);
      const message = error instanceof Error ? error.message : '导入失败，请检查文件格式';
      alert(`❌ ${message}`);
    }
    e.target.value = '';
  };

  // 清空数据
  const handleClearData = async () => {
    if (!confirm('确定要清空所有数据吗？此操作无法撤销！')) {
      return;
    }

    if (!confirm('再次确认：这将删除所有衣物、搭配和配置，确定继续吗？')) {
      return;
    }

    try {
      await importAllData({
        version: 1,
        exportDate: new Date().toISOString(),
        data: {
          clothing: [],
          outfits: [],
          profiles: [],
          settings: [],
        },
      });
      alert('数据已清空');
      window.location.reload();
    } catch (error) {
      console.error('清空失败:', error);
      alert('清空失败，请重试');
    }
  };

  return (
    <div className="animate-fade-in">
      {/* 页头 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">设置</h2>
        <p className="text-gray-500 mt-1">配置应用参数和管理数据</p>
      </div>

      {/* 主内容区 - 使用栅格布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 数据管理 */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              数据管理
            </h3>
            {lastBackupTime && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock size={14} />
                最后备份：{formatDate(lastBackupTime)}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* 自动备份状态 */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <HardDrive className="text-blue-600 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-1">自动备份已启用</p>
                  <p className="text-sm text-gray-600 mb-3">
                    系统每 24 小时自动将数据备份到浏览器本地存储，防止意外丢失。建议定期手动备份到文件以获得更安全的保障。
                  </p>
                  <button
                    onClick={handleQuickBackup}
                    disabled={exporting}
                    className="btn-primary text-sm"
                  >
                    {exporting ? (
                      <>
                        <Loader size={16} className="inline mr-2 animate-spin" />
                        备份中...
                      </>
                    ) : (
                      <>
                        <Download size={16} className="inline mr-2" />
                        立即备份到文件
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 数据操作 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 导出数据 */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">导出数据</p>
                  <p className="text-sm text-gray-500">
                    下载备份文件
                  </p>
                </div>
                <button 
                  onClick={handleExport} 
                  disabled={exporting}
                  className="btn-outline"
                >
                  <Download size={20} className="inline mr-2" />
                  导出
                </button>
              </div>

              {/* 导入数据 */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">导入数据</p>
                  <p className="text-sm text-gray-500">
                    从文件恢复
                  </p>
                </div>
                <label className="btn-outline cursor-pointer">
                  <Upload size={20} className="inline mr-2" />
                  导入
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* 清空数据 */}
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
              <div>
                <p className="font-medium text-red-900">清空所有数据</p>
                <p className="text-sm text-red-600">
                  删除所有衣物、搭配和配置（不可恢复）
                </p>
              </div>
              <button
                onClick={handleClearData}
                className="btn bg-red-600 text-white hover:bg-red-700"
              >
                <Trash2 size={20} className="inline mr-2" />
                清空
              </button>
            </div>
          </div>
        </div>

        {/* 关于 */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">关于</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>版本:</strong> 0.1.0 (MVP)</p>
            <p><strong>构建日期:</strong> {new Date().toLocaleDateString('zh-CN')}</p>
            <p><strong>技术栈:</strong> React 18 + TypeScript + Tailwind CSS</p>
            <p className="pt-4 border-t border-gray-200">
              <strong>开源协议:</strong> MIT License
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

