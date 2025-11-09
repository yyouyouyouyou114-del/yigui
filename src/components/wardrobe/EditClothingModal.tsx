import { useState } from 'react';
import { useWardrobeStore } from '@/store/wardrobe';
import { Clothing, ClothingCategory, Season, Occasion } from '@/types';
import { getCategoryName, getSeasonName } from '@/utils/helpers';
import { X, Loader } from 'lucide-react';

interface EditClothingModalProps {
  item: Clothing;
  onClose: () => void;
}

export default function EditClothingModal({ item, onClose }: EditClothingModalProps) {
  const { updateClothing } = useWardrobeStore();
  const [loading, setLoading] = useState(false);

  // 表单数据
  const [formData, setFormData] = useState({
    name: item.name,
    category: item.category,
    season: item.season,
    color: item.color,
    brand: item.brand || '',
    price: item.price?.toString() || '',
    tags: item.tags.join(', '),
    occasions: item.occasions || [],
  });

  // 季节切换
  const toggleSeason = (season: Season) => {
    setFormData((prev) => ({
      ...prev,
      season: prev.season.includes(season)
        ? prev.season.filter((s) => s !== season)
        : [...prev.season, season],
    }));
  };

  // 场合切换
  const toggleOccasion = (occasion: Occasion) => {
    setFormData((prev) => ({
      ...prev,
      occasions: prev.occasions.includes(occasion)
        ? prev.occasions.filter((o) => o !== occasion)
        : [...prev.occasions, occasion],
    }));
  };

  // 提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('请输入衣物名称');
      return;
    }

    if (formData.season.length === 0) {
      alert('请至少选择一个季节');
      return;
    }

    if (formData.occasions.length === 0) {
      alert('请至少选择一个适用场合');
      return;
    }

    setLoading(true);
    try {
      const updatedItem: Clothing = {
        ...item,
        name: formData.name.trim(),
        category: formData.category,
        season: formData.season,
        color: formData.color,
        brand: formData.brand.trim() || undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
        tags: formData.tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t),
        occasions: formData.occasions,
        updatedAt: new Date(),
      };

      await updateClothing(updatedItem);
      onClose();
    } catch (error) {
      console.error('更新失败:', error);
      alert('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">编辑衣物</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 图片预览 */}
            <div className="flex justify-center">
              <div className="w-64 h-64 bg-gray-100 rounded-xl overflow-hidden">
                <img
                  src={URL.createObjectURL(new Blob([item.imageData]))}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">类别 *</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as ClothingCategory,
                    })
                  }
                  className="input"
                >
                  <option value="top">上衣</option>
                  <option value="bottom">裤装</option>
                  <option value="dress">连衣裙</option>
                  <option value="outerwear">外套</option>
                  <option value="shoes">鞋履</option>
                  <option value="accessory">配饰</option>
                </select>
              </div>

              <div>
                <label className="label">颜色</label>
                <select
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="input"
                >
                  <option value="">请选择颜色</option>
                  <option value="黑色">黑色</option>
                  <option value="白色">白色</option>
                  <option value="灰色">灰色</option>
                  <option value="红色">红色</option>
                  <option value="粉色">粉色</option>
                  <option value="橙色">橙色</option>
                  <option value="黄色">黄色</option>
                  <option value="绿色">绿色</option>
                  <option value="蓝色">蓝色</option>
                  <option value="紫色">紫色</option>
                  <option value="棕色">棕色</option>
                  <option value="米色">米色</option>
                  <option value="卡其色">卡其色</option>
                  <option value="藏青色">藏青色</option>
                  <option value="酒红色">酒红色</option>
                  <option value="天蓝色">天蓝色</option>
                  <option value="军绿色">军绿色</option>
                  <option value="彩色">彩色</option>
                  <option value="其他">其他</option>
                </select>
              </div>

              <div>
                <label className="label">品牌</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) =>
                    setFormData({ ...formData, brand: e.target.value })
                  }
                  className="input"
                  placeholder="例如：ZARA、优衣库"
                />
              </div>

              <div>
                <label className="label">价格</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    ¥
                  </span>
                  <input
                    type="text"
                    value={formData.price}
                    onChange={(e) => {
                      // 只允许输入数字和小数点
                      const value = e.target.value.replace(/[^\d.]/g, '');
                      setFormData({ ...formData, price: value });
                    }}
                    className="input pl-8"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* 季节 */}
            <div>
              <label className="label">适用季节 *</label>
              <div className="flex gap-2">
                {(['spring', 'summer', 'autumn', 'winter'] as Season[]).map(
                  (season) => (
                    <button
                      key={season}
                      type="button"
                      onClick={() => toggleSeason(season)}
                      className={`px-4 py-2 rounded-lg border transition-all ${
                        formData.season.includes(season)
                          ? 'bg-primary-100 border-primary-500 text-primary-700'
                          : 'bg-white border-gray-300 text-gray-700'
                      }`}
                    >
                      {getSeasonName(season)}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* 标签 */}
            <div>
              <label className="label">标签</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                className="input"
                placeholder="例如：休闲,日常,舒适"
              />
              <p className="text-xs text-gray-500 mt-1">
                用逗号分隔多个标签
              </p>
            </div>

            {/* 适用场合 */}
            <div>
              <label className="label">适用场合 *</label>
              <div className="flex flex-wrap gap-2">
                {(['casual', 'work', 'formal', 'sport', 'party', 'outdoor'] as Occasion[]).map(
                  (occasion) => (
                    <button
                      key={occasion}
                      type="button"
                      onClick={() => toggleOccasion(occasion)}
                      className={`px-4 py-2 rounded-lg border transition-all ${
                        formData.occasions.includes(occasion)
                          ? 'bg-primary-100 border-primary-500 text-primary-700'
                          : 'bg-white border-gray-300 text-gray-700'
                      }`}
                    >
                      {getOccasionName(occasion)}
                    </button>
                  )
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                可选择多个适用场合
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-4 pt-4 border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader size={20} className="inline mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存修改'
                )}
              </button>
            </div>
          </form>
        </div>
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
