import { Clothing, Occasion } from '@/types';
import { useMemo } from 'react';
import { X, Heart, Calendar, Tag, Palette, ShoppingBag } from 'lucide-react';
import { getCategoryName, getSeasonName, formatDate, formatPrice } from '@/utils/helpers';
import { useWardrobeStore } from '@/store/wardrobe';

interface ClothingDetailModalProps {
  item: Clothing;
  onClose: () => void;
}

export default function ClothingDetailModal({ item, onClose }: ClothingDetailModalProps) {
  const { updateClothing } = useWardrobeStore();

  const getSampleClothingUrl = (id?: string) => {
    if (!id) return undefined;
    if (id === 'sample-dress-green') return '/sample-dress-green.png';
    if (id === 'sample-dress-pink') return '/sample-dress-pink.png';
    return undefined;
  };

  // 根据条目判断是否为前端内置示例
  const getSampleUrlByItem = (it: Clothing): string | undefined => {
    if (!it) return undefined;
    if (it.id === 'sample-dress-green') return '/sample-dress-green.png';
    if (it.id === 'sample-dress-pink') return '/sample-dress-pink.png';
    const isSample = it.tags?.includes('示例衣物') || /（示例）/.test(it.name || '');
    if (isSample) {
      if (/绿/.test(it.color || it.name)) return '/sample-dress-green.png';
      if (/粉/.test(it.color || it.name)) return '/sample-dress-pink.png';
    }
    return undefined;
  };

  // 计算优先图片来源：若为“示例衣物”，永远走 public；否则用本地二进制
  const preferredSrc = useMemo(() => {
    const sampleUrl = getSampleUrlByItem(item);
    if (sampleUrl) return sampleUrl;
    try {
      if (item.imageData && item.imageData.byteLength > 128) {
        return URL.createObjectURL(new Blob([item.imageData], { type: 'image/jpeg' }));
      }
    } catch {}
    return getSampleClothingUrl(item.id) ?? '';
  }, [item]);

  const toggleFavorite = async () => {
    await updateClothing({
      ...item,
      favorite: !item.favorite,
      updatedAt: new Date(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{item.name}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFavorite}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Heart
                size={20}
                className={item.favorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}
              />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 左侧：图片 */}
            <div>
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                <img
                  src={preferredSrc}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* 右侧：详细信息 */}
            <div className="space-y-6">
              {/* 基本信息 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  基本信息
                </h3>
                <div className="space-y-3">
                  <InfoItem
                    icon={<Tag size={18} />}
                    label="类别"
                    value={getCategoryName(item.category)}
                  />
                  <InfoItem
                    icon={<Palette size={18} />}
                    label="颜色"
                    value={
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border-2 border-gray-300"
                          style={{ backgroundColor: item.colorHex }}
                        ></div>
                        {item.color}
                      </div>
                    }
                  />
                  <InfoItem
                    icon={<Calendar size={18} />}
                    label="季节"
                    value={item.season.map(getSeasonName).join('、')}
                  />
                  {item.brand && (
                    <InfoItem
                      icon={<ShoppingBag size={18} />}
                      label="品牌"
                      value={item.brand}
                    />
                  )}
                  {item.price && (
                    <InfoItem
                      icon={<ShoppingBag size={18} />}
                      label="价格"
                      value={formatPrice(item.price)}
                    />
                  )}
                </div>
              </div>

              {/* 标签 */}
              {item.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    标签
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 适用场合 */}
              {item.occasions && item.occasions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    适用场合
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {item.occasions.map((occasion) => (
                      <span
                        key={occasion}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                      >
                        {getOccasionName(occasion)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 使用统计 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  使用统计
                </h3>
                <div className="space-y-3">
                  <InfoItem
                    label="穿着次数"
                    value={`${item.wearCount || 0} 次`}
                  />
                  {item.lastWornDate && (
                    <InfoItem
                      label="最后穿着"
                      value={formatDate(item.lastWornDate)}
                    />
                  )}
                  <InfoItem
                    label="添加日期"
                    value={formatDate(item.createdAt)}
                  />
                </div>
              </div>

              {/* 投资回报 */}
              {item.price && item.wearCount && item.wearCount > 0 && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-sm text-green-800 mb-1">单次穿着成本</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatPrice(item.price / item.wearCount)}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    已穿 {item.wearCount} 次
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface InfoItemProps {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function InfoItem({ icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-start gap-3">
      {icon && <div className="text-gray-400 mt-0.5">{icon}</div>}
      <div className="flex-1">
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-base font-medium text-gray-900">{value}</div>
      </div>
    </div>
  );
}

// 场合名称映射
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

