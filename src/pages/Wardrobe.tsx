import { useState } from 'react';
import { useWardrobeStore } from '@/store/wardrobe';
import { Plus, Search, Filter, Grid, List } from 'lucide-react';
import ClothingGrid from '@/components/wardrobe/ClothingGrid';
import ClothingFilter from '@/components/wardrobe/ClothingFilter';
import AddClothingModal from '@/components/wardrobe/AddClothingModal';

export default function Wardrobe() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilter, setShowFilter] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchText, setSearchText] = useState('');

  const { filter, setFilter } = useWardrobeStore();

  const handleSearch = (value: string) => {
    setSearchText(value);
    setFilter({ ...filter, searchText: value || undefined });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">我的衣柜</h2>
          <p className="text-gray-500 mt-1">管理您的所有衣物</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
        >
          <Plus size={20} className="inline mr-2" />
          添加衣物
        </button>
      </div>

      {/* 工具栏 */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
          {/* 搜索 */}
          <div className="flex-1 relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="搜索衣物名称、品牌、标签..."
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* 筛选按钮 */}
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`btn ${showFilter ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Filter size={20} className="inline mr-2" />
            筛选
          </button>

          {/* 视图切换 */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${
                viewMode === 'grid'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Grid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${
                viewMode === 'list'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {/* 筛选面板 */}
        {showFilter && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <ClothingFilter />
          </div>
        )}
      </div>

      {/* 衣物列表 */}
      <ClothingGrid viewMode={viewMode} />

      {/* 添加衣物模态框 */}
      {showAddModal && (
        <AddClothingModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

