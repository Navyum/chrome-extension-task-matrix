/**
 * 后台脚本 - 任务监控和提醒版本
 * 处理插件的后台逻辑，包括任务监控、图标提醒等
 */

import { StorageManager } from '../services/StorageManager.js';
import { Task } from '../models/Task.js';

// 简化的后台服务类
class BackgroundService {
  constructor() {
    console.log('BackgroundService constructor called');
    this.isInitialized = false;
    this.taskCheckInterval = null;
    this.urgentTasks = new Map(); // 存储紧急任务信息
    this.storageManager = new StorageManager();
    this.settings = null; // 存储当前设置
    
    try {
      // 立即设置消息监听器
      this.setupMessageListener();
      
      // 加载设置
      this.loadSettings().then(() => {
        // 延迟初始化，避免阻塞构造函数
        setTimeout(() => {
          this.init();
        }, 100);
      });
      
      console.log('Background script loaded successfully');
    } catch (error) {
      console.error('BackgroundService constructor failed:', error);
      // 即使构造函数失败，也要设置消息监听器
      this.setupMessageListener();
    }
  }

  /**
   * 设置消息监听器
   */
  setupMessageListener() {
    try {
      console.log('Setting up message listener...');
      
      // 添加消息监听器
      chrome.runtime.onMessage.addListener(this.messageHandler.bind(this));
      
      console.log('Message listener set up successfully');
    } catch (error) {
      console.error('Failed to setup message listener:', error);
    }
  }

  /**
   * 消息处理器
   */
  messageHandler(message, sender, sendResponse) {
    try {
      console.log('Received message:', message.type);
      
      switch (message.type) {          
        case 'getTasks': {
          // 返回真实的任务数据
          this.getRealTasks().then(tasks => {
            sendResponse({ success: true, data: tasks });
          }).catch(error => {
            sendResponse({ success: false, error: error.message });
          });
          return true; // 异步响应
        }
          
        case 'clearAllTasks': {
          // 清空所有任务
          this.clearAllTasks().then(result => {
            sendResponse({ success: true, message: 'All tasks cleared' });
          }).catch(error => {
            sendResponse({ success: false, error: error.message });
          });
          return true; // 异步响应
        }
          
        case 'settingsUpdated': {
          // 设置已更新，重新加载设置并调整监控
          this.loadSettings().then(() => {
            console.log('Settings updated, restarting monitoring with new configuration');
            this.restartTaskMonitoring();
            sendResponse({ success: true, message: 'Settings applied' });
          }).catch(error => {
            sendResponse({ success: false, error: error.message });
          });
          return true; // 异步响应
        }
          
        case 'startMonitoring':
          this.startTaskMonitoring();
          sendResponse({ success: true, message: 'Task monitoring started' });
          break;
          
        case 'stopMonitoring':
          this.stopTaskMonitoring();
          sendResponse({ success: true, message: 'Task monitoring stopped' });
          break;
          
        default:
          console.log('Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
      
      return true; // 保持消息通道开放
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
      return true;
    }
  }

  /**
   * 初始化
   */
  async init() {
    try {
      console.log('Background script starting initialization...');
      
      // 启动任务监控
      this.startTaskMonitoring();
      
      this.isInitialized = true;
      console.log('Background script initialized successfully');
      
    } catch (error) {
      console.error('Background script initialization failed:', error);
    }
  }

  /**
   * 获取真实任务数据
   */
  async getRealTasks() {
    try {
      const tasks = await this.storageManager.getTasks();
      console.log(`Retrieved ${tasks.length} real tasks from storage`);
      
      // 转换为普通对象，包含计算后的时间信息
      return tasks.map(task => {
        const now = Date.now();
        const timeRemaining = task.dueDate - now;
        const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));
        
        return {
          id: task.id,
          title: task.title,
          description: task.description,
          importance: task.importance,
          dueDate: task.dueDate,
          category: task.category,
          status: task.status,
          color: task.color,
          timeRemaining: timeRemaining,
          minutesRemaining: minutesRemaining,
          isOverdue: timeRemaining < 0,
          isUrgent: timeRemaining > 0 && timeRemaining <= 30 * 60 * 1000 // 30分钟内
        };
      });
    } catch (error) {
      console.error('Error getting real tasks:', error);
      return [];
    }
  }

  /**
   * 启动任务监控
   */
  startTaskMonitoring() {
    if (this.taskCheckInterval) {
      clearInterval(this.taskCheckInterval);
    }
    
    // 检查是否启用提醒
    if (!this.settings || !this.settings.enableUrgentReminder) {
      console.log('Urgent reminder is disabled in settings');
      return;
    }
    
    console.log('Starting task monitoring...');
    
    // 立即检查一次
    this.checkUrgentTasks();
    
    // 使用设置中的检查间隔
    const interval = (this.settings.urgentReminderInterval || 10) * 60 * 1000; // 转换为毫秒
    this.taskCheckInterval = setInterval(() => {
      this.checkUrgentTasks();
    }, interval);
    
    console.log(`Task monitoring started - checking every ${this.settings.urgentReminderInterval || 10} minutes`);
  }

  /**
   * 停止任务监控
   */
  stopTaskMonitoring() {
    if (this.taskCheckInterval) {
      clearInterval(this.taskCheckInterval);
      this.taskCheckInterval = null;
      console.log('Task monitoring stopped');
    }
  }

  /**
   * 检查紧急任务
   */
  async checkUrgentTasks() {
    try {
      console.log('Checking for urgent tasks...');
      
      // 检查是否启用提醒
      if (!this.settings || !this.settings.enableUrgentReminder) {
        console.log('Urgent reminder is disabled, skipping check');
        return;
      }
      
      // 获取真实任务列表
      const tasks = await this.getRealTasks();
      const now = Date.now();
      const threshold = (this.settings.urgentReminderThreshold || 30) * 60 * 1000; // 转换为毫秒
      
      let hasUrgentTask = false;
      let urgentTaskCount = 0;
      
      for (const task of tasks) {
        if (task.status === 'doing') {
          const timeRemaining = task.dueDate - now;
          
          // 检查是否在阈值时间内到期
          if (timeRemaining > 0 && timeRemaining <= threshold) {
            hasUrgentTask = true;
            urgentTaskCount++;
            
            // 计算剩余分钟数
            const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));
            
            console.log(`Urgent task detected: "${task.title}" - ${minutesRemaining} minutes remaining`);
            
            // 更新紧急任务映射
            this.urgentTasks.set(task.id, {
              ...task,
              minutesRemaining,
              lastReminder: now
            });
          }
        }
      }
      
      // 更新插件图标
      this.updateExtensionIcon(hasUrgentTask, urgentTaskCount);
      
      if (hasUrgentTask) {
        console.log(`Found ${urgentTaskCount} urgent task(s)`);
      } else {
        console.log('No urgent tasks found');
        // 如果没有紧急任务，恢复默认图标
        this.resetExtensionIcon();
      }
      
    } catch (error) {
      console.error('Error checking urgent tasks:', error);
    }
  }

  /**
   * 更新插件图标
   */
  updateExtensionIcon(hasUrgentTask, urgentTaskCount) {
    try {
      if (hasUrgentTask) {
        // 设置紧急提醒图标
        chrome.action.setIcon({
          path: {
            "16": "assets/icons/clock16.png",
            "48": "assets/icons/clock48.png",
            "128": "assets/icons/clock128.png"
          }
        });
        
        // 根据设置决定是否显示徽章
        if (this.settings && this.settings.enableIconBadge) {
          chrome.action.setBadgeText({
            text: urgentTaskCount.toString()
          });
          
          // 设置徽章背景色为红色（紧急）
          chrome.action.setBadgeBackgroundColor({
            color: '#EF4444'
          });
        } else {
          // 如果禁用徽章，清除它
          chrome.action.setBadgeText({
            text: ''
          });
        }
        
        // 根据设置决定是否显示工具提示
        if (this.settings && this.settings.enableIconTitle) {
          chrome.action.setTitle({
            title: `TaskMatrix Pro - ${urgentTaskCount} urgent task(s) due soon!`
          });
        }
        
        console.log(`Extension icon updated - ${urgentTaskCount} urgent task(s)`);
      }
    } catch (error) {
      console.error('Error updating extension icon:', error);
    }
  }

  /**
   * 重置插件图标为默认状态
   */
  resetExtensionIcon() {
    try {
      // 清除徽章
      chrome.action.setBadgeText({
        text: ''
      });
      
      // 设置默认工具提示
      chrome.action.setTitle({
        title: 'TaskMatrix Pro - 智能任务管理'
      });
      
      console.log('Extension icon reset to default state');
    } catch (error) {
      console.error('Error resetting extension icon:', error);
    }
  }

  /**
   * 获取监控状态
   */
  getMonitoringStatus() {
    return {
      isMonitoring: !!this.taskCheckInterval,
      urgentTaskCount: this.urgentTasks.size,
      urgentTasks: Array.from(this.urgentTasks.values())
    };
  }

  /**
   * 清空所有任务
   */
  async clearAllTasks() {
    try {
      console.log('Clearing all tasks...');
      
      // 清空存储中的任务
      await this.storageManager.clearTasks();
      
      // 清空紧急任务映射
      this.urgentTasks.clear();
      
      // 重置图标
      this.resetExtensionIcon();
      
      console.log('All tasks cleared successfully');
      
    } catch (error) {
      console.error('Error clearing tasks:', error);
      throw error;
    }
  }

  /**
   * 加载设置
   */
  async loadSettings() {
    try {
      this.settings = await this.storageManager.getSettings();
      console.log('Settings loaded:', this.settings);
      return this.settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      this.settings = null; // 确保设置为null，以便下次加载
      return null;
    }
  }

  /**
   * 重新启动任务监控，使用当前设置
   */
  restartTaskMonitoring() {
    this.stopTaskMonitoring(); // 停止当前监控
    this.startTaskMonitoring(); // 重新启动监控，使用新的设置
  }
}

// 创建实例
const backgroundService = new BackgroundService();

// 监听插件卸载
chrome.runtime.onSuspend.addListener(() => {
  console.log('Extension suspending, cleaning up...');
  backgroundService.stopTaskMonitoring();
});

// 监听插件启动
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension starting up...');
});

// 监听插件安装/更新
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);
}); 