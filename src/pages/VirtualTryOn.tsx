import { useState, useEffect } from 'react';
import { useWardrobeStore } from '@/store/wardrobe';
import { Clothing, UserPhoto } from '@/types';
import { VirtualTryOnManager, TryOnResult } from '@/services/api/virtual-tryon';
import * as BackendAPI from '@/services/api/backend-api';
import { userPhotoStorage } from '@/services/storage';
import { compressImage, createThumbnail } from '@/services/storage/image-processor';
import { generateId } from '@/utils/helpers';
import { hasTransparentBackground, calculateTransparencyPercentage } from '@/utils/image-helpers';
import { removeImageBackground, blobToFile } from '@/services/ai/image-segmentation';
import { 
  Upload, 
  Sparkles, 
  Download, 
  AlertCircle, 
  Settings as SettingsIcon,
  Save,
  Image as ImageIcon,
  Trash2,
  Check,
  CheckCircle,
  Info,
  Scissors
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// 辅助函数：获取示例衣物的URL
const getSampleClothingUrl = (id: string, name: string, color: string, tags: string[]): string | null => {
  // 检查是否是示例衣物
  if (tags?.includes('示例') || name.includes('示例')) {
    if (name.includes('绿色') && name.includes('连衣裙')) {
      return '/sample-dress-green.png';
    }
    if (name.includes('粉色') && name.includes('连衣裙')) {
      return '/sample-dress-pink.png';
    }
  }
  return null;
};

export default function VirtualTryOn() {
  const navigate = useNavigate();
  const clothing = useWardrobeStore((state) => state.clothing);
  const settings = useWardrobeStore((state) => state.settings);

  const [personImage, setPersonImage] = useState<File | null>(null);
  const [personPreview, setPersonPreview] = useState<string>('');
  const [selectedClothing, setSelectedClothing] = useState<Clothing | null>(null);
  const [result, setResult] = useState<TryOnResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  // 试穿模式
  const [tryOnMode, setTryOnMode] = useState<'single' | 'separate'>('single');
  const [topClothing, setTopClothing] = useState<Clothing | null>(null);
  const [bottomClothing, setBottomClothing] = useState<Clothing | null>(null);
  
  // 用户照片管理
  const [savedPhotos, setSavedPhotos] = useState<UserPhoto[]>([]);
  const [currentPhoto, setCurrentPhoto] = useState<UserPhoto | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showPhotoManager, setShowPhotoManager] = useState(false);
  
  // 透明背景检测
  const [hasTransparentBg, setHasTransparentBg] = useState<boolean>(false);
  const [transparencyPercent, setTransparencyPercent] = useState<number>(0);
  const [checkingTransparency, setCheckingTransparency] = useState(false);
  
  // 智能抠图
  const [isRemoving, setIsRemoving] = useState(false);
  
  // 示例照片标记
  const [isSamplePhoto, setIsSamplePhoto] = useState(false);

  // 加载已保存的照片
  useEffect(() => {
    loadSavedPhotos();
  }, []);

  const loadSavedPhotos = async () => {
    try {
      const photos = await userPhotoStorage.getAll();
      setSavedPhotos(photos);

      // 自动加载默认照片
      const defaultPhoto = photos.find(p => p.isDefault);
      if (defaultPhoto && !personImage) {
        await loadUserPhoto(defaultPhoto);
      }
    } catch (error) {
      console.error('加载照片失败:', error);
    }
  };

  const loadUserPhoto = async (photo: UserPhoto) => {
    try {
      const blob = new Blob([photo.imageData]);
      const file = new File([blob], photo.name, { type: 'image/jpeg' });
      setPersonImage(file);
      setPersonPreview(URL.createObjectURL(blob));
      setCurrentPhoto(photo);
      setResult(null);
    } catch (error) {
      console.error('加载照片失败:', error);
    }
  };

  const handlePersonImageSelect = async (file: File) => {
    setPersonImage(file);
    setPersonPreview(URL.createObjectURL(file));
    setCurrentPhoto(null); // 标记为新上传的照片
    setResult(null);

    // 检测是否已有透明背景
    setCheckingTransparency(true);
    try {
      const isTransparent = await hasTransparentBackground(file);
      const percent = await calculateTransparencyPercentage(file);
      
      setHasTransparentBg(isTransparent);
      setTransparencyPercent(percent);
      
      console.log('透明背景检测:', {
        hasTransparency: isTransparent,
        percentage: percent.toFixed(2) + '%'
      });
    } catch (error) {
      console.error('透明背景检测失败:', error);
      setHasTransparentBg(false);
      setTransparencyPercent(0);
    } finally {
      setCheckingTransparency(false);
    }

    // 如果没有保存的照片，自动提示保存
    if (savedPhotos.length === 0) {
      setTimeout(() => {
        setShowSaveDialog(true);
      }, 500);
    }
    
    // 标记为用户上传的照片
    setIsSamplePhoto(false);
  };

  const loadSamplePhoto = async () => {
    try {
      const response = await fetch('/sample-user.jpeg');
      const blob = await response.blob();
      const file = new File([blob], 'sample-user.jpeg', { type: 'image/jpeg' });
      
      setPersonImage(file);
      setPersonPreview(URL.createObjectURL(blob));
      setCurrentPhoto(null);
      setResult(null);
      setIsSamplePhoto(true);
      
      console.log('示例照片加载成功');
    } catch (error) {
      console.error('加载示例照片失败:', error);
    }
  };

  const handleRemoveBackground = async () => {
    if (!personImage) return;

    setIsRemoving(true);
    try {
      console.log('开始执行智能抠图（人体照片）...');
      
      // 执行智能抠图
      const resultBlob = await removeImageBackground(personImage);
      
      console.log('抠图完成，开始更新预览');
      
      // 转换为 File
      const resultFile = blobToFile(resultBlob, `removed_${personImage.name}`);
      
      // 创建新的预览URL
      const newPreview = URL.createObjectURL(resultBlob);
      
      // 释放旧的预览URL
      if (personPreview) {
        URL.revokeObjectURL(personPreview);
      }
      
      // 更新照片
      setPersonImage(resultFile);
      setPersonPreview(newPreview);
      
      // 重新检测透明背景
      const isTransparent = await hasTransparentBackground(resultFile);
      const percent = await calculateTransparencyPercentage(resultFile);
      
      setHasTransparentBg(isTransparent);
      setTransparencyPercent(percent);
      
      console.log('预览更新完成');
      alert('✅ 智能抠图完成！背景已移除。');
    } catch (error) {
      console.error('智能抠图失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`❌ 智能抠图失败\n\n${errorMessage}\n\n请查看浏览器控制台(F12)查看详细错误信息。`);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleSavePhoto = async (setAsDefault: boolean = false) => {
    if (!personImage) return;

    try {
      const compressedBlob = await compressImage(personImage);
      const thumbnailBlob = await createThumbnail(personImage, 200);

      const compressedBuffer = await compressedBlob.arrayBuffer();
      const thumbnailBuffer = await thumbnailBlob.arrayBuffer();

      const photo: UserPhoto = {
        id: generateId(),
        userId: 'default-user',
        name: `全身照_${new Date().toLocaleDateString()}`,
        imageData: compressedBuffer,
        thumbnailData: thumbnailBuffer,
        isDefault: setAsDefault || savedPhotos.length === 0, // 第一张照片自动设为默认
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await userPhotoStorage.add(photo);
      setCurrentPhoto(photo);
      await loadSavedPhotos();
      setShowSaveDialog(false);

      alert('✅ 照片已保存到本地！下次可直接使用。');
    } catch (error) {
      console.error('保存照片失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('确定要删除这张照片吗？')) return;

    try {
      await userPhotoStorage.delete(photoId);
      await loadSavedPhotos();

      if (currentPhoto?.id === photoId) {
        setCurrentPhoto(null);
        setPersonImage(null);
        setPersonPreview('');
      }

      alert('照片已删除');
    } catch (error) {
      console.error('删除照片失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleSetDefault = async (photoId: string) => {
    try {
      const photo = savedPhotos.find(p => p.id === photoId);
      if (!photo) return;

      photo.isDefault = true;
      photo.updatedAt = new Date();
      await userPhotoStorage.update(photo);
      await loadSavedPhotos();

      alert('已设置为默认照片');
    } catch (error) {
      console.error('设置默认照片失败:', error);
    }
  };

  // 辅助函数：压缩图片
  const compressImageFile = async (file: File, maxSizeMB: number = 2): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // 如果图片太大，按比例缩小
          const maxDimension = 2048;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          
          // 动态调整质量直到文件小于目标大小
          let quality = 0.9;
          const tryCompress = () => {
            canvas.toBlob((blob) => {
              if (blob) {
                const sizeMB = blob.size / 1024 / 1024;
                if (sizeMB > maxSizeMB && quality > 0.1) {
                  quality -= 0.1;
                  tryCompress();
                } else {
                  const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
                  console.log(`图片压缩：${(file.size / 1024 / 1024).toFixed(2)}MB -> ${sizeMB.toFixed(2)}MB`);
                  resolve(compressedFile);
                }
              }
            }, 'image/jpeg', quality);
          };
          tryCompress();
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // 辅助函数：将衣物转换为File对象（带压缩）
  const convertToFile = async (clothing: Clothing): Promise<File> => {
    const sampleUrl = getSampleClothingUrl(clothing.id, clothing.name, clothing.color, clothing.tags);
    let originalFile: File;
    
    if (sampleUrl) {
      const resp = await fetch(sampleUrl, { cache: 'no-cache' });
      const blob = await resp.blob();
      originalFile = new File([blob], 'clothing.jpg', { type: blob.type || 'image/jpeg' });
    } else {
      const clothingBlob = new Blob([clothing.imageData], { type: 'image/jpeg' });
      originalFile = new File([clothingBlob], 'clothing.jpg', { type: 'image/jpeg' });
    }
    
    // 如果文件大于2MB，自动压缩
    if (originalFile.size > 2 * 1024 * 1024) {
      return await compressImageFile(originalFile, 2);
    }
    return originalFile;
  };

  const handleTryOn = async () => {
    // 验证输入
    if (!personImage) {
      alert('请上传全身照');
      return;
    }

    if (tryOnMode === 'single' && !selectedClothing) {
      alert('请选择一件衣物');
      return;
    }

    if (tryOnMode === 'separate' && (!topClothing || !bottomClothing)) {
      alert('请选择上装和下装');
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      console.log(`开始虚拟试穿（${tryOnMode === 'single' ? '单件模式' : '上下装模式'}）...`);
      
      // 压缩人物照片（如果大于2MB）
      let compressedPersonImage = personImage;
      if (personImage.size > 2 * 1024 * 1024) {
        console.log('人物照片较大，正在压缩...');
        compressedPersonImage = await compressImageFile(personImage, 2);
      }
      
      let response;
      
      if (tryOnMode === 'single') {
        // 单件模式
        const clothingFile = await convertToFile(selectedClothing!);
        
        response = await BackendAPI.virtualTryOn(
          compressedPersonImage,
          clothingFile,
          selectedClothing!.category,
          'single'
        );
      } else {
        // 上下装模式
        const topFile = await convertToFile(topClothing!);
        const bottomFile = await convertToFile(bottomClothing!);
        
        response = await BackendAPI.virtualTryOn(
          compressedPersonImage,
          topFile, // 作为主衣物传递
          topClothing!.category,
          'separate',
          {
            topClothingImage: topFile,
            bottomClothingImage: bottomFile,
          }
        );
      }

      console.log('后端响应:', response);

      if (!response.success) {
        throw new Error(response.error || '虚拟试穿失败');
      }

      // 处理异步任务
      if (response.taskId && response.status === 'processing') {
        console.log('任务已提交，任务ID:', response.taskId);
        alert('✅ 任务已提交！正在处理中，请稍候...');
        
        // 轮询任务结果
        const taskResult = await BackendAPI.pollTaskResult(response.taskId);
        
        console.log('任务完成:', taskResult);
        
        // 下载结果图片
        const resultResponse = await fetch(taskResult.resultUrl);
        const resultBlob = await resultResponse.blob();
        
        setResult({
          success: true,
          resultImage: resultBlob,
        });
        
        alert('🎉 试穿完成！');
      } else if (response.resultUrl) {
        // 同步模式：直接获取结果
        const resultResponse = await fetch(response.resultUrl);
        const resultBlob = await resultResponse.blob();
        
        setResult({
          success: true,
          resultImage: resultBlob,
        });
        
        alert('🎉 试穿完成！');
      } else {
        throw new Error('未获取到结果');
      }
    } catch (error) {
      console.error('虚拟试穿失败:', error);
      const errorMessage = error instanceof Error ? error.message : '虚拟试穿失败';
      alert(`❌ ${errorMessage}\n\n请检查后端服务器是否正常运行。`);
      setResult({
        success: false,
        error: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (result?.resultImage) {
      const url = URL.createObjectURL(result.resultImage);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tryon-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // 后端已配置，前端无需检查
  const apiConfigured = true;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">虚拟试穿</h2>
          <p className="text-gray-500 mt-1">上传全身照，选择衣物进行虚拟试穿</p>
        </div>
        <div className="flex gap-2">
          {savedPhotos.length > 0 && (
            <button
              onClick={() => setShowPhotoManager(!showPhotoManager)}
              className="btn-secondary"
            >
              <ImageIcon size={20} className="inline mr-2" />
              我的照片 ({savedPhotos.length})
            </button>
          )}
        </div>
      </div>


      {/* 已保存照片管理 */}
      {showPhotoManager && savedPhotos.length > 0 && (
        <div className="card p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">我的照片</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {savedPhotos.map((photo) => (
              <div 
                key={photo.id} 
                className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  currentPhoto?.id === photo.id 
                    ? 'border-primary-500 shadow-md' 
                    : 'border-gray-200 hover:border-primary-300'
                }`}
                onClick={() => loadUserPhoto(photo)}
              >
                <img
                  src={URL.createObjectURL(new Blob([photo.thumbnailData || photo.imageData]))}
                  alt={photo.name}
                  className="w-full h-48 object-cover"
                />
                {photo.isDefault && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Check size={12} />
                    默认
                  </div>
                )}
                {currentPhoto?.id === photo.id && (
                  <div className="absolute inset-0 bg-primary-500/20 flex items-center justify-center">
                    <span className="text-white font-bold text-sm bg-primary-600 px-3 py-1 rounded-full">
                      当前使用
                    </span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs truncate">{photo.name}</p>
                  <div className="flex gap-1 mt-1">
                    {!photo.isDefault && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(photo.id);
                        }}
                        className="text-white text-xs bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded"
                      >
                        设为默认
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePhoto(photo.id);
                      }}
                      className="text-white text-xs bg-red-500 hover:bg-red-600 px-2 py-1 rounded"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 保存照片对话框 */}
      {showSaveDialog && personImage && !currentPhoto && (
        <div className="card p-6 bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
          <div className="flex items-start gap-3">
            <Save className="text-green-600 flex-shrink-0 mt-0.5" size={24} />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">保存照片到本地？</h3>
              <p className="text-sm text-gray-600 mb-4">
                保存后，下次使用无需重新上传，自动加载。完全本地存储，保护您的隐私。
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSavePhoto(true)}
                  className="btn-primary text-sm"
                >
                  <Save size={16} className="inline mr-1" />
                  保存并设为默认
                </button>
                <button
                  onClick={() => handleSavePhoto(false)}
                  className="btn-secondary text-sm"
                >
                  仅保存
                </button>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="btn-outline text-sm"
                >
                  跳过
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 主要内容区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. 上传全身照 */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 bg-primary-100 text-primary-700 rounded-full text-sm font-bold">
              1
            </span>
            上传全身照
          </h3>

          {personPreview ? (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                <img
                  src={personPreview}
                  alt="预览"
                  className="w-full max-h-[500px] object-contain"
                  style={{ minHeight: '300px' }}
                />
                {currentPhoto && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    已保存
                  </div>
                )}
              </div>

              {/* 智能抠图提示 */}
              {!hasTransparentBg && personImage && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Info className="text-amber-600 flex-shrink-0" size={16} />
                    <p className="text-sm text-amber-900">
                      如有背景请用智能抠图功能去掉背景
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <label className="btn-secondary flex-1 text-center cursor-pointer">
                  <Upload size={16} className="inline mr-2" />
                  更换照片
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePersonImageSelect(file);
                    }}
                    className="hidden"
                  />
                </label>
                {!hasTransparentBg && personImage && (
                  <button
                    onClick={handleRemoveBackground}
                    disabled={isRemoving}
                    className="btn-primary whitespace-nowrap"
                    title="AI智能抠图"
                  >
                    {isRemoving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent inline-block mr-1"></div>
                        抠图中...
                      </>
                    ) : (
                      <>
                        <Scissors size={16} className="inline mr-1" />
                        智能抠图
                      </>
                    )}
                  </button>
                )}
                {personImage && !currentPhoto && (
                  <button
                    onClick={() => setShowSaveDialog(true)}
                    className="btn-outline"
                    title="保存照片"
                  >
                    <Save size={16} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <label 
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors bg-gray-50"
              style={{ minHeight: '300px', maxHeight: '500px', height: '400px' }}
            >
              <Upload size={48} className="text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-2">点击上传全身照</p>
              <p className="text-xs text-gray-400">或拖拽图片到此处</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePersonImageSelect(file);
                }}
                className="hidden"
              />
            </label>
          )}

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-2">
              <strong>拍摄建议：</strong>
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• 正面站立，双手自然</li>
              <li>• 背景单一，光线充足</li>
              <li>• 全身入镜，比例协调</li>
            </ul>
          </div>

          {/* 📸 示例人物照片 */}
          <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span>📸</span>
              内置示例人物照片
            </h4>
            <div className="space-y-3">
              <div 
                onClick={loadSamplePhoto}
                className="flex items-center gap-3 p-2 bg-white border border-blue-200 rounded-lg cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
              >
                <img
                  src="/sample-user.jpeg"
                  alt="示例照片"
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">小女孩全身照</p>
                  <p className="text-xs text-gray-500">点击使用示例照片</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. 选择衣物 */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 bg-primary-100 text-primary-700 rounded-full text-sm font-bold">
              2
            </span>
            选择衣物
          </h3>

          {/* 试穿模式选择器 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setTryOnMode('single');
                  setTopClothing(null);
                  setBottomClothing(null);
                }}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tryOnMode === 'single'
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-primary-500'
                }`}
              >
                单件试穿
              </button>
              <button
                onClick={() => {
                  setTryOnMode('separate');
                  setSelectedClothing(null);
                }}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tryOnMode === 'separate'
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-primary-500'
                }`}
              >
                上下装试穿
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {tryOnMode === 'single' 
                ? '适用于连衣裙、外套等连体衣物' 
                : '适用于上衣+裤子/裙子的搭配'}
            </p>
          </div>

          {/* 单件试穿模式 */}
          {tryOnMode === 'single' && (
            <>
              {selectedClothing ? (
                <div className="space-y-4">
                  <div className="rounded-lg overflow-hidden border-2 border-primary-500 bg-gray-50">
                    <img
                      src={getSampleClothingUrl(selectedClothing.id, selectedClothing.name, selectedClothing.color, selectedClothing.tags) || 
                           URL.createObjectURL(new Blob([selectedClothing.imageData]))}
                      alt={selectedClothing.name}
                      className="w-full max-h-[400px] object-contain"
                      style={{ minHeight: '200px' }}
                    />
                  </div>
                  <div className="p-3 bg-primary-50 rounded-lg">
                    <p className="font-medium text-gray-900">{selectedClothing.name}</p>
                    <p className="text-sm text-gray-600">{selectedClothing.color}</p>
                  </div>
                  <button
                    onClick={() => setSelectedClothing(null)}
                    className="btn-outline w-full"
                  >
                    重新选择
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 📦 示例衣服 */}
                  <div className="p-4 bg-gradient-to-br from-green-50 to-pink-50 rounded-lg border border-green-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span>📦</span>
                      内置示例衣物
                    </h4>
                    <div className="space-y-2">
                      {/* 绿色连衣裙 */}
                      <div 
                        onClick={() => {
                          const greenDress = clothing.find(c => 
                            c.name.includes('绿色') && c.name.includes('连衣裙')
                          );
                          if (greenDress) setSelectedClothing(greenDress);
                        }}
                        className="flex items-center gap-3 p-2 bg-white border border-green-200 rounded-lg cursor-pointer hover:border-green-500 hover:shadow-md transition-all"
                      >
                        <img
                          src="/sample-dress-green.png"
                          alt="绿色连衣裙"
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">绿色连衣裙（示例）</p>
                          <p className="text-xs text-gray-500">绿色</p>
                        </div>
                      </div>

                      {/* 粉色连衣裙 */}
                      <div 
                        onClick={() => {
                          const pinkDress = clothing.find(c => 
                            c.name.includes('粉色') && c.name.includes('连衣裙')
                          );
                          if (pinkDress) setSelectedClothing(pinkDress);
                        }}
                        className="flex items-center gap-3 p-2 bg-white border border-pink-200 rounded-lg cursor-pointer hover:border-pink-500 hover:shadow-md transition-all"
                      >
                        <img
                          src="/sample-dress-pink.png"
                          alt="粉色连衣裙"
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">粉色连衣裙（示例）</p>
                          <p className="text-xs text-gray-500">粉色</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 衣柜中的衣物 */}
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {clothing.length > 0 && (
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">我的衣柜</h4>
                    )}
                    {clothing.map((item) => {
                      const sampleUrl = getSampleClothingUrl(item.id, item.name, item.color, item.tags);
                      const imgSrc = sampleUrl || (item.imageData.byteLength > 0 
                        ? URL.createObjectURL(new Blob([item.thumbnailData || item.imageData]))
                        : sampleUrl);
                      
                      if (!imgSrc) return null;

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedClothing(item)}
                          className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors"
                        >
                          <img
                            src={imgSrc}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-500">{item.color}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 上下装试穿模式 */}
          {tryOnMode === 'separate' && (
            <div className="space-y-4">
              {/* 显示已选择的上装和下装 */}
              {(topClothing || bottomClothing) && (
                <div className="space-y-3">
                  {topClothing && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-gray-600 mb-2">上装</p>
                      <div className="flex items-center gap-3">
                        <img
                          src={getSampleClothingUrl(topClothing.id, topClothing.name, topClothing.color, topClothing.tags) || 
                               URL.createObjectURL(new Blob([topClothing.imageData]))}
                          alt={topClothing.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{topClothing.name}</p>
                          <p className="text-xs text-gray-500">{topClothing.color}</p>
                        </div>
                        <button
                          onClick={() => setTopClothing(null)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {bottomClothing && (
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-600 mb-2">下装</p>
                      <div className="flex items-center gap-3">
                        <img
                          src={getSampleClothingUrl(bottomClothing.id, bottomClothing.name, bottomClothing.color, bottomClothing.tags) || 
                               URL.createObjectURL(new Blob([bottomClothing.imageData]))}
                          alt={bottomClothing.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{bottomClothing.name}</p>
                          <p className="text-xs text-gray-500">{bottomClothing.color}</p>
                        </div>
                        <button
                          onClick={() => setBottomClothing(null)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 选择提示 */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-900">
                  {!topClothing && !bottomClothing
                    ? '请从下方选择上装和下装'
                    : !topClothing
                    ? '✅ 下装已选，请选择上装'
                    : !bottomClothing
                    ? '✅ 上装已选，请选择下装'
                    : '✅ 上装和下装已选择完毕'}
                </p>
              </div>

              {/* 衣物列表 */}
              <div className="max-h-[350px] overflow-y-auto space-y-2">
                {clothing.map((item) => {
                  const isTop = ['上衣', 'T恤', '衬衫', '毛衣', '外套'].some(type => 
                    item.category.includes(type) || item.name.includes(type)
                  );
                  const isBottom = ['裤子', '裙子', '短裤', '牛仔裤'].some(type => 
                    item.category.includes(type) || item.name.includes(type)
                  );
                  
                  const sampleUrl = getSampleClothingUrl(item.id, item.name, item.color, item.tags);
                  const imgSrc = sampleUrl || (item.imageData.byteLength > 0 
                    ? URL.createObjectURL(new Blob([item.thumbnailData || item.imageData]))
                    : sampleUrl);
                  
                  if (!imgSrc || (!isTop && !isBottom)) return null;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (isTop) setTopClothing(item);
                        if (isBottom) setBottomClothing(item);
                      }}
                      className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors"
                    >
                      <img
                        src={imgSrc}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.color} · {isTop ? '上装' : '下装'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. 试穿效果 */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 bg-primary-100 text-primary-700 rounded-full text-sm font-bold">
              3
            </span>
            试穿效果
          </h3>

          {result?.success && result.resultImage ? (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden border-2 border-green-500 bg-gray-50">
                <img
                  src={URL.createObjectURL(result.resultImage)}
                  alt="试穿效果"
                  className="w-full max-h-[500px] object-contain"
                  style={{ minHeight: '300px' }}
                />
              </div>
              <button onClick={handleDownload} className="btn-primary w-full">
                <Download size={20} className="inline mr-2" />
                下载图片
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setSelectedClothing(null);
                }}
                className="btn-outline w-full"
              >
                继续试穿
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="min-h-[300px] max-h-[500px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
                      <p className="text-sm text-gray-600">处理中，请稍候...</p>
                    </>
                  ) : (
                    <>
                      <Sparkles size={48} className="text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-600">等待试穿结果</p>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={handleTryOn}
                disabled={
                  !personImage || 
                  loading || 
                  (tryOnMode === 'single' && !selectedClothing) ||
                  (tryOnMode === 'separate' && (!topClothing || !bottomClothing))
                }
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles size={20} className="inline mr-2" />
                {loading ? '处理中...' : '开始试穿'}
              </button>

              {result && !result.success && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    {result.error || '试穿失败'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
