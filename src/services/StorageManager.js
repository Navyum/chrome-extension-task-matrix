/**
 * 存储管理服务
 * 负责与Chrome Storage API交互
 */
import { Task } from '../models/Task.js';

export class StorageManager {
  constructor() {
    this.storage = chrome.storage.local;
  }

  /**
   * 保存任务
   */
  async saveTask(task) {
    try {
      const tasks = await this.getTasks();
      tasks.push(task.toObject());
      await this.storage.set({ tasks });
      return true;
    } catch (error) {
      console.error('保存任务失败:', error);
      return false;
    }
  }

  /**
   * 获取所有任务
   */
  async getTasks() {
    try {
      const result = await this.storage.get(['tasks']);
      const tasks = result.tasks || [];
      return tasks.map(taskObj => Task.fromObject(taskObj));
    } catch (error) {
      console.error('获取任务失败:', error);
      return [];
    }
  }

  /**
   * 更新任务
   */
  async updateTask(taskId, updates) {
    try {
      const tasks = await this.getTasks();
      const index = tasks.findIndex(task => task.id === taskId);
      
      if (index !== -1) {
        tasks[index].update(updates);
        const taskObjects = tasks.map(task => task.toObject());
        await this.storage.set({ tasks: taskObjects });
        return true;
      }
      return false;
    } catch (error) {
      console.error('更新任务失败:', error);
      return false;
    }
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId) {
    try {
      const tasks = await this.getTasks();
      const filteredTasks = tasks.filter(task => task.id !== taskId);
      const taskObjects = filteredTasks.map(task => task.toObject());
      await this.storage.set({ tasks: taskObjects });
      return true;
    } catch (error) {
      console.error('删除任务失败:', error);
      return false;
    }
  }

  /**
   * 批量保存任务
   */
  async saveTasks(tasks) {
    try {
      const taskObjects = tasks.map(task => task.toObject());
      await this.storage.set({ tasks: taskObjects });
      return true;
    } catch (error) {
      console.error('批量保存任务失败:', error);
      return false;
    }
  }

  /**
   * 清空所有任务
   */
  async clearTasks() {
    try {
      await this.storage.remove(['tasks']);
      return true;
    } catch (error) {
      console.error('清空任务失败:', error);
      return false;
    }
  }

  /**
   * 获取设置
   */
  async getSettings() {
    try {
      const result = await this.storage.get(['settings']);
      return result.settings || this.getDefaultSettings();
    } catch (error) {
      console.error('获取设置失败:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * 保存设置
   */
  async saveSettings(settings) {
    try {
      await this.storage.set({ settings });
      return true;
    } catch (error) {
      console.error('保存设置失败:', error);
      return false;
    }
  }

  /**
   * 获取默认设置
   */
  getDefaultSettings() {
    return {
      theme: 'light',
      language: 'zh-CN',
      notifications: true,
      autoRefresh: true,
      refreshInterval: 5, // 分钟
      urgentThreshold: 24, // 小时
      showCompleted: false,
      defaultImportance: 5,
      defaultCategory: 'default'
    };
  }

  /**
   * 导出数据
   */
  async exportData() {
    try {
      const tasks = await this.getTasks();
      const settings = await this.getSettings();
      
      return {
        version: '1.0.0',
        exportDate: new Date(Date.now()).toISOString(), // 统一使用时间戳并转换为UTC ISO字符串
        tasks: tasks.map(task => task.toObject()),
        settings
      };
    } catch (error) {
      console.error('导出数据失败:', error);
      return null;
    }
  }

  /**
   * 导入数据
   */
  async importData(data) {
    try {
      if (!data || !data.tasks) {
        throw new Error('无效的数据格式');
      }

      // 验证数据版本
      if (data.version !== '1.0.0') {
        console.warn('数据版本不匹配，可能影响兼容性');
      }

      // 导入任务
      const tasks = data.tasks.map(taskObj => Task.fromObject(taskObj));
      await this.saveTasks(tasks);

      // 导入设置
      if (data.settings) {
        await this.saveSettings(data.settings);
      }

      return true;
    } catch (error) {
      console.error('导入数据失败:', error);
      return false;
    }
  }

  /**
   * 获取存储使用情况
   */
  async getStorageUsage() {
    try {
      const result = await this.storage.get(null);
      const totalBytes = JSON.stringify(result).length;
      return {
        totalBytes,
        totalKB: Math.round(totalBytes / 1024 * 100) / 100,
        totalMB: Math.round(totalBytes / (1024 * 1024) * 100) / 100
      };
    } catch (error) {
      console.error('获取存储使用情况失败:', error);
      return null;
    }
  }

  /**
   * 监听存储变化
   */
  onStorageChanged(callback) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        callback(changes);
      }
    });
  }
} 