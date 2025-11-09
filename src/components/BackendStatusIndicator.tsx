import { useState, useEffect } from 'react';
import { backendHealthMonitor } from '@/services/backend-health-monitor';
import { Wifi, WifiOff, Loader } from 'lucide-react';

/**
 * 后端状态指示器
 * 显示在页面右下角，实时显示后端连接状态
 */
export default function BackendStatusIndicator() {
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [message, setMessage] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // 订阅后端状态变化
    const unsubscribe = backendHealthMonitor.subscribe((newStatus, newMessage) => {
      setStatus(newStatus);
      setMessage(newMessage || '');
      
      // 如果离线，自动显示详情
      if (newStatus === 'offline') {
        setShowDetails(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 只在离线或检查中时显示
  if (status === 'online' && !showDetails) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
      {/* 状态卡片 */}
      <div
        className={`
          rounded-lg shadow-lg p-4 max-w-sm cursor-pointer transition-all
          ${status === 'online' ? 'bg-green-50 border-2 border-green-500' : ''}
          ${status === 'offline' ? 'bg-red-50 border-2 border-red-500' : ''}
          ${status === 'checking' ? 'bg-yellow-50 border-2 border-yellow-500' : ''}
        `}
        onClick={() => setShowDetails(!showDetails)}
      >
        {/* 状态图标和标题 */}
        <div className="flex items-center gap-3">
          {status === 'online' && (
            <>
              <Wifi className="text-green-600 flex-shrink-0" size={24} />
              <div className="flex-1">
                <p className="font-semibold text-green-900">后端服务在线</p>
                <p className="text-xs text-green-700">连接正常</p>
              </div>
            </>
          )}
          
          {status === 'offline' && (
            <>
              <WifiOff className="text-red-600 flex-shrink-0 animate-pulse" size={24} />
              <div className="flex-1">
                <p className="font-semibold text-red-900">后端服务离线</p>
                <p className="text-xs text-red-700">正在尝试重连...</p>
              </div>
            </>
          )}
          
          {status === 'checking' && (
            <>
              <Loader className="text-yellow-600 flex-shrink-0 animate-spin" size={24} />
              <div className="flex-1">
                <p className="font-semibold text-yellow-900">检查连接中</p>
                <p className="text-xs text-yellow-700">请稍候...</p>
              </div>
            </>
          )}
        </div>

        {/* 详细信息（展开时） */}
        {showDetails && status === 'offline' && (
          <div className="mt-4 pt-4 border-t border-red-200">
            <p className="text-sm text-red-800 mb-3">
              {message || '无法连接到后端服务'}
            </p>
            
            <div className="space-y-2 text-xs text-red-700">
              <p className="font-semibold">可能的原因：</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>后端服务器未启动</li>
                <li>端口 3100 被占用</li>
                <li>网络连接问题</li>
              </ul>
              
              <p className="font-semibold mt-3">解决方法：</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>运行: <code className="bg-red-100 px-1 rounded">cd backend && npm run dev:fixed</code></li>
                <li>检查终端是否有错误信息</li>
                <li>刷新页面重试</li>
              </ul>
            </div>

            <button
              onClick={async (e) => {
                e.stopPropagation();
                setStatus('checking');
                const isOnline = await backendHealthMonitor.checkNow();
                if (isOnline) {
                  setShowDetails(false);
                }
              }}
              className="mt-4 w-full btn-primary text-sm"
            >
              立即重试
            </button>
          </div>
        )}

        {/* 关闭按钮（在线时） */}
        {showDetails && status === 'online' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(false);
            }}
            className="mt-2 text-xs text-green-600 hover:text-green-700 underline"
          >
            关闭提示
          </button>
        )}
      </div>
    </div>
  );
}

