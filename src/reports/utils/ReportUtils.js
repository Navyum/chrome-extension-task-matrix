/**
 * 报告工具类
 * 提供报告模块公共的工具函数
 */
import { i18n } from '../../utils/i18n.js';
export class ReportUtils {
  constructor() {
    this.importanceThreshold = 5.5; // 1-10分，大于等于5.5视为重要
    this.urgentThresholdMs = 24 * 60 * 60 * 1000; // 24小时内视为紧急
  }

  /**
   * 分析任务按四象限
   */
  analyzeTasksByQuadrant(tasks) {
    // 按象限分类任务
    const quadrants = {
      q1: { name: i18n.getMessage('importantUrgent'), tasks: [], completed: 0, total: 0, timeSpent: 0, overdue: 0, rejected: 0 },
      q2: { name: i18n.getMessage('importantNotUrgent'), tasks: [], completed: 0, total: 0, timeSpent: 0, overdue: 0, rejected: 0 },
      q3: { name: i18n.getMessage('notImportantNotUrgent'), tasks: [], completed: 0, total: 0, timeSpent: 0, overdue: 0, rejected: 0 },
      q4: { name: i18n.getMessage('notImportantUrgent'), tasks: [], completed: 0, total: 0, timeSpent: 0, overdue: 0, rejected: 0 }
    };
    
    tasks.forEach(task => {
      // 确定任务象限
      const quadrantKey = this.getTaskQuadrant(task);
      
      // 添加到相应象限
      quadrants[quadrantKey].tasks.push(task);
      quadrants[quadrantKey].total++;
      
      // 统计已完成、已拒绝和已超期任务
      if (task.status === 'completed') {
        quadrants[quadrantKey].completed++;
      } else if (task.status === 'rejected') {
        quadrants[quadrantKey].rejected++;
      } else if (task.isOverdue()) {
        quadrants[quadrantKey].overdue++;
      }
      
      // 计算任务耗时（如果已完成）
      if (task.status === 'completed' && task.completedAt) {
        const timeSpent = task.completedAt - task.createdAt;
        quadrants[quadrantKey].timeSpent += timeSpent;
      }
    });
    
    // 计算每个象限的完成率和平均耗时
    Object.keys(quadrants).forEach(key => {
      const quadrant = quadrants[key];
      quadrant.completionRate = quadrant.total > 0 
        ? Math.round((quadrant.completed / quadrant.total) * 100) 
        : 0;
      
      quadrant.avgTimeSpent = quadrant.completed > 0 
        ? quadrant.timeSpent / quadrant.completed 
        : 0;
    });
    
    return quadrants;
  }
  
  /**
   * 获取任务所属的象限
   */
  getTaskQuadrant(task) {
    const isImportant = task.importance >= this.importanceThreshold;
    const timeRemaining = task.getTimeRemaining();
    const isUrgent = timeRemaining <= this.urgentThresholdMs;
    
    if (isImportant && isUrgent) {
      return 'q1'; // 重要且紧急
    } else if (isImportant && !isUrgent) {
      return 'q2'; // 重要不紧急
    } else if (!isImportant && !isUrgent) {
      return 'q3'; // 次要琐碎（不重要不紧急）
    } else {
      return 'q4'; // 突发临时（不重要但紧急）
    }
  }
  
  /**
   * 格式化日期
   */
  formatDate(date, period) {
    if (period === 'week') {
      // 格式化为 "MM/DD" 格式
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${month}/${day}`;
    } else {
      // 格式化为 "YYYY-MM" 格式
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    }
  }
  
  /**
   * 获取任务来源的显示名称
   */
  getSourceDisplayName(source) {
    const sourceLabels = {
      'work': i18n.getMessage('work'),
      'personal': i18n.getMessage('personal'),
      'study': i18n.getMessage('study'),
      'health': i18n.getMessage('health'),
      'other': i18n.getMessage('other')
    };
    
    return sourceLabels[source] || source;
  }
  
  /**
   * 创建带标题的分析模块容器
   */
  createModuleContainer(container, title) {
    if (!container) return null;
    
    container.innerHTML = '';
    
    const section = document.createElement('div');
    section.className = 'report-section';
    
    section.innerHTML = `
      <h4>${title}</h4>
      <div class="chart-container"></div>
      <div class="insight-container">
        <h5>${i18n.getMessage('deepInsights')}</h5>
        <div class="insight-content"></div>
      </div>
    `;
    
    container.appendChild(section);
    
    return {
      chartContainer: section.querySelector('.chart-container'),
      insightContainer: section.querySelector('.insight-content')
    };
  }
  
  /**
   * 生成洞察HTML
   */
  generateInsightsHTML(insights) {
    if (insights.length === 0) {
      return `<div class="insight-item">${i18n.getMessage('currentlyNotEnoughDataForInsights')}</div>`;
    }
    
    return insights.map(insight => `<div class="insight-item">${insight}</div>`).join('');
  }
} 