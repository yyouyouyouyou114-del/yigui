import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWardrobeStore } from '@/store/wardrobe';
import { 
  Shirt, 
  Sparkles, 
  TrendingUp, 
  Calendar,
  ArrowRight
} from 'lucide-react';
import { getCategoryName, getSeasonName, formatDate, getCurrentSeason } from '@/utils/helpers';

export default function Dashboard() {
  const navigate = useNavigate();
  const clothing = useWardrobeStore((state) => state.clothing);
  const outfits = useWardrobeStore((state) => state.outfits);

  // 统计数据
  const stats = useMemo(() => {
    const byCategory = clothing.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const currentSeason = getCurrentSeason();
    const seasonalItems = clothing.filter((item) =>
      item.season.includes(currentSeason)
    );

    const recentItems = [...clothing]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 6);

    return {
      totalItems: clothing.length,
      totalOutfits: outfits.length,
      byCategory,
      seasonalItems: seasonalItems.length,
      recentItems,
    };
  }, [clothing, outfits]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 欢迎区域 */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-700 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">欢迎回来！</h2>
        <p className="text-primary-100 mb-4">
          今天是 {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        
        {/* 功能介绍 - 简洁版 */}
        <div className="flex items-center gap-2 text-white/90">
          <Sparkles size={18} className="flex-shrink-0" />
          <p className="text-sm md:text-base">
            智能虚拟衣柜 · AI 智能抠图 · 衣物分类管理 · 虚拟试穿预览 · 场合搭配推荐 · 本地隐私存储
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Shirt className="text-primary-600" size={24} />}
          title="衣物总数"
          value={stats.totalItems}
          subtitle="件衣物"
          trend="+5 本周"
        />
        <StatCard
          icon={<Sparkles className="text-purple-600" size={24} />}
          title="搭配方案"
          value={stats.totalOutfits}
          subtitle="套搭配"
          trend="+2 本周"
        />
        <StatCard
          icon={<Calendar className="text-blue-600" size={24} />}
          title="本季可穿"
          value={stats.seasonalItems}
          subtitle={`${getSeasonName(getCurrentSeason())}衣物`}
        />
        <StatCard
          icon={<TrendingUp className="text-green-600" size={24} />}
          title="使用率"
          value="85%"
          subtitle="衣物活跃度"
          trend="+12% 较上月"
        />
      </div>

      {/* 快速操作 */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/wardrobe')}
            className="p-4 rounded-lg border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-all text-center group"
          >
            <Shirt className="mx-auto mb-2 text-gray-600 group-hover:text-primary-600" size={24} />
            <p className="text-sm font-medium text-gray-900">添加衣物</p>
          </button>
          <button
            onClick={() => navigate('/virtual-tryon')}
            className="p-4 rounded-lg border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-center group"
          >
            <Sparkles className="mx-auto mb-2 text-gray-600 group-hover:text-purple-600" size={24} />
            <p className="text-sm font-medium text-gray-900">虚拟试穿</p>
          </button>
          <button
            onClick={() => navigate('/recommendations')}
            className="p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-center group"
          >
            <TrendingUp className="mx-auto mb-2 text-gray-600 group-hover:text-blue-600" size={24} />
            <p className="text-sm font-medium text-gray-900">搭配推荐</p>
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="p-4 rounded-lg border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all text-center group"
          >
            <Calendar className="mx-auto mb-2 text-gray-600 group-hover:text-green-600" size={24} />
            <p className="text-sm font-medium text-gray-900">数据备份</p>
          </button>
        </div>
      </div>

      {/* 当前季节衣物 */}
      {stats.seasonalItems > 0 && (
        <div className="card p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {getSeasonName(getCurrentSeason())}衣物
              </h3>
              <p className="text-gray-600">
                您有 <span className="font-bold text-primary-600">{stats.seasonalItems}</span> 件适合当前季节的衣物
              </p>
            </div>
            <button
              onClick={() => navigate('/wardrobe')}
              className="btn-primary"
            >
              查看衣柜
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  trend?: string;
}

function StatCard({ icon, title, value, subtitle, trend }: StatCardProps) {
  return (
    <div className="card p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-gray-50 rounded-lg">{icon}</div>
      </div>
      <div className="space-y-1">
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
        {trend && (
          <p className="text-xs text-green-600 font-medium mt-2">{trend}</p>
        )}
      </div>
    </div>
  );
}

