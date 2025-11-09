import { Bell, User, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* 左侧：页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">智能虚拟衣柜</h1>
          <p className="text-sm text-gray-500 mt-1">管理您的时尚生活</p>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-4">
          {/* 通知 */}
          <button
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative"
            title="通知"
          >
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* 设置 */}
          <button
            onClick={() => navigate('/settings')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="设置"
          >
            <Settings size={20} />
          </button>

          {/* 用户头像 */}
          <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">用户</span>
          </button>
        </div>
      </div>
    </header>
  );
}

