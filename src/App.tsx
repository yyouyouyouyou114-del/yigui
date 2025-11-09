import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useWardrobeStore } from './store/wardrobe';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Wardrobe from './pages/Wardrobe';
import VirtualTryOn from './pages/VirtualTryOn';
import Recommendations from './pages/Recommendations';
import Settings from './pages/Settings';
import { initDB } from './services/storage';
import { startAutoBackup } from './services/storage/backup';

function App() {
  const initialize = useWardrobeStore((state) => state.initialize);

  useEffect(() => {
    // 初始化数据库和加载数据
    const init = async () => {
      try {
        await initDB();
        await initialize();
        
        // 启动自动备份（每24小时备份到 localStorage）
        startAutoBackup();
      } catch (error) {
        console.error('应用初始化失败:', error);
      }
    };
    init();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="wardrobe" element={<Wardrobe />} />
          <Route path="virtual-tryon" element={<VirtualTryOn />} />
          <Route path="recommendations" element={<Recommendations />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

