/**
 * 矩阵管理服务
 * 负责艾森豪威尔矩阵的计算和更新
 */
import { Matrix } from '../models/Matrix.js';

export class MatrixManager {
  constructor(taskManager) {
    this.taskManager = taskManager;
    this.matrix = new Matrix();
    this.updateInterval = null;
    this.autoUpdate = true;
    this.updateFrequency = 5 * 60 * 1000; // 5分钟
    
    // 绑定任务管理事件
    this.bindTaskEvents();
  }

  /**
   * 绑定任务管理事件
   */
  bindTaskEvents() {
    const events = ['taskAdded', 'taskUpdated', 'taskDeleted', 'taskCompleted', 'taskCancelled'];
    
    events.forEach(eventName => {
      this.taskManager.addEventListener(eventName, () => {
        this.updateMatrix();
      });
    });
  }

  /**
   * 更新矩阵数据
   */
  async updateMatrix() {
    try {
      console.log('=== MatrixManager.updateMatrix 开始 ===');
      
      // 获取所有进行中的任务
      const tasks = await this.taskManager.getTasks({ status: 'doing' });
      console.log('获取到doing状态的任务数:', tasks.length);
      
      // 创建矩阵实例
      this.matrix = new Matrix();
      
      // 将任务添加到矩阵中
      for (const task of tasks) { // 使用for...of循环支持await
        console.log(`添加任务到矩阵: ${task.title} (${task.status})`);
        await task.updateColor(); // 异步更新颜色
        this.matrix.addTask(task);
      }
      
      console.log('矩阵更新完成');
      console.log('=== MatrixManager.updateMatrix 结束 ===');
      
      return this.matrix;
    } catch (error) {
      console.error('更新矩阵失败:', error);
      return null;
    }
  }

  /**
   * 获取当前矩阵
   */
  getMatrix() {
    return this.matrix;
  }

  /**
   * 获取矩阵统计信息
   */
  getMatrixStats() {
    const stats = this.matrix.getQuadrantStats();
    const totalStats = this.matrix.getStats();
    
    return {
      quadrants: stats,
      total: totalStats,
      distribution: this.calculateDistribution(stats)
    };
  }

  /**
   * 计算象限分布
   */
  calculateDistribution(quadrantStats) {
    const total = Object.values(quadrantStats).reduce((sum, stat) => sum + stat.count, 0);
    
    if (total === 0) {
      return {
        q1: 0, q2: 0, q3: 0, q4: 0
      };
    }
    
    return {
      q1: Math.round((quadrantStats.q1.count / total) * 100),
      q2: Math.round((quadrantStats.q2.count / total) * 100),
      q3: Math.round((quadrantStats.q3.count / total) * 100),
      q4: Math.round((quadrantStats.q4.count / total) * 100)
    };
  }

  /**
   * 获取象限建议
   */
  getQuadrantSuggestions() {
    const stats = this.matrix.getQuadrantStats();
    const suggestions = [];
    
    // 第一象限（重要且紧急）建议
    if (stats.q1.count > 3) {
      suggestions.push({
        quadrant: 'q1',
        type: 'warning',
        message: '第一象限任务过多，建议优先处理最重要的任务，避免危机。',
        action: 'review_priorities'
      });
    }
    
    // 第二象限（重要不紧急）建议
    if (stats.q2.count < 2) {
      suggestions.push({
        quadrant: 'q2',
        type: 'info',
        message: '第二象限任务较少，建议增加重要但不紧急的任务，做好长期规划。',
        action: 'add_important_tasks'
      });
    }
    
    // 第三象限（紧急不重要）建议
    if (stats.q3.count > 2) {
      suggestions.push({
        quadrant: 'q3',
        type: 'warning',
        message: '第三象限任务较多，建议委托他人处理或简化这些任务。',
        action: 'delegate_tasks'
      });
    }
    
    // 第四象限（不重要不紧急）建议
    if (stats.q4.count > 1) {
      suggestions.push({
        quadrant: 'q4',
        type: 'warning',
        message: '第四象限任务较多，建议删除或避免这些任务，专注于重要事项。',
        action: 'remove_unimportant_tasks'
      });
    }
    
    return suggestions;
  }

  /**
   * 获取效率分析
   */
  async getEfficiencyAnalysis() {
    try {
      const tasks = await this.taskManager.getTasks();
      const completedTasks = tasks.filter(task => task.status === 'completed');
      
      if (completedTasks.length === 0) {
        return {
          efficiency: 0,
          quadrantEfficiency: { q1: 0, q2: 0, q3: 0, q4: 0 },
          recommendations: []
        };
      }
      
      // 计算各象限完成率
      const quadrantEfficiency = {};
      const quadrantNames = ['q1', 'q2', 'q3', 'q4'];
      
      quadrantNames.forEach(quadrantKey => {
        const quadrantTasks = completedTasks.filter(task => {
          const tempMatrix = new Matrix();
          return tempMatrix.getQuadrantKey(task) === quadrantKey;
        });
        
        const totalQuadrantTasks = tasks.filter(task => {
          const tempMatrix = new Matrix();
          return tempMatrix.getQuadrantKey(task) === quadrantKey;
        });
        
        quadrantEfficiency[quadrantKey] = totalQuadrantTasks.length > 0 ? 
          (quadrantTasks.length / totalQuadrantTasks.length) * 100 : 0;
      });
      
      // 计算整体效率（加权平均）
      const weights = { q1: 0.4, q2: 0.3, q3: 0.2, q4: 0.1 };
      const efficiency = Object.entries(quadrantEfficiency).reduce((sum, [key, value]) => {
        return sum + (value * weights[key]);
      }, 0);
      
      // 生成建议
      const recommendations = this.generateEfficiencyRecommendations(quadrantEfficiency);
      
      return {
        efficiency: Math.round(efficiency * 100) / 100,
        quadrantEfficiency,
        recommendations
      };
    } catch (error) {
      console.error('获取效率分析失败:', error);
      return {
        efficiency: 0,
        quadrantEfficiency: { q1: 0, q2: 0, q3: 0, q4: 0 },
        recommendations: []
      };
    }
  }

  /**
   * 生成效率建议
   */
  generateEfficiencyRecommendations(quadrantEfficiency) {
    const recommendations = [];
    
    if (quadrantEfficiency.q1 < 70) {
      recommendations.push({
        type: 'improvement',
        message: '第一象限完成率较低，建议提高重要紧急任务的处理效率。',
        priority: 'high'
      });
    }
    
    if (quadrantEfficiency.q2 < 60) {
      recommendations.push({
        type: 'improvement',
        message: '第二象限完成率较低，建议增加重要不紧急任务的投入时间。',
        priority: 'medium'
      });
    }
    
    if (quadrantEfficiency.q3 > 80) {
      recommendations.push({
        type: 'warning',
        message: '第三象限完成率过高，可能花费了过多时间在不重要的任务上。',
        priority: 'medium'
      });
    }
    
    if (quadrantEfficiency.q4 > 50) {
      recommendations.push({
        type: 'warning',
        message: '第四象限完成率过高，建议减少不重要不紧急任务的投入。',
        priority: 'low'
      });
    }
    
    return recommendations;
  }

  /**
   * 获取时间趋势分析
   */
  async getTimeTrendAnalysis(days = 30) {
    try {
      const tasks = await this.taskManager.getTasks();
      const endDate = Date.now(); // 直接使用时间戳
      const startDate = endDate - (days * 24 * 60 * 60 * 1000); // 直接使用时间戳进行计算
      
      // 按日期分组任务
      const dailyStats = {};
      const currentDate = new Date(startDate); // 用于循环，这里需要Date对象
      
      while (currentDate.getTime() <= endDate) {
        const dateKey = currentDate.toLocaleDateString(); // 使用toLocaleDateString显示本地日期
        dailyStats[dateKey] = {
          created: 0,
          completed: 0,
          overdue: 0
        };
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // 统计每日数据
      tasks.forEach(task => {
        const createdDate = new Date(task.createdAt).toLocaleDateString(); // 使用toLocaleDateString显示本地日期
        if (dailyStats[createdDate]) {
          dailyStats[createdDate].created++;
        }
        
        if (task.status === 'completed' && task.completedAt) {
          const completedDate = new Date(task.completedAt).toLocaleDateString(); // 使用toLocaleDateString显示本地日期
          if (dailyStats[completedDate]) {
            dailyStats[completedDate].completed++;
          }
        }
        
        if (task.isOverdue()) {
          const overdueDate = new Date(Date.now()).toLocaleDateString(); // 使用toLocaleDateString显示本地日期
          if (dailyStats[overdueDate]) {
            dailyStats[overdueDate].overdue++;
          }
        }
      });
      
      return {
        dailyStats,
        summary: this.calculateTrendSummary(dailyStats)
      };
    } catch (error) {
      console.error('获取时间趋势分析失败:', error);
      return { dailyStats: {}, summary: {} };
    }
  }

  /**
   * 计算趋势摘要
   */
  calculateTrendSummary(dailyStats) {
    const dates = Object.keys(dailyStats).sort();
    const createdTrend = dates.map(date => dailyStats[date].created);
    const completedTrend = dates.map(date => dailyStats[date].completed);
    
    return {
      totalCreated: createdTrend.reduce((sum, count) => sum + count, 0),
      totalCompleted: completedTrend.reduce((sum, count) => sum + count, 0),
      averageCreated: createdTrend.reduce((sum, count) => sum + count, 0) / dates.length,
      averageCompleted: completedTrend.reduce((sum, count) => sum + count, 0) / dates.length,
      completionRate: createdTrend.reduce((sum, count) => sum + count, 0) > 0 ? 
        (completedTrend.reduce((sum, count) => sum + count, 0) / createdTrend.reduce((sum, count) => sum + count, 0)) * 100 : 0
    };
  }

  /**
   * 启动自动更新
   */
  startAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.autoUpdate = true;
    this.updateInterval = setInterval(() => {
      if (this.autoUpdate) {
        this.updateMatrix();
      }
    }, this.updateFrequency);
  }

  /**
   * 停止自动更新
   */
  stopAutoUpdate() {
    this.autoUpdate = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * 设置更新频率
   */
  setUpdateFrequency(frequency) {
    this.updateFrequency = frequency;
    if (this.autoUpdate) {
      this.startAutoUpdate();
    }
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
          console.error('矩阵事件回调执行失败:', error);
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
   * 销毁服务
   */
  destroy() {
    this.stopAutoUpdate();
    this.eventListeners = null;
  }
} 