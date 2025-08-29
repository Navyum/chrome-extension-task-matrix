/**
 * 后台脚本
 * 处理插件的后台逻辑，包括通知、定时任务等
 */
import { StorageManager } from '../services/StorageManager.js';
import { TaskManager } from '../services/TaskManager.js';
import { MatrixManager } from '../services/MatrixManager.js';

class BackgroundService {
  constructor() {
    this.storageManager = new StorageManager();
    this.taskManager = new TaskManager(this.storageManager);
    this.matrixManager = new MatrixManager(this.taskManager);
    
    this.init();
  }

  /**
   * 初始化后台服务
   */
  async init() {
    try {
      // 设置图标徽章
      this.setupBadge();
      
      // 设置定时任务
      this.setupAlarms();
      
      // 监听事件
      this.bindEvents();
      
      // 初始化通知权限
      await this.requestNotificationPermission();
      
      console.log('后台服务初始化完成');
    } catch (error) {
      console.error('后台服务初始化失败:', error);
    }
  }

  /**
   * 设置图标徽章
   */
  setupBadge() {
    this.updateBadge();
    
    // 每5分钟更新一次徽章
    setInterval(() => {
      this.updateBadge();
    }, 5 * 60 * 1000);
  }

  /**
   * 更新图标徽章
   */
  async updateBadge() {
    try {
      const stats = await this.taskManager.getTaskStats();
      const pendingCount = stats.pending;
      const overdueCount = stats.overdue;
      
      // 设置徽章文本
      if (pendingCount > 0) {
        chrome.action.setBadgeText({ text: pendingCount.toString() });
        
        // 根据超期任务数量设置徽章颜色
        if (overdueCount > 0) {
          chrome.action.setBadgeBackgroundColor({ color: '#EF4444' }); // 红色
        } else {
          chrome.action.setBadgeBackgroundColor({ color: '#3B82F6' }); // 蓝色
        }
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
    } catch (error) {
      console.error('更新徽章失败:', error);
    }
  }

  /**
   * 设置定时任务
   */
  setupAlarms() {
    // 清除现有定时任务
    chrome.alarms.clearAll();
    
    // 设置每日提醒
    chrome.alarms.create('dailyReminder', {
      delayInMinutes: 1, // 1分钟后开始
      periodInMinutes: 24 * 60 // 每24小时重复
    });
    
    // 设置任务检查
    chrome.alarms.create('taskCheck', {
      delayInMinutes: 5, // 5分钟后开始
      periodInMinutes: 30 // 每30分钟检查一次
    });
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 监听定时任务
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.handleAlarm(alarm);
    });
    
    // 监听存储变化
    this.storageManager.onStorageChanged((changes) => {
      this.handleStorageChange(changes);
    });
    
    // 监听任务管理事件
    this.bindTaskEvents();
    
    // 监听消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 保持消息通道开放
    });
    
    // 监听插件安装/更新
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstall(details);
    });
    
    // 监听插件启动
    chrome.runtime.onStartup.addListener(() => {
      this.handleStartup();
    });
  }

  /**
   * 绑定任务管理事件
   */
  bindTaskEvents() {
    const events = ['taskAdded', 'taskUpdated', 'taskCompleted', 'taskDeleted'];
    
    events.forEach(eventName => {
      this.taskManager.addEventListener(eventName, (data) => {
        this.handleTaskEvent(eventName, data);
      });
    });
  }

  /**
   * 处理定时任务
   */
  async handleAlarm(alarm) {
    try {
      switch (alarm.name) {
        case 'dailyReminder':
          await this.sendDailyReminder();
          break;
        case 'taskCheck':
          await this.checkOverdueTasks();
          break;
        default:
          console.log('未知的定时任务:', alarm.name);
      }
    } catch (error) {
      console.error('处理定时任务失败:', error);
    }
  }

  /**
   * 发送每日提醒
   */
  async sendDailyReminder() {
    try {
      const stats = await this.taskManager.getTaskStats();
      const matrixStats = this.matrixManager.getMatrixStats();
      
      if (stats.total > 0) {
        const message = `今日任务提醒：\n总任务：${stats.total}个\n待完成：${stats.pending}个\n已完成：${stats.completed}个\n完成率：${stats.completionRate}%`;
        
        await this.showNotification('TaskMatrix Pro 每日提醒', message);
      }
    } catch (error) {
      console.error('发送每日提醒失败:', error);
    }
  }

  /**
   * 检查超期任务
   */
  async checkOverdueTasks() {
    try {
      const overdueTasks = await this.taskManager.getTasks({ overdue: true });
      
      if (overdueTasks.length > 0) {
        const message = `您有 ${overdueTasks.length} 个任务已超期，请及时处理！`;
        await this.showNotification('任务超期提醒', message);
        
        // 更新徽章
        this.updateBadge();
      }
    } catch (error) {
      console.error('检查超期任务失败:', error);
    }
  }

  /**
   * 处理存储变化
   */
  handleStorageChange(changes) {
    if (changes.tasks) {
      // 任务数据发生变化，更新徽章
      this.updateBadge();
    }
  }

  /**
   * 处理任务事件
   */
  handleTaskEvent(eventName, data) {
    switch (eventName) {
      case 'taskAdded':
        this.handleTaskAdded(data);
        break;
      case 'taskCompleted':
        this.handleTaskCompleted(data);
        break;
      case 'taskUpdated':
        this.handleTaskUpdated(data);
        break;
      case 'taskDeleted':
        this.handleTaskDeleted(data);
        break;
    }
  }

  /**
   * 处理任务添加
   */
  async handleTaskAdded(task) {
    try {
      // 检查是否是紧急任务
      const urgency = this.matrixManager.matrix.calculateUrgency(task.dueDate);
      if (urgency >= 0.8) {
        await this.showNotification('紧急任务提醒', `新添加的紧急任务：${task.title}`);
      }
    } catch (error) {
      console.error('处理任务添加事件失败:', error);
    }
  }

  /**
   * 处理任务完成
   */
  async handleTaskCompleted(task) {
    try {
      await this.showNotification('任务完成', `恭喜！任务"${task.title}"已完成`);
    } catch (error) {
      console.error('处理任务完成事件失败:', error);
    }
  }

  /**
   * 处理任务更新
   */
  handleTaskUpdated(task) {
    // 可以在这里添加任务更新后的逻辑
    console.log('任务已更新:', task.title);
  }

  /**
   * 处理任务删除
   */
  handleTaskDeleted(data) {
    console.log('任务已删除:', data.taskId);
  }

  /**
   * 处理消息
   */
  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'getStats':
          const stats = await this.taskManager.getTaskStats();
          sendResponse({ success: true, data: stats });
          break;
          
        case 'getMatrixStats':
          const matrixStats = this.matrixManager.getMatrixStats();
          sendResponse({ success: true, data: matrixStats });
          break;
          
        case 'addTask':
          const newTask = await this.taskManager.addTask(message.data);
          sendResponse({ success: !!newTask, data: newTask });
          break;
          
        case 'updateTask':
          const updatedTask = await this.taskManager.updateTask(message.taskId, message.data);
          sendResponse({ success: !!updatedTask, data: updatedTask });
          break;
          
        case 'deleteTask':
          const success = await this.taskManager.deleteTask(message.taskId);
          sendResponse({ success });
          break;
          
        case 'completeTask':
          const completed = await this.taskManager.markTaskAsCompleted(message.taskId);
          sendResponse({ success: completed });
          break;
          
        case 'getTasks':
          const tasks = await this.taskManager.getTasks(message.filter);
          sendResponse({ success: true, data: tasks });
          break;
          
        case 'exportData':
          const exportData = await this.storageManager.exportData();
          sendResponse({ success: !!exportData, data: exportData });
          break;
          
        case 'importData':
          const importSuccess = await this.storageManager.importData(message.data);
          sendResponse({ success: importSuccess });
          break;
          
        case 'updateBadge':
          this.updateBadge();
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ success: false, error: '未知消息类型' });
      }
    } catch (error) {
      console.error('处理消息失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * 处理插件安装
   */
  async handleInstall(details) {
    try {
      if (details.reason === 'install') {
        // 首次安装
        console.log('插件首次安装');
        
        // 创建欢迎任务
        await this.createWelcomeTasks();
        
        // 显示欢迎通知
        await this.showNotification(
          '欢迎使用 TaskMatrix Pro',
          '您的智能任务管理助手已准备就绪！点击插件图标开始使用。'
        );
        
      } else if (details.reason === 'update') {
        // 更新
        console.log('插件已更新到版本:', chrome.runtime.getManifest().version);
        
        await this.showNotification(
          'TaskMatrix Pro 已更新',
          `插件已更新到版本 ${chrome.runtime.getManifest().version}`
        );
      }
    } catch (error) {
      console.error('处理安装事件失败:', error);
    }
  }

  /**
   * 处理插件启动
   */
  async handleStartup() {
    try {
      console.log('插件启动');
      
      // 更新徽章
      this.updateBadge();
      
      // 检查超期任务
      await this.checkOverdueTasks();
      
    } catch (error) {
      console.error('处理启动事件失败:', error);
    }
  }

  /**
   * 创建欢迎任务
   */
  async createWelcomeTasks() {
    try {
      const welcomeTasks = [
        {
          title: '欢迎使用 TaskMatrix Pro',
          description: '这是一个示例任务，您可以删除它',
          importance: 3,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 明天
          category: 'other',
          color: '#3B82F6'
        },
        {
          title: '查看使用帮助',
          description: '点击帮助按钮了解如何使用艾森豪威尔矩阵',
          importance: 4,
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 后天
          category: 'study',
          color: '#10B981'
        }
      ];
      
      for (const taskData of welcomeTasks) {
        await this.taskManager.addTask(taskData);
      }
    } catch (error) {
      console.error('创建欢迎任务失败:', error);
    }
  }

  /**
   * 请求通知权限
   */
  async requestNotificationPermission() {
    try {
      if (chrome.notifications) {
        // Chrome扩展的通知权限通常在安装时自动授予
        console.log('通知权限已就绪');
      }
    } catch (error) {
      console.error('请求通知权限失败:', error);
    }
  }

  /**
   * 显示通知
   */
  async showNotification(title, message) {
    try {
      if (chrome.notifications) {
        const notificationId = `taskmatrix_${Date.now()}`;
        
        await chrome.notifications.create(notificationId, {
          type: 'basic',
          iconUrl: 'assets/icons/icon48.png',
          title: title,
          message: message
        });
        
        // 5秒后自动清除通知
        setTimeout(() => {
          chrome.notifications.clear(notificationId);
        }, 5000);
      }
    } catch (error) {
      console.error('显示通知失败:', error);
    }
  }

  /**
   * 获取插件信息
   */
  getExtensionInfo() {
    const manifest = chrome.runtime.getManifest();
    return {
      name: manifest.name,
      version: manifest.version,
      description: manifest.description
    };
  }

  /**
   * 清理资源
   */
  destroy() {
    // 清除定时任务
    chrome.alarms.clearAll();
    
    // 清理事件监听器
    this.matrixManager.destroy();
  }
}

// 初始化后台服务
const backgroundService = new BackgroundService();

// 监听插件卸载
chrome.runtime.onSuspend.addListener(() => {
  backgroundService.destroy();
}); 