import { useWardrobeStore } from '@/store/wardrobe';
import { ClothingCategory, Season } from '@/types';
import { getCategoryName, getSeasonName } from '@/utils/helpers';
import { X } from 'lucide-react';

export default function ClothingFilter() {
  const { filter, setFilter } = useWardrobeStore();

  const categories: ClothingCategory[] = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'];
  const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
  const colors = ['黑色', '白色', '灰色', '红色', '蓝色', '绿色', '黄色', '橙色', '紫色', '粉色', '棕色'];

  const toggleCategory = (category: ClothingCategory) => {
    const current = filter.category || [];
    const updated = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    setFilter({ ...filter, category: updated.length > 0 ? updated : undefined });
  };

  const toggleSeason = (season: Season) => {
    const current = filter.season || [];
    const updated = current.includes(season)
      ? current.filter((s) => s !== season)
      : [...current, season];
    setFilter({ ...filter, season: updated.length > 0 ? updated : undefined });
  };

  const toggleColor = (color: string) => {
    const current = filter.color || [];
    const updated = current.includes(color)
      ? current.filter((c) => c !== color)
      : [...current, color];
    setFilter({ ...filter, color: updated.length > 0 ? updated : undefined });
  };

  const toggleFavorite = () => {
    setFilter({ ...filter, favorite: !filter.favorite });
  };

  const clearFilters = () => {
    setFilter({});
  };

  const hasActiveFilters =
    filter.category?.length ||
    filter.season?.length ||
    filter.color?.length ||
    filter.favorite;

  return (
    <div className="space-y-6">
      {/* 清除筛选 */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">已应用筛选条件</span>
          <button
            onClick={clearFilters}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            <X size={14} />
            清除全部
          </button>
        </div>
      )}

      {/* 类别筛选 */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">类别</h4>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => toggleCategory(category)}
              className={`px-4 py-2 rounded-lg border transition-all ${
                filter.category?.includes(category)
                  ? 'bg-primary-100 border-primary-500 text-primary-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-primary-300'
              }`}
            >
              {getCategoryName(category)}
            </button>
          ))}
        </div>
      </div>

      {/* 季节筛选 */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">季节</h4>
        <div className="flex flex-wrap gap-2">
          {seasons.map((season) => (
            <button
              key={season}
              onClick={() => toggleSeason(season)}
              className={`px-4 py-2 rounded-lg border transition-all ${
                filter.season?.includes(season)
                  ? 'bg-primary-100 border-primary-500 text-primary-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-primary-300'
              }`}
            >
              {getSeasonName(season)}
            </button>
          ))}
        </div>
      </div>

      {/* 颜色筛选 */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">颜色</h4>
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => toggleColor(color)}
              className={`px-4 py-2 rounded-lg border transition-all ${
                filter.color?.includes(color)
                  ? 'bg-primary-100 border-primary-500 text-primary-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-primary-300'
              }`}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      {/* 收藏筛选 */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filter.favorite || false}
            onChange={toggleFavorite}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">仅显示收藏</span>
        </label>
      </div>
    </div>
  );
}

