import { useMemo, useState } from 'react';
import { useWardrobeStore } from '@/store/wardrobe';
import { Clothing } from '@/types';
import { 
  Heart, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  ShoppingBag
} from 'lucide-react';
import { getCategoryName, formatDate, formatPrice } from '@/utils/helpers';
import ClothingDetailModal from './ClothingDetailModal';
import EditClothingModal from './EditClothingModal';

interface ClothingGridProps {
  viewMode: 'grid' | 'list';
}

export default function ClothingGrid({ viewMode }: ClothingGridProps) {
  const filteredClothing = useWardrobeStore((state) => state.getFilteredClothing());
  const [selectedItem, setSelectedItem] = useState<Clothing | null>(null);
  const [editingItem, setEditingItem] = useState<Clothing | null>(null);

  if (filteredClothing.length === 0) {
    return (
      <div className="card p-12 text-center">
        <ShoppingBag size={64} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">暂无衣物</h3>
        <p className="text-gray-500 mb-6">
          开始添加您的第一件衣物吧！
        </p>
      </div>
    );
  }

  return (
    <>
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredClothing.map((item) => (
            <ClothingCard
              key={item.id}
              item={item}
              onView={() => setSelectedItem(item)}
              onEdit={() => setEditingItem(item)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClothing.map((item) => (
            <ClothingListItem
              key={item.id}
              item={item}
              onView={() => setSelectedItem(item)}
              onEdit={() => setEditingItem(item)}
            />
          ))}
        </div>
      )}

      {/* 详情模态框 */}
      {selectedItem && (
        <ClothingDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* 编辑模态框 */}
      {editingItem && (
        <EditClothingModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </>
  );
}

interface ClothingCardProps {
  item: Clothing;
  onView: () => void;
  onEdit: () => void;
}

function ClothingCard({ item, onView, onEdit }: ClothingCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { updateClothing, deleteClothing } = useWardrobeStore();

  const preferredSrc = useMemo(() => {
    const isSample = item.tags?.includes('示例衣物') || /（示例）/.test(item.name || '');
    if (item.id === 'sample-dress-green' || (isSample && /绿/.test(item.color || item.name))) {
      return '/sample-dress-green.png';
    }
    if (item.id === 'sample-dress-pink' || (isSample && /粉/.test(item.color || item.name))) {
      return '/sample-dress-pink.png';
    }
    try {
      const buf = item.imageData;
      if (buf && buf.byteLength > 128) {
        return URL.createObjectURL(new Blob([buf], { type: 'image/jpeg' }));
      }
    } catch {}
    return '';
  }, [item]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await updateClothing({
      ...item,
      favorite: !item.favorite,
      updatedAt: new Date(),
    });
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`确定要删除"${item.name}"吗？`)) {
      await deleteClothing(item.id);
    }
  };

  return (
    <div
      onClick={onView}
      className="card cursor-pointer hover:shadow-lg transition-all group"
    >
      {/* 图片 */}
      <div className="aspect-square bg-gray-100 overflow-hidden relative">
        <img
          src={preferredSrc}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        
        {/* 悬浮操作 */}
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={toggleFavorite}
            className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50"
          >
            <Heart
              size={16}
              className={item.favorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}
            />
          </button>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50"
            >
              <MoreVertical size={16} className="text-gray-600" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onView();
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Eye size={14} />
                  查看
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onEdit();
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit size={14} />
                  编辑
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  删除
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 标签 */}
        <div className="absolute bottom-2 left-2">
          <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded text-xs font-medium">
            {getCategoryName(item.category)}
          </span>
        </div>
      </div>

      {/* 信息 */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-gray-500">{item.color}</span>
          {item.price && (
            <span className="text-sm font-medium text-primary-600">
              {formatPrice(item.price)}
            </span>
          )}
        </div>
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-gray-100 text-xs text-gray-600 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ClothingListItem({ item, onView, onEdit }: ClothingCardProps) {
  const { updateClothing, deleteClothing } = useWardrobeStore();

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await updateClothing({
      ...item,
      favorite: !item.favorite,
      updatedAt: new Date(),
    });
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`确定要删除"${item.name}"吗？`)) {
      await deleteClothing(item.id);
    }
  };

  return (
    <div
      onClick={onView}
      className="card p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* 图片 */}
      <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={useMemo(() => {
            const isSample = item.tags?.includes('示例衣物') || /（示例）/.test(item.name || '');
            if (item.id === 'sample-dress-green' || (isSample && /绿/.test(item.color || item.name))) {
              return '/sample-dress-green.png';
            }
            if (item.id === 'sample-dress-pink' || (isSample && /粉/.test(item.color || item.name))) {
              return '/sample-dress-pink.png';
            }
            try {
              if (item.imageData && item.imageData.byteLength > 128) {
                return URL.createObjectURL(new Blob([item.imageData], { type: 'image/jpeg' }));
              }
            } catch {}
            return '';
          }, [item])}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
          <span>{getCategoryName(item.category)}</span>
          <span>•</span>
          <span>{item.color}</span>
          {item.brand && (
            <>
              <span>•</span>
              <span>{item.brand}</span>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-gray-100 text-xs text-gray-600 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* 右侧信息 */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          {item.price && (
            <div className="font-medium text-primary-600">
              {formatPrice(item.price)}
            </div>
          )}
          <div className="text-xs text-gray-500 mt-1">
            {formatDate(item.createdAt)}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={toggleFavorite}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Heart
              size={18}
              className={item.favorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}
            />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg text-primary-600"
          >
            <Edit size={18} />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 hover:bg-gray-100 rounded-lg text-red-600"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

