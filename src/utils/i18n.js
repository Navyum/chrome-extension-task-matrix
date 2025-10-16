/**
 * 国际化工具类
 * 提供多语言支持功能
 */

// 浏览器API适配器
const browserAPI = (() => {
  if (typeof browser !== 'undefined') {
    return browser;
  } else if (typeof chrome !== 'undefined') {
    return chrome;
  } else {
    throw new Error('Neither browser nor chrome API is available');
  }
})();

class I18nManager {
  constructor() {
  }

  /**
   * 检查Chrome i18n API是否可用
   * @returns {boolean} API是否可用
   */
  isChromeI18nAvailable() {
    return typeof browserAPI !== 'undefined' && 
           browserAPI.i18n && 
           browserAPI.i18n.getMessage;
  }

  /**
   * 获取本地化消息
   * @param {string} key - 消息键
   * @param {Object|Array} substitutions - 替换参数，支持对象结构体或数组
   * @returns {string} 本地化消息
   */
  getMessage(key, substitutions = {}) {
    // 处理结构体形式的substitutions
    let processedSubstitutions = substitutions;
    
    if (typeof substitutions === 'object' && !Array.isArray(substitutions) && Object.keys(substitutions).length > 0) {
      // 如果是对象结构体，先获取消息模板，然后根据$var规则替换
      if (this.isChromeI18nAvailable()) {
        let message = browserAPI.i18n.getMessage(key);
        console.log('message', message);
        
        // 遍历substitutions对象，按照键的字母顺序替换$1、$2、$3等格式
        const sortedKeys = Object.keys(substitutions).sort();
        sortedKeys.forEach((key, index) => {
          const placeholder = `$${index + 1}`;
          const value = substitutions[key];
          console.log('replacing', placeholder, 'with', value);
          message = message.replace(new RegExp(`\\$${index + 1}`, 'g'), value);
        });
        
        return message;
      }
    } else {
      // 使用Chrome的默认i18n API处理数组格式
      if (this.isChromeI18nAvailable()) {
        return browserAPI.i18n.getMessage(key, substitutions);
      }
    }

    console.log('isChromeI18nAvailable false', key);

    return key; // 回退到key本身
  }

  /**
   * 加载消息（兼容性方法）
   */
  async loadMessages() {
    // 如果设置了强制语言，加载强制语言的消息
    if (this.forcedLocale) {
      return this.loadForcedMessages();
    }
    // 否则返回已解析的Promise，表示使用默认的Chrome i18n API
    return Promise.resolve();
  }

  /**
   * 动态加载强制语言的消息
   */
  loadForcedMessages() {
    if (!this.forcedLocale) return Promise.resolve();
    
    try {
      // 使用动态导入加载对应语言的消息文件
      const messagesPath = `/_locales/${this.forcedLocale}/messages.json`;
      
      // 尝试通过fetch获取消息文件
      return fetch(chrome.runtime.getURL(messagesPath))
        .then(response => response.json())
        .then(messages => {
          this.forcedMessages = messages;
        })
        .catch(error => {
          console.warn(`Failed to load messages for locale ${this.forcedLocale}:`, error);
          this.forcedMessages = null;
        });
    } catch (error) {
      console.warn(`Error loading forced messages for ${this.forcedLocale}:`, error);
      this.forcedMessages = null;
      return Promise.resolve();
    }
  }

  /**
   * 初始化多语言
   */
  async initI18n() {
    // 等待i18n加载完成
    await this.loadMessages();
    
    // 更新所有带有data-i18n属性的元素
    this.updateI18nElements();
    
    // 监听语言变更事件
    window.addEventListener('localeChanged', () => {
      this.updateI18nElements();
    });
  }

  /**
   * 更新多语言元素
   */
  updateI18nElements() {
    // 更新所有带有data-i18n属性的元素
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      element.textContent = this.getMessage(key);
    });

    // 更新所有带有data-i18n-title属性的元素
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = this.getMessage(key);
    });

    // 更新所有带有data-i18n-placeholder属性的元素
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.getMessage(key);
    });
  }
}

// 创建全局实例
const i18n = new I18nManager();

export { I18nManager, i18n };
