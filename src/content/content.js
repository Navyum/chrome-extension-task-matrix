/**
 * 内容脚本
 * 在网页中注入TaskMatrix Pro功能
 */

import { Task } from '../models/Task';

class ContentScript {
  constructor() {
    this.isInitialized = false;
    this.floatingButton = null;
    this.quickAddPanel = null;
    
    this.init();
  }

  /**
   * 初始化内容脚本
   */
  init() {
    try {
      // 等待DOM加载完成
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.setupContentScript();
        });
      } else {
        this.setupContentScript();
      }
    } catch (error) {
      console.error('内容脚本初始化失败:', error);
    }
  }

  /**
   * 设置内容脚本
   */
  setupContentScript() {
    if (this.isInitialized) return;
    
    try {
      // 创建浮动按钮
      this.createFloatingButton();
      
      // 创建快速添加面板
      this.createQuickAddPanel();
      
      // 绑定事件
      this.bindEvents();
      
      // 监听来自后台的消息
      this.listenToBackground();
      
      this.isInitialized = true;
      console.log('TaskMatrix Pro 内容脚本已加载');
    } catch (error) {
      console.error('设置内容脚本失败:', error);
    }
  }

  /**
   * 创建浮动按钮
   */
  createFloatingButton() {
    this.floatingButton = document.createElement('div');
    this.floatingButton.id = 'taskmatrix-floating-btn';
    this.floatingButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#2563EB"/>
        <path d="M12 6v12M6 12h12" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
    
    this.floatingButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      background: #165DFF;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
      cursor: pointer;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      border: none;
      outline: none;
    `;
    
    // 悬停效果
    this.floatingButton.addEventListener('mouseenter', () => {
      this.floatingButton.style.transform = 'scale(1.1)';
      this.floatingButton.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.4)';
    });
    
    this.floatingButton.addEventListener('mouseleave', () => {
      this.floatingButton.style.transform = 'scale(1)';
      this.floatingButton.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)';
    });
    
    // 点击事件
    this.floatingButton.addEventListener('click', () => {
      this.toggleQuickAddPanel();
    });
    
    document.body.appendChild(this.floatingButton);
  }

  /**
   * 创建快速添加面板
   */
  createQuickAddPanel() {
    this.quickAddPanel = document.createElement('div');
    this.quickAddPanel.id = 'taskmatrix-quick-add-panel';
    this.quickAddPanel.innerHTML = `
      <div class="panel-header">
        <h3>快速添加任务</h3>
        <button class="close-btn" id="taskmatrix-close-btn">×</button>
      </div>
      <div class="panel-content">
        <div class="form-group">
          <label for="taskmatrix-title">任务标题</label>
          <input type="text" id="taskmatrix-title" placeholder="输入任务标题" maxlength="100">
        </div>
        <div class="form-group">
          <label for="taskmatrix-description">描述（可选）</label>
          <textarea id="taskmatrix-description" placeholder="输入任务描述" maxlength="500" rows="3"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="taskmatrix-importance">重要性</label>
            <select id="taskmatrix-importance">
              <option value="0">0 - 不重要</option>
              <option value="1">1 - 轻微重要</option>
              <option value="2">2 - 一般重要</option>
              <option value="3" selected>3 - 重要</option>
              <option value="4">4 - 很重要</option>
              <option value="5">5 - 极其重要</option>
            </select>
          </div>
          <div class="form-group">
            <label for="taskmatrix-due-date">截止日期</label>
            <input type="date" id="taskmatrix-due-date">
          </div>
        </div>
        <div class="form-group">
          <label for="taskmatrix-category">分类</label>
          <select id="taskmatrix-category">
            <option value="work">工作</option>
            <option value="personal">个人</option>
            <option value="study">学习</option>
            <option value="health">健康</option>
            <option value="other">其他</option>
          </select>
        </div>
        <div class="form-actions">
          <button class="btn-secondary" id="taskmatrix-cancel-btn">取消</button>
          <button class="btn-primary" id="taskmatrix-save-btn">保存任务</button>
        </div>
      </div>
    `;
    
    this.quickAddPanel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      max-width: 90vw;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      z-index: 10001;
      display: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
    `;
    
    // 添加样式
    this.addPanelStyles();
    
    document.body.appendChild(this.quickAddPanel);
  }

  /**
   * 添加面板样式
   */
  addPanelStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #taskmatrix-quick-add-panel .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px 0;
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 20px;
      }
      
      #taskmatrix-quick-add-panel .panel-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
      }
      
      #taskmatrix-quick-add-panel .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #6b7280;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      #taskmatrix-quick-add-panel .close-btn:hover {
        color: #111827;
      }
      
      #taskmatrix-quick-add-panel .panel-content {
        padding: 0 24px 24px;
      }
      
      #taskmatrix-quick-add-panel .form-group {
        margin-bottom: 16px;
      }
      
      #taskmatrix-quick-add-panel .form-row {
        display: flex;
        gap: 16px;
      }
      
      #taskmatrix-quick-add-panel .form-row .form-group {
        flex: 1;
      }
      
      #taskmatrix-quick-add-panel label {
        display: block;
        margin-bottom: 6px;
        font-weight: 500;
        color: #374151;
      }
      
      #taskmatrix-quick-add-panel input,
      #taskmatrix-quick-add-panel select,
      #taskmatrix-quick-add-panel textarea {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.2s ease;
      }
      
      #taskmatrix-quick-add-panel input:focus,
      #taskmatrix-quick-add-panel select:focus,
      #taskmatrix-quick-add-panel textarea:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }
      
      #taskmatrix-quick-add-panel .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 24px;
      }
      
      #taskmatrix-quick-add-panel .btn-primary,
      #taskmatrix-quick-add-panel .btn-secondary {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      #taskmatrix-quick-add-panel .btn-primary {
        background: #2563eb;
        color: white;
      }
      
      #taskmatrix-quick-add-panel .btn-primary:hover {
        background: #1d4ed8;
      }
      
      #taskmatrix-quick-add-panel .btn-secondary {
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
      }
      
      #taskmatrix-quick-add-panel .btn-secondary:hover {
        background: #e5e7eb;
      }
      
      #taskmatrix-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: none;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 关闭按钮
    document.getElementById('taskmatrix-close-btn').addEventListener('click', () => {
      this.hideQuickAddPanel();
    });
    
    // 取消按钮
    document.getElementById('taskmatrix-cancel-btn').addEventListener('click', () => {
      this.hideQuickAddPanel();
    });
    
    // 保存按钮
    document.getElementById('taskmatrix-save-btn').addEventListener('click', () => {
      this.saveQuickTask();
    });
    
    // 点击遮罩关闭
    document.addEventListener('click', (e) => {
      if (e.target.id === 'taskmatrix-overlay') {
        this.hideQuickAddPanel();
      }
    });
    
    // 键盘事件
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.quickAddPanel.style.display === 'block') {
        this.hideQuickAddPanel();
      }
    });
    
    // 设置默认日期
    this.setDefaultDate();
  }

  /**
   * 设置默认日期
   */
  setDefaultDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    
    const dateString = `${year}-${month}-${day}`;
    document.getElementById('taskmatrix-due-date').value = dateString;
  }

  /**
   * 显示快速添加面板
   */
  showQuickAddPanel() {
    // 创建遮罩
    if (!document.getElementById('taskmatrix-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'taskmatrix-overlay';
      document.body.appendChild(overlay);
    }
    
    document.getElementById('taskmatrix-overlay').style.display = 'block';
    this.quickAddPanel.style.display = 'block';
    
    // 聚焦到标题输入框
    setTimeout(() => {
      document.getElementById('taskmatrix-title').focus();
    }, 100);
  }

  /**
   * 隐藏快速添加面板
   */
  hideQuickAddPanel() {
    document.getElementById('taskmatrix-overlay').style.display = 'none';
    this.quickAddPanel.style.display = 'none';
    
    // 清空表单
    this.clearQuickAddForm();
  }

  /**
   * 清空快速添加表单
   */
  clearQuickAddForm() {
    document.getElementById('taskmatrix-title').value = '';
    document.getElementById('taskmatrix-description').value = '';
    document.getElementById('taskmatrix-importance').value = '3';
    document.getElementById('taskmatrix-category').value = 'work';
    this.setDefaultDate();
  }

  /**
   * 切换快速添加面板
   */
  toggleQuickAddPanel() {
    if (this.quickAddPanel.style.display === 'block') {
      this.hideQuickAddPanel();
    } else {
      this.showQuickAddPanel();
    }
  }

  /**
   * 保存快速任务
   */
  async saveQuickTask() {
    try {
      const title = document.getElementById('taskmatrix-title').value.trim();
      const description = document.getElementById('taskmatrix-description').value.trim();
      const importance = parseInt(document.getElementById('taskmatrix-importance').value);
      const dueDate = document.getElementById('taskmatrix-due-date').value;
      const category = document.getElementById('taskmatrix-category').value;
      
      if (!title) {
        this.showNotification('请输入任务标题', 'warning');
        return;
      }
      
      if (!dueDate) {
        this.showNotification('请选择截止日期', 'warning');
        return;
      }
      
      const taskData = {
        title,
        description,
        importance,
        dueDate: new Date(dueDate + 'T09:00:00').getTime(), // 转换为时间戳
        category,
        color: new Task({importance: importance}).getDefaultColor()
      };
      
      // 发送消息给后台脚本
      const response = await chrome.runtime.sendMessage({
        type: 'addTask',
        data: taskData
      });
      
      if (response && response.success) {
        this.showNotification('任务添加成功！', 'success');
        this.hideQuickAddPanel();
      } else {
        this.showNotification('任务添加失败', 'error');
      }
    } catch (error) {
      console.error('保存快速任务失败:', error);
      this.showNotification('保存失败', 'error');
    }
  }

  /**
   * 显示通知
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `taskmatrix-notification taskmatrix-notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      z-index: 10002;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    const colors = {
      info: '#3B82F6',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  /**
   * 监听来自后台的消息
   */
  listenToBackground() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'showNotification':
          this.showNotification(message.message, message.notificationType);
          break;
        case 'updateBadge':
          // 可以在这里更新浮动按钮的徽章
          break;
        default:
          console.log('收到未知消息:', message);
      }
    });
  }

  /**
   * 检测页面内容并建议任务
   */
  detectPageContent() {
    // 检测页面标题
    const pageTitle = document.title;
    const url = window.location.href;
    
    // 可以在这里添加智能任务建议逻辑
    // 例如：检测到日历页面时建议添加日程任务
    // 检测到邮件页面时建议添加回复任务等
    
    return {
      title: pageTitle,
      url: url,
      suggestions: []
    };
  }

  /**
   * 销毁内容脚本
   */
  destroy() {
    if (this.floatingButton && document.body.contains(this.floatingButton)) {
      document.body.removeChild(this.floatingButton);
    }
    
    if (this.quickAddPanel && document.body.contains(this.quickAddPanel)) {
      document.body.removeChild(this.quickAddPanel);
    }
    
    const overlay = document.getElementById('taskmatrix-overlay');
    if (overlay && document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
    
    this.isInitialized = false;
  }
}

// 初始化内容脚本
const contentScript = new ContentScript();

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  contentScript.destroy();
}); 