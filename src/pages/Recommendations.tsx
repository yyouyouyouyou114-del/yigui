import { useState, useMemo } from 'react';
import { useWardrobeStore } from '@/store/wardrobe';
import { recommendationEngine } from '@/services/ai/recommendation';
import { Clothing, Season, Occasion } from '@/types';
import { Lightbulb, Sparkles, RefreshCw } from 'lucide-react';
import { getCurrentSeason, getSeasonName } from '@/utils/helpers';

type RecommendationType = 'season' | 'outfit' | 'occasion' | 'underutilized';

export default function Recommendations() {
  const clothing = useWardrobeStore((state) => state.clothing);
  
  const [recommendationType, setRecommendationType] = useState<RecommendationType>('season');
  const [selectedItem, setSelectedItem] = useState<Clothing | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season>(getCurrentSeason());
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion>('casual');

  // 生成推荐
  const recommendations = useMemo(() => {
    if (clothing.length === 0) return [];

    switch (recommendationType) {
      case 'season':
        return recommendationEngine.recommendBySeason(clothing, selectedSeason);
      
      case 'outfit':
        if (!selectedItem) return [];
        return recommendationEngine.recommendOutfit(selectedItem, clothing);
      
      case 'occasion':
        return recommendationEngine.recommendByOccasion(clothing, selectedOccasion);
      
      case 'underutilized':
        return [recommendationEngine.recommendUnderutilized(clothing)];
      
      default:
        return [];
    }
  }, [clothing, recommendationType, selectedItem, selectedSeason, selectedOccasion]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页头 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">智能推荐</h2>
        <p className="text-gray-500 mt-1">基于AI的个性化穿搭建议</p>
      </div>

      {/* 推荐类型选择 */}
      <div className="card p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setRecommendationType('season')}
            className={`p-4 rounded-lg border-2 transition-all ${
              recommendationType === 'season'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300'
            }`}
          >
            <Sparkles size={24} className="mx-auto mb-2 text-primary-600" />
            <p className="font-medium text-sm">季节推荐</p>
          </button>

          <button
            onClick={() => setRecommendationType('outfit')}
            className={`p-4 rounded-lg border-2 transition-all ${
              recommendationType === 'outfit'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300'
            }`}
          >
            <Lightbulb size={24} className="mx-auto mb-2 text-yellow-600" />
            <p className="font-medium text-sm">搭配推荐</p>
          </button>

          <button
            onClick={() => setRecommendationType('occasion')}
            className={`p-4 rounded-lg border-2 transition-all ${
              recommendationType === 'occasion'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300'
            }`}
          >
            <Sparkles size={24} className="mx-auto mb-2 text-blue-600" />
            <p className="font-medium text-sm">场合推荐</p>
          </button>

          <button
            onClick={() => setRecommendationType('underutilized')}
            className={`p-4 rounded-lg border-2 transition-all ${
              recommendationType === 'underutilized'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300'
            }`}
          >
            <RefreshCw size={24} className="mx-auto mb-2 text-green-600" />
            <p className="font-medium text-sm">冷门衣物</p>
          </button>
        </div>
      </div>

      {/* 推荐选项 */}
      {recommendationType === 'season' && (
        <div className="card p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择季节
          </label>
          <div className="flex gap-2">
            {(['spring', 'summer', 'autumn', 'winter'] as Season[]).map((season) => (
              <button
                key={season}
                onClick={() => setSelectedSeason(season)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  selectedSeason === season
                    ? 'bg-primary-100 border-primary-500 text-primary-700'
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                {getSeasonName(season)}
              </button>
            ))}
          </div>
        </div>
      )}

      {recommendationType === 'outfit' && (
        <div className="card p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择一件衣物，为您推荐搭配
          </label>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {clothing.slice(0, 20).map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  selectedItem?.id === item.id
                    ? 'border-primary-500 ring-2 ring-primary-200'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                <img
                  src={URL.createObjectURL(new Blob([item.imageData]))}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {recommendationType === 'occasion' && (
        <div className="card p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择场合
          </label>
          <div className="flex flex-wrap gap-2">
            {(['casual', 'work', 'formal', 'sport', 'party', 'outdoor'] as Occasion[]).map(
              (occasion) => (
                <button
                  key={occasion}
                  onClick={() => setSelectedOccasion(occasion)}
                  className={`px-4 py-2 rounded-lg border transition-all ${
                    selectedOccasion === occasion
                      ? 'bg-primary-100 border-primary-500 text-primary-700'
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  {getOccasionName(occasion)}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* 推荐结果 */}
      <div className="space-y-6">
        {recommendations.length > 0 ? (
          recommendations.map((rec, index) => (
            <div key={index} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{rec.reason}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    推荐指数: {(rec.score * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {rec.items.map((item) => (
                  <div key={item.id} className="group cursor-pointer">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                      <img
                        src={URL.createObjectURL(new Blob([item.imageData]))}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500">{item.color}</p>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="card p-12 text-center">
            <Lightbulb size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {recommendationType === 'outfit' && !selectedItem
                ? '请选择一件衣物'
                : '暂无推荐'}
            </h3>
            <p className="text-gray-500">
              {recommendationType === 'outfit' && !selectedItem
                ? '选择一件衣物后，系统将为您推荐搭配方案'
                : '添加更多衣物后，推荐会更加精准'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function getOccasionName(occasion: Occasion): string {
  const names: Record<Occasion, string> = {
    casual: '休闲',
    work: '工作',
    formal: '正式',
    sport: '运动',
    party: '派对',
    outdoor: '户外',
  };
  return names[occasion];
}

