/**
 * 艾森豪威尔矩阵数据模型
 */
import { Task } from './Task.js';

export class Matrix {
  constructor() {
    this.quadrants = {
      q1: {
        name: 'Important & Urgent',
        color: '#EF4444',
        description: 'Do it now',
        tasks: []
      },
      q2: {
        name: 'Important & Not Urgent',
        color: '#2563EB',
        description: 'Schedule it',
        tasks: []
      },
      q3: {
        name: 'Urgent & Not Important',
        color: '#F59E0B',
        description: 'Delegate it',
        tasks: []
      },
      q4: {
        name: 'Not Important & Not Urgent',
        color: '#9CA3AF',
        description: 'Eliminate it',
        tasks: []
      }
    };
  }

  /**
   * 清空所有象限的任务
   */
  clearTasks() {
    Object.values(this.quadrants).forEach(quadrant => {
      quadrant.tasks = [];
    });
  }

  /**
   * 将任务分配到对应象限
   */
  assignTask(task) {
    const quadrantKey = this.getQuadrantKey(task);
    this.quadrants[quadrantKey].tasks.push(task);
  }

  /**
   * 添加任务到矩阵
   */
  addTask(task) {
    // 只添加进行中的任务到矩阵
    if (task.status === 'doing') {
      this.assignTask(task);
    }
  }

  /**
   * 获取所有任务
   */
  getAllTasks() {
    return Object.values(this.quadrants).flatMap(quadrant => quadrant.tasks);
  }

  /**
   * 获取任务所属象限
   */
  getQuadrantKey(task) {
    const urgency = this.calculateUrgency(task.dueDate);
    const importance = task.importance;

    // 重要性映射
    const isImportant = importance >= 5;
    const isUrgent = urgency >= 0.6;

    if (isImportant && isUrgent) {
      return 'q1'; // 重要且紧急
    } else if (isImportant && !isUrgent) {
      return 'q2'; // 重要不紧急
    } else if (!isImportant && isUrgent) {
      return 'q3'; // 紧急不重要
    } else {
      return 'q4'; // 不重要不紧急
    }
  }

  /**
   * 计算紧急程度
   */
  calculateUrgency(dueDate) {
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due - now;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffMs < 0) {
      return 1.0; // 已超期
    } else if (diffDays <= 1) {
      return 0.8 + (1 - diffDays) * 0.2; // 24小时内
    } else if (diffDays <= 3) {
      return 0.6 + (3 - diffDays) / 2 * 0.2; // 3天内
    } else if (diffDays <= 7) {
      return 0.4 + (7 - diffDays) / 4 * 0.2; // 1周内
    } else if (diffDays <= 30) {
      return 0.2 + (30 - diffDays) / 23 * 0.2; // 1月内
    } else {
      return 0.2; // 超过1月
    }
  }

  /**
   * 获取象限统计信息
   */
  getQuadrantStats() {
    const stats = {};
    
    Object.entries(this.quadrants).forEach(([key, quadrant]) => {
      stats[key] = {
        name: quadrant.name,
        color: quadrant.color,
        count: quadrant.tasks.length,
        overdue: quadrant.tasks.filter(task => task.isOverdue()).length,
        completed: quadrant.tasks.filter(task => task.status === 'completed').length
      };
    });

    return stats;
  }

  /**
   * 获取矩阵统计信息
   */
  getStats() {
    const allTasks = this.getAllTasks();
    const total = allTasks.length;
    const completed = allTasks.filter(task => task.status === 'completed').length;
    const doing = allTasks.filter(task => task.status === 'doing').length;
    const rejected = allTasks.filter(task => task.status === 'rejected').length;
    
    return {
      total,
      completed,
      doing,
      rejected,
      completionRate: total > 0 ? 
        (allTasks.filter(task => task.status === 'completed').length / allTasks.length) * 100 : 0
    };
  }

  /**
   * 获取象限边界信息
   * 新的坐标轴逻辑：
   * X轴：紧急程度（左不紧急，右紧急）
   * Y轴：重要程度（上重要，下不重要）
   */
  getQuadrantBounds(quadrantKey, canvasWidth, canvasHeight) {
    const width = canvasWidth / 2;
    const height = canvasHeight / 2;

    switch (quadrantKey) {
      case 'q1': // 右上 - 重要且紧急
        return { x: width, y: 0, width, height };
      case 'q2': // 左上 - 重要不紧急
        return { x: 0, y: 0, width, height };
      case 'q3': // 右下 - 紧急不重要
        return { x: width, y: height, width, height };
      case 'q4': // 左下 - 不重要不紧急
        return { x: 0, y: height, width, height };
      default:
        return { x: 0, y: 0, width: 0, height: 0 };
    }
  }

  /**
   * 转换为普通对象
   */
  toObject() {
    return {
      quadrants: Object.entries(this.quadrants).reduce((acc, [key, quadrant]) => {
        acc[key] = {
          name: quadrant.name,
          color: quadrant.color,
          description: quadrant.description,
          tasks: quadrant.tasks.map(task => task.toObject())
        };
        return acc;
      }, {})
    };
  }

  /**
   * 从对象创建矩阵实例
   */
  static fromObject(obj) {
    const matrix = new Matrix();
    
    Object.entries(obj.quadrants).forEach(([key, quadrant]) => {
      matrix.quadrants[key].tasks = quadrant.tasks.map(taskObj => Task.fromObject(taskObj));
    });
    
    return matrix;
  }
} 