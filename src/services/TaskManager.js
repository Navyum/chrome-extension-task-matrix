/**
 * 任务管理服务
 * 负责任务的增删改查操作
 */
import { Task } from '../models/Task.js';

export class TaskManager {
  constructor(storageManager) {
    this.storage = storageManager;
  }

  /**
   * 添加任务
   */
  async addTask(taskData) {
    try {
      const task = new Task(
        taskData.id || this.generateId(),
        taskData.title,
        taskData.description,
        taskData.importance,
        taskData.dueDate,
        taskData.category,
        'doing', // 默认状态改为doing
        taskData.coordinates
      );

      const success = await this.storage.saveTask(task);
      if (success) {
        this.emitEvent('taskAdded', task);
        return task;
      }
      return null;
    } catch (error) {
      console.error('添加任务失败:', error);
      return null;
    }
  }

  /**
   * 数据迁移：将pending状态转换为doing状态
   */
  async migratePendingToDoing() {
    try {
      const tasks = await this.storage.getTasks();
      console.log('=== 数据迁移开始 ===');
      console.log('总任务数:', tasks.length);
      console.log('任务状态分布:', {
        pending: tasks.filter(t => t.status === 'pending').length,
        doing: tasks.filter(t => t.status === 'doing').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        rejected: tasks.filter(t => t.status === 'rejected').length,
        cancelled: tasks.filter(t => t.status === 'cancelled').length
      });
      
      let hasChanges = false;
      
      for (const task of tasks) {
        if (task.status === 'pending') {
          console.log(`迁移任务状态: ${task.title} (${task.id}) - pending -> doing`);
          task.status = 'doing';
          task.updatedAt = new Date();
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        const taskObjects = tasks.map(task => task.toObject());
        await this.storage.storage.set({ tasks: taskObjects });
        console.log('数据迁移完成：pending -> doing');
        console.log('迁移后状态分布:', {
          pending: tasks.filter(t => t.status === 'pending').length,
          doing: tasks.filter(t => t.status === 'doing').length,
          completed: tasks.filter(t => t.status === 'completed').length,
          rejected: tasks.filter(t => t.status === 'rejected').length,
          cancelled: tasks.filter(t => t.status === 'cancelled').length
        });
        this.emitEvent('tasksMigrated', { count: tasks.filter(t => t.status === 'doing').length });
      } else {
        console.log('无需迁移：没有pending状态的任务');
      }
      
      console.log('=== 数据迁移结束 ===');
      return hasChanges;
    } catch (error) {
      console.error('数据迁移失败:', error);
      return false;
    }
  }

  /**
   * 获取所有任务
   */
  async getTasks(filter = {}) {
    try {
      const tasks = await this.storage.getTasks();
      return this.filterTasks(tasks, filter);
    } catch (error) {
      console.error('获取任务失败:', error);
      return [];
    }
  }

  /**
   * 根据ID获取任务
   */
  async getTaskById(taskId) {
    try {
      const tasks = await this.storage.getTasks();
      return tasks.find(task => task.id === taskId) || null;
    } catch (error) {
      console.error('获取任务失败:', error);
      return null;
    }
  }

  /**
   * 更新任务
   */
  async updateTask(taskId, updates) {
    try {
      const success = await this.storage.updateTask(taskId, updates);
      if (success) {
        const updatedTask = await this.getTaskById(taskId);
        this.emitEvent('taskUpdated', updatedTask);
        return updatedTask;
      }
      return null;
    } catch (error) {
      console.error('更新任务失败:', error);
      return null;
    }
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId) {
    try {
      const success = await this.storage.deleteTask(taskId);
      if (success) {
        this.emitEvent('taskDeleted', { taskId });
        return true;
      }
      return false;
    } catch (error) {
      console.error('删除任务失败:', error);
      return false;
    }
  }

  /**
   * 标记任务为完成
   */
  async markTaskAsCompleted(taskId) {
    try {
      const task = await this.getTaskById(taskId);
      if (!task) return false;

      const success = await this.storage.updateTask(taskId, {
        status: 'completed',
        completedAt: new Date()
      });

      if (success) {
        task.markAsCompleted();
        this.emitEvent('taskCompleted', task);
        return true;
      }
      return false;
    } catch (error) {
      console.error('标记任务完成失败:', error);
      return false;
    }
  }

  /**
   * 标记任务为取消
   */
  async markTaskAsCancelled(taskId) {
    try {
      const task = await this.getTaskById(taskId);
      if (!task) return false;

      const success = await this.storage.updateTask(taskId, {
        status: 'cancelled'
      });

      if (success) {
        task.markAsCancelled();
        this.emitEvent('taskCancelled', task);
        return true;
      }
      return false;
    } catch (error) {
      console.error('标记任务取消失败:', error);
      return false;
    }
  }

  /**
   * 标记任务为拒绝
   */
  async markTaskAsRejected(taskId) {
    try {
      const task = await this.getTaskById(taskId);
      if (!task) return false;

      const success = await this.storage.updateTask(taskId, {
        status: 'rejected'
      });

      if (success) {
        task.markAsRejected();
        this.emitEvent('taskRejected', task);
        return true;
      }
      return false;
    } catch (error) {
      console.error('标记任务拒绝失败:', error);
      return false;
    }
  }

  /**
   * 批量操作任务
   */
  async batchUpdateTasks(taskIds, updates) {
    try {
      const results = await Promise.all(
        taskIds.map(taskId => this.updateTask(taskId, updates))
      );
      
      const successCount = results.filter(result => result !== null).length;
      this.emitEvent('tasksBatchUpdated', { taskIds, successCount });
      
      return successCount === taskIds.length;
    } catch (error) {
      console.error('批量更新任务失败:', error);
      return false;
    }
  }

  /**
   * 批量删除任务
   */
  async batchDeleteTasks(taskIds) {
    try {
      const results = await Promise.all(
        taskIds.map(taskId => this.deleteTask(taskId))
      );
      
      const successCount = results.filter(result => result === true).length;
      this.emitEvent('tasksBatchDeleted', { taskIds, successCount });
      
      return successCount === taskIds.length;
    } catch (error) {
      console.error('批量删除任务失败:', error);
      return false;
    }
  }

  /**
   * 筛选任务
   */
  filterTasks(tasks, filter) {
    return tasks.filter(task => {
      // 状态筛选
      if (filter.status && task.status !== filter.status) {
        return false;
      }

      // 分类筛选
      if (filter.category && task.category !== filter.category) {
        return false;
      }

      // 重要性筛选
      if (filter.importance !== undefined && task.importance !== filter.importance) {
        return false;
      }

      // 超期筛选
      if (filter.overdue !== undefined) {
        const isOverdue = task.isOverdue();
        if (filter.overdue !== isOverdue) {
          return false;
        }
      }

      // 搜索筛选
      if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(searchTerm);
        const descriptionMatch = task.description.toLowerCase().includes(searchTerm);
        if (!titleMatch && !descriptionMatch) {
          return false;
        }
      }

      // 日期范围筛选
      if (filter.dateRange) {
        const taskDate = new Date(task.dueDate);
        const startDate = filter.dateRange.start ? new Date(filter.dateRange.start) : null;
        const endDate = filter.dateRange.end ? new Date(filter.dateRange.end) : null;
        
        if (startDate && taskDate < startDate) return false;
        if (endDate && taskDate > endDate) return false;
      }

      return true;
    });
  }

  /**
   * 排序任务
   */
  sortTasks(tasks, sortBy = 'dueDate', sortOrder = 'asc') {
    return [...tasks].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'importance':
          aValue = a.importance;
          bValue = b.importance;
          break;
        case 'dueDate':
          aValue = new Date(a.dueDate);
          bValue = new Date(b.dueDate);
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a[sortBy];
          bValue = b[sortBy];
      }

      if (sortOrder === 'desc') {
        [aValue, bValue] = [bValue, aValue];
      }

      if (aValue < bValue) return -1;
      if (aValue > bValue) return 1;
      return 0;
    });
  }

  /**
   * 获取任务统计
   */
  async getTaskStats() {
    try {
      const tasks = await this.getTasks();
      const total = tasks.length;
      const completed = tasks.filter(task => task.status === 'completed').length;
      const doing = tasks.filter(task => task.status === 'doing').length;
      const cancelled = tasks.filter(task => task.status === 'cancelled').length;
      const rejected = tasks.filter(task => task.status === 'rejected').length;
      
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      return {
        total,
        completed,
        doing,
        cancelled,
        rejected,
        completionRate
      };
    } catch (error) {
      console.error('获取任务统计失败:', error);
      return {
        total: 0,
        completed: 0,
        doing: 0,
        cancelled: 0,
        rejected: 0,
        completionRate: 0
      };
    }
  }

  /**
   * 获取任务分类统计
   */
  async getCategoryStats() {
    try {
      const tasks = await this.getTasks();
      const categoryStats = {};

      tasks.forEach(task => {
        const category = task.category || 'default';
        if (!categoryStats[category]) {
          categoryStats[category] = {
            total: 0,
            completed: 0,
            pending: 0,
            cancelled: 0
          };
        }

        categoryStats[category].total++;
        categoryStats[category][task.status]++;
      });

      return categoryStats;
    } catch (error) {
      console.error('获取分类统计失败:', error);
      return {};
    }
  }

  /**
   * 获取重要性分布统计
   */
  async getImportanceStats() {
    try {
      const tasks = await this.getTasks();
      const importanceStats = {};

      for (let i = 0; i <= 5; i++) {
        importanceStats[i] = {
          total: 0,
          completed: 0,
          pending: 0,
          cancelled: 0
        };
      }

      tasks.forEach(task => {
        const importance = task.importance;
        importanceStats[importance].total++;
        importanceStats[importance][task.status]++;
      });

      return importanceStats;
    } catch (error) {
      console.error('获取重要性统计失败:', error);
      return {};
    }
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 事件系统
   */
  emitEvent(eventName, data) {
    if (this.eventListeners && this.eventListeners[eventName]) {
      this.eventListeners[eventName].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('事件回调执行失败:', error);
        }
      });
    }
  }

  /**
   * 添加事件监听器
   */
  addEventListener(eventName, callback) {
    if (!this.eventListeners) {
      this.eventListeners = {};
    }
    
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = [];
    }
    
    this.eventListeners[eventName].push(callback);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(eventName, callback) {
    if (this.eventListeners && this.eventListeners[eventName]) {
      const index = this.eventListeners[eventName].indexOf(callback);
      if (index !== -1) {
        this.eventListeners[eventName].splice(index, 1);
      }
    }
  }

  /**
   * 清空所有任务
   */
  async clearAllTasks() {
    try {
      const success = await this.storage.clearTasks();
      if (success) {
        this.emitEvent('allTasksCleared');
      }
      return success;
    } catch (error) {
      console.error('清空所有任务失败:', error);
      return false;
    }
  }

  /**
   * 导出任务数据
   */
  async exportTasks() {
    try {
      const tasks = await this.getTasks();
      return tasks.map(task => task.toObject());
    } catch (error) {
      console.error('导出任务失败:', error);
      return [];
    }
  }

  /**
   * 导入任务数据
   */
  async importTasks(taskDataArray) {
    try {
      const importedTasks = [];
      
      for (const taskData of taskDataArray) {
        const task = Task.fromObject(taskData);
        const success = await this.storage.saveTask(task);
        if (success) {
          importedTasks.push(task);
        }
      }
      
      this.emitEvent('tasksImported', { count: importedTasks.length });
      return importedTasks;
    } catch (error) {
      console.error('导入任务失败:', error);
      return [];
    }
  }
} 