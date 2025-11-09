/**
 * 后端健康监控服务
 * 定期检查后端服务状态，自动重连，提供友好的错误提示
 */

// 根据环境自动选择后端 URL
const BACKEND_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? '' // 生产环境使用相对路径（同域）
  : 'http://localhost:3100'; // 开发环境
const HEALTH_CHECK_INTERVAL = 30000; // 30秒检查一次
const RETRY_INTERVAL = 5000; // 重试间隔5秒

type HealthStatus = 'online' | 'offline' | 'checking';
type HealthCallback = (status: HealthStatus, message?: string) => void;

class BackendHealthMonitor {
  private status: HealthStatus = 'checking';
  private checkTimer: NodeJS.Timeout | null = null;
  private callbacks: Set<HealthCallback> = new Set();
  private isChecking = false;

  /**
   * 启动健康监控
   */
  start() {
    console.log('🔍 启动后端健康监控...');
    
    // 立即检查一次
    this.checkHealth();
    
    // 定期检查
    this.checkTimer = setInterval(() => {
      this.checkHealth();
    }, HEALTH_CHECK_INTERVAL);
  }

  /**
   * 停止健康监控
   */
  stop() {
    console.log('⏹️ 停止后端健康监控');
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  /**
   * 检查后端健康状态
   */
  private async checkHealth() {
    if (this.isChecking) return;
    
    this.isChecking = true;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${BACKEND_URL}/health`, {
        signal: controller.signal,
        cache: 'no-cache',
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        this.updateStatus('online', data.message || '后端服务正常');
      } else {
        this.updateStatus('offline', `后端服务异常 (HTTP ${response.status})`);
      }
    } catch (error) {
      console.warn('后端健康检查失败:', error);
      this.updateStatus('offline', '无法连接到后端服务');
      
      // 如果离线，尝试快速重连
      setTimeout(() => this.checkHealth(), RETRY_INTERVAL);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * 更新状态并通知监听者
   */
  private updateStatus(newStatus: HealthStatus, message?: string) {
    const statusChanged = this.status !== newStatus;
    this.status = newStatus;
    
    if (statusChanged) {
      console.log(`🔄 后端状态变更: ${newStatus}`, message || '');
      this.notifyCallbacks(newStatus, message);
    }
  }

  /**
   * 通知所有回调
   */
  private notifyCallbacks(status: HealthStatus, message?: string) {
    this.callbacks.forEach(callback => {
      try {
        callback(status, message);
      } catch (error) {
        console.error('健康监控回调执行失败:', error);
      }
    });
  }

  /**
   * 订阅状态变化
   */
  subscribe(callback: HealthCallback) {
    this.callbacks.add(callback);
    
    // 立即通知当前状态
    callback(this.status);
    
    // 返回取消订阅函数
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * 获取当前状态
   */
  getStatus(): HealthStatus {
    return this.status;
  }

  /**
   * 手动触发健康检查
   */
  async checkNow(): Promise<boolean> {
    await this.checkHealth();
    return this.status === 'online';
  }
}

// 单例模式
export const backendHealthMonitor = new BackendHealthMonitor();

// 自动启动（在应用加载时）
if (typeof window !== 'undefined') {
  backendHealthMonitor.start();
  
  // 页面卸载时停止
  window.addEventListener('beforeunload', () => {
    backendHealthMonitor.stop();
  });
}

