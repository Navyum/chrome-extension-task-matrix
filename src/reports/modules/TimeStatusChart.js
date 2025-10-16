/**
 * 任务耗时-状态散点图模块
 */
import { i18n } from '../../utils/i18n.js';

export class TimeStatusChart {
  constructor(utils) {
    this.utils = utils;
    this.chartContainer = null;
    this.insightContainer = null;
    this.statsContainer = null;
  }
  
  /**
   * 初始化容器
   */
  initContainer(container) {
    if (!container) return;
    
    const elements = this.utils.createModuleContainer(container, i18n.getMessage('timeCompletionStatusScatter'));
    if (elements) {
      this.chartContainer = elements.chartContainer;
      this.insightContainer = elements.insightContainer;
      
      // 添加统计数据容器
      this.statsContainer = document.createElement('div');
      this.statsContainer.className = 'time-stats';
      elements.chartContainer.parentNode.insertBefore(
        this.statsContainer, 
        elements.chartContainer.nextSibling
      );
    }
  }
  
  /**
   * 更新图表
   */
  async update(tasks, quadrantData) {
    if (!this.chartContainer || !this.insightContainer) return;
    
    // 处理任务数据
    const taskData = this.processTaskData(tasks);
    
    // 创建散点图
    this.createScatterPlot(taskData);
    
    // 计算并显示统计数据
    this.displayTimeStatistics(taskData);
    
    // 生成洞察
    this.generateInsights(taskData, quadrantData);
  }
  
  /**
   * 处理任务数据
   */
  processTaskData(tasks) {
    // 筛选有完成时间或处于进行中的任务
    const filteredTasks = tasks.filter(task => 
      task.status === 'completed' || task.status === 'doing'
    );
    
    // 计算每个任务的耗时和重要性评分
    return filteredTasks.map(task => {
      // 计算任务耗时（毫秒转天）
      let timeSpent;
      if (task.status === 'completed' && task.completedAt) {
        timeSpent = (task.completedAt - task.createdAt) / (24 * 60 * 60 * 1000); // 转换为天
      } else {
        timeSpent = (Date.now() - task.createdAt) / (24 * 60 * 60 * 1000); // 当前进行中的任务
      }
      
      // 返回计算结果
      return {
        task,
        timeSpent: Math.round(timeSpent * 10) / 10, // 保留一位小数
        importance: task.importance,
        quadrant: this.utils.getTaskQuadrant(task),
        isCompleted: task.status === 'completed'
      };
    });
  }
  
  /**
   * 创建散点图
   */
  createScatterPlot(taskData) {
    if (!this.chartContainer || taskData.length === 0) {
      if (this.chartContainer) {
        this.chartContainer.innerHTML = `<div style="text-align: center; padding: 50px;">${i18n.getMessage('notEnoughTaskDataForScatterPlot')}</div>`;
      }
      return;
    }
    
    // 清空容器
    this.chartContainer.innerHTML = '';
    
    // 计算最大耗时用于缩放
    const maxTimeSpent = Math.max(...taskData.map(data => data.timeSpent), 1);
    
    // 定义象限颜色
    const quadrantColors = {
      q1: '#EF4444', // 红色 - 重要且紧急
      q2: '#10B981', // 绿色 - 重要不紧急
      q3: '#F59E0B', // 黄色 - 不重要紧急
      q4: '#9CA3AF'  // 灰色 - 不重要不紧急
    };

    // 定义象限标签
    const quadrantLabels = {
      q1: i18n.getMessage('importantUrgent'),
      q2: i18n.getMessage('importantNotUrgent'),
      q3: i18n.getMessage('notImportantNotUrgent'),
      q4: i18n.getMessage('notImportantUrgent')
    };
    
    // 创建散点图的SVG
    const svgWidth = this.chartContainer.offsetWidth || 600;
    const svgHeight = 210;
    const padding = { top: 30, right: 30, bottom: 50, left: 50 };
    
    let svg = `
      <svg width="100%" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
        <!-- Y轴 -->
        <line 
          x1="${padding.left}" 
          y1="${padding.top}" 
          x2="${padding.left}" 
          y2="${svgHeight - padding.bottom}" 
          stroke="#ccc" 
          stroke-width="1"
        />
        <!-- X轴 -->
        <line 
          x1="${padding.left}" 
          y1="${svgHeight - padding.bottom}" 
          x2="${svgWidth - padding.right}" 
          y2="${svgHeight - padding.bottom}" 
          stroke="#ccc" 
          stroke-width="1"
        />
        
        <!-- 轴标签 -->
        <text 
          x="${svgWidth / 2}" 
          y="${svgHeight - 10}" 
          text-anchor="middle" 
          font-size="12"
        >${i18n.getMessage('taskCost')}</text>
        
        <text 
          x="${15}" 
          y="${svgHeight / 2}" 
          text-anchor="middle" 
          font-size="12" 
          transform="rotate(-90, 15, ${svgHeight / 2})"
        >${i18n.getMessage('taskImportance')}</text>
    `;
    
    // 绘制数据点
    taskData.forEach(data => {
      // 计算坐标
      const x = padding.left + ((data.timeSpent / maxTimeSpent) * (svgWidth - padding.left - padding.right));
      const y = svgHeight - padding.bottom - (data.importance / 10) * (svgHeight - padding.top - padding.bottom);
      
      const color = quadrantColors[data.quadrant];
      const radius = 6;
      const opacity = data.isCompleted ? 1 : 0.6;
      const strokeWidth = data.isCompleted ? 0 : 1.5;
      
      svg += `
        <circle 
          cx="${x}" 
          cy="${y}" 
          r="${radius}" 
          fill="${data.isCompleted ? color : 'white'}" 
          stroke="${color}" 
          stroke-width="${strokeWidth}" 
          opacity="${opacity}"
          data-task-id="${data.task.id}"
        />
      `;
    });
    
    // X轴刻度
    const xTicks = [0, maxTimeSpent * 0.25, maxTimeSpent * 0.5, maxTimeSpent * 0.75, maxTimeSpent];
    xTicks.forEach(tick => {
      const x = padding.left + ((tick / maxTimeSpent) * (svgWidth - padding.left - padding.right));
      svg += `
        <line 
          x1="${x}" 
          y1="${svgHeight - padding.bottom}" 
          x2="${x}" 
          y2="${svgHeight - padding.bottom + 5}" 
          stroke="#ccc" 
          stroke-width="1"
        />
        <text 
          x="${x}" 
          y="${svgHeight - padding.bottom + 20}" 
          text-anchor="middle" 
          font-size="10"
        >${Math.round(tick * 10) / 10}</text>
      `;
    });
    
    // Y轴刻度
    const yTicks = [0, 2.5, 5, 7.5, 10];
    yTicks.forEach(tick => {
      const y = svgHeight - padding.bottom - (tick / 10) * (svgHeight - padding.top - padding.bottom);
      svg += `
        <line 
          x1="${padding.left}" 
          y1="${y}" 
          x2="${padding.left - 5}" 
          y2="${y}" 
          stroke="#ccc" 
          stroke-width="1"
        />
        <text 
          x="${padding.left - 10}" 
          y="${y + 4}" 
          text-anchor="end" 
          font-size="10"
        >${tick}</text>
      `;
    });
    
    // 关闭SVG标签
    svg += `</svg>`;
    
    // 添加图例
    const legendDiv = document.createElement('div');
    //legendDiv.className = 'chart-legend';
    legendDiv.style.marginTop = '1px';
    //legendDiv.style.display = 'flex';
    legendDiv.style.justifyContent = 'center';
    legendDiv.style.gap = '5px';
    
    // 为每个象限添加图例
    const statusItems = [
      {
        color: '#050505',
        label: i18n.getMessage('completed')
      },
      
      {
        color: '#f5f5f5',
        label: i18n.getMessage('doing')
      },
      
    ]
    
    let legendHTML = `
    <div style="margin-top: 5px;padding: 0px 10px 0px 10px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
  `;
    
    // 添加完成状态图例
    statusItems.forEach(item => {
      legendHTML += `
        <div style="display: flex; align-items: center; gap: 5px;">
          <div style="width: 10px; height: 10px; background-color: ${item.color}; border-radius: 50%;"></div>
          <span style="font-size: 10px;">${item.label}</span>
        </div>
    `;
    });

    legendHTML += `</div></div>`;
    legendHTML += `<div style="margin-top: 5px;padding: 0px 10px 0px 10px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
    `;

    // 添加象限说明
    Object.keys(quadrantColors).forEach(key => {
      legendHTML += `
        <div style="display: flex; align-items: center; gap: 5px;">
          <div style="width: 10px; height: 10px; background-color: ${quadrantColors[key]}; border-radius: 50%;"></div>
          <span style="font-size: 10px; color: ${quadrantColors[key]};">${key}: ${quadrantLabels[key]}</span>
        </div>
      `;
    });
    
    legendHTML += `</div></div>`;
    
    legendDiv.innerHTML = legendHTML;
    
    // 将SVG和图例添加到容器
    this.chartContainer.innerHTML = svg;
    this.chartContainer.appendChild(legendDiv);
  }
  
  /**
   * 显示耗时统计数据
   */
  displayTimeStatistics(taskData) {
    if (!this.statsContainer) return;
    
    // 按象限和完成状态分组
    const tasksByQuadrant = {
      q1: { completed: [], pending: [] },
      q2: { completed: [], pending: [] },
      q3: { completed: [], pending: [] },
      q4: { completed: [], pending: [] }
    };
    
    taskData.forEach(data => {
      const status = data.isCompleted ? 'completed' : 'pending';
      tasksByQuadrant[data.quadrant][status].push(data);
    });
    
    // 计算各组的平均值和中位数
    const results = {};
    Object.keys(tasksByQuadrant).forEach(quadrant => {
      ['completed', 'pending'].forEach(status => {
        const values = tasksByQuadrant[quadrant][status].map(data => data.timeSpent);
        if (values.length > 0) {
          // 计算平均值
          const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
          
          // 计算中位数
          const sorted = [...values].sort((a, b) => a - b);
          const middle = Math.floor(sorted.length / 2);
          const median = sorted.length % 2 === 0 
            ? (sorted[middle - 1] + sorted[middle]) / 2
            : sorted[middle];
          
          results[`${quadrant}_${status}`] = {
            avg: Math.round(avg * 10) / 10,
            median: Math.round(median * 10) / 10,
            count: values.length
          };
        }
      });
    });
    
    // 创建统计表格
    let statsHTML = `<div style="font-size: 15px; font-weight: bold; margin-top: 50px;">${i18n.getMessage('quadrantTaskTimeStatistics')}</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <tr>
          <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">${i18n.getMessage('quadrant')}</th>
          <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">${i18n.getMessage('completedAvg')}</th>
          <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">${i18n.getMessage('completedMedian')}</th>
          <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">${i18n.getMessage('inProgressAvg')}</th>
          <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">${i18n.getMessage('inProgressMedian')}</th>
        </tr>
    `;
    
    const quadrantLabels = {
      q1: i18n.getMessage('importantUrgent'),
      q2: i18n.getMessage('importantNotUrgent'),
      q3: i18n.getMessage('notImportantNotUrgent'),
      q4: i18n.getMessage('notImportantUrgent')
    };
    
    Object.keys(quadrantLabels).forEach(quadrant => {
      const completedStats = results[`${quadrant}_completed`] || { avg: '-', median: '-', count: 0 };
      const pendingStats = results[`${quadrant}_pending`] || { avg: '-', median: '-', count: 0 };
      
      statsHTML += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 6px;">${quadrant}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${completedStats.avg}${completedStats.count > 0 ? ` (${completedStats.count})` : ''}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${completedStats.median}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${pendingStats.avg}${pendingStats.count > 0 ? ` (${pendingStats.count})` : ''}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${pendingStats.median}</td>
        </tr>
      `;
    });
    
    statsHTML += `</table>`;
    
    // 在统计容器中添加表格
    this.statsContainer.innerHTML = statsHTML;
    
    return results;
  }
  
  /**
   * 生成洞察
   * 
   * 洞察分析说明：
   * 本模块分析任务的时间效率，通过对比不同象限和状态的任务耗时，
   * 识别时间管理中的效率问题和资源分配不当。
   * 
   * 分析依据：
   * 1. 时间效率分析：核心任务应优先获得资源，避免长时间未完成
   * 2. 象限时间对比：不同象限任务的时间投入应反映其重要性
   * 3. 完成率与耗时关系：长期未完成任务可能表明规划或执行问题
   */
  generateInsights(taskData, quadrantData) {
    if (!this.insightContainer) return;
    
    const insights = [];
    
    // 按象限分组数据
    const tasksByQuadrant = {
      q1: { completed: [], pending: [] },
      q2: { completed: [], pending: [] },
      q3: { completed: [], pending: [] },
      q4: { completed: [], pending: [] }
    };
    
    taskData.forEach(data => {
      const status = data.isCompleted ? 'completed' : 'pending';
      tasksByQuadrant[data.quadrant][status].push(data);
    });
    
    // 分析Q1中未完成任务的耗时情况
    // 依据：Q1任务作为核心任务，长时间未完成可能表明资源不足或存在意外困难
    // 阈值：超过50%的Q1进行中任务耗时>3天 且 至少2个任务
    // 理论基础：根据项目管理理论，关键任务应优先分配资源，长时间未完成需要关注
    const q1Pending = tasksByQuadrant.q1.pending;
    if (q1Pending.length > 0) {
      // 计算高耗时任务的比例
      const highTimeSpentTasks = q1Pending.filter(task => task.timeSpent > 3); // 超过3天
      const highTimeSpentRatio = highTimeSpentTasks.length / q1Pending.length;
      
      if (highTimeSpentRatio > 0.5 && highTimeSpentTasks.length >= 2) {
          insights.push(i18n.getMessage('q1PendingTasksHighTimeSpent', [
            Math.round(highTimeSpentRatio * 100) 
          ]));
        }
    }
    
    // 比较Q4和Q2已完成任务的平均耗时
    // 依据：Q4任务（不重要但紧急）不应占用过多时间，Q2任务（重要但不紧急）应获得更多时间投入
    // 阈值：Q4平均耗时 > Q2平均耗时 × 1.5
    // 理论基础：根据艾森豪威尔矩阵，Q2任务应获得更多时间投入，Q4任务应快速处理
    const q4Completed = tasksByQuadrant.q4.completed;
    const q2Completed = tasksByQuadrant.q2.completed;
    
    if (q4Completed.length > 0 && q2Completed.length > 0) {
      const q4AvgTime = q4Completed.reduce((sum, data) => sum + data.timeSpent, 0) / q4Completed.length;
      const q2AvgTime = q2Completed.reduce((sum, data) => sum + data.timeSpent, 0) / q2Completed.length;
      
      if (q4AvgTime > q2AvgTime * 1.5) {
          insights.push(i18n.getMessage('q4CompletedTasksExceedQ2Time', [
            Math.round(q4AvgTime * 10) / 10, 
            Math.round(q2AvgTime * 10) / 10 
          ]));
        }
    }
    
    // 分析任务完成率与耗时的关系
    // 依据：进行中任务耗时过长可能表明任务规划不合理或执行效率低下
    // 阈值：进行中任务平均时间 > 已完成任务平均时间 × 2 且 至少3个进行中任务
    // 理论基础：根据敏捷开发理论，应关注任务完成率而非任务数量，长期卡住的任务需要关注
    const completedTasks = taskData.filter(data => data.isCompleted);
    const pendingTasks = taskData.filter(data => !data.isCompleted);
    
    if (completedTasks.length > 0 && pendingTasks.length > 0) {
      const avgCompletedTime = completedTasks.reduce((sum, data) => sum + data.timeSpent, 0) / completedTasks.length;
      const avgPendingTime = pendingTasks.reduce((sum, data) => sum + data.timeSpent, 0) / pendingTasks.length;

      if (avgPendingTime > avgCompletedTime * 2 && pendingTasks.length >= 3) {
        insights.push(i18n.getMessage('pendingTasksAverageTimeHigher', [ 
          Math.round(avgPendingTime * 10) / 10, 
          Math.round(avgCompletedTime * 10) / 10 
        ]));
      }
    }
    
    // 输出洞察
    this.insightContainer.innerHTML = this.utils.generateInsightsHTML(insights);
  }
} 