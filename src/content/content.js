/**
 * Content Script
 * Inject TaskMatrix Pro functionality into web pages
 */
class ContentScript {
  constructor() {
    this.isInitialized = false;
    this.backgroundReady = false;
    this.backgroundReadyPromise = null;
    
    this.init();
  }

  /**
   * Initialize content script
   */
  init() {
    try {
      // Wait for DOM to load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.setupContentScript();
        });
      } else {
        this.setupContentScript();
      }
    } catch (error) {
      console.error('Content script initialization failed:', error);
    }
  }

  /**
   * Setup content script
   */
  setupContentScript() {
    if (this.isInitialized) return;
    
    try {
      // 监听来自后台的消息
      this.listenToBackground();
      
      this.isInitialized = true;
      console.log('TaskMatrix Pro content script loaded');
    } catch (error) {
      console.error('Failed to setup content script:', error);
    }
  }



  /**
   * 检查后台脚本是否就绪
   */
  async ensureBackgroundReady() {
    if (this.backgroundReady) {
      return true;
    }
    
    if (this.backgroundReadyPromise) {
      try {
        return await this.backgroundReadyPromise;
      } catch (error) {
        console.error('Background ready promise failed:', error);
        return false;
      }
    }
    
    return false;
  }

  /**
   * 监听来自后台的消息
   */
  listenToBackground() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'backgroundReady':
          console.log('Received background ready message:', message.message);
          this.backgroundReady = true;
          if (this.backgroundReadyPromise) {
            // 解析等待中的Promise
            this.backgroundReadyPromise.then(() => {
              // Promise已经解析，不需要做任何事情
            }).catch(() => {
              // 如果Promise被拒绝，重新创建一个已解析的Promise
              this.backgroundReadyPromise = Promise.resolve(true);
            });
          }
          break;
        case 'showNotification':
          // 可以在这里处理来自后台的通知
          break;
        case 'updateBadge':
          // 可以在这里处理徽章更新
          break;
        default:
          console.log('Received unknown message:', message);
      }
    });
  }

  /**
   * 检测页面内容并建议任务
   */
  detectPageContent() {
    return {
      title: document.title,
      url: window.location.href,
      suggestions: []
    };
  }

  /**
   * 清理资源
   */
  destroy() {
    this.isInitialized = false;
  }
}

// 创建ContentScript实例
const contentScript = new ContentScript();

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  contentScript.destroy();
}); 