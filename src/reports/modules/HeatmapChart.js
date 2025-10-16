/**
 * 任务来源-完成率热力图模块
 */
import { i18n } from '../../utils/i18n.js';

export class HeatmapChart {
  constructor(utils) {
    this.utils = utils;
    this.chartContainer = null;
    this.insightContainer = null;
  }
  
  /**
   * 初始化容器
   */
  initContainer(container) {
    if (!container) return;
    
    const elements = this.utils.createModuleContainer(container, i18n.getMessage('taskSourceCompletionRate'));
    if (elements) {
      this.chartContainer = elements.chartContainer;
      this.insightContainer = elements.insightContainer;
    }
  }
  
  /**
   * 更新图表
   */
  async update(tasks, quadrantData) {
    if (!this.chartContainer || !this.insightContainer) return;
    
    // 分析数据
    const sourceData = this.analyzeTaskSources(tasks);
    
    // 创建热力图
    this.renderHeatmap(sourceData);
    
    // 生成洞察
    this.generateInsights(sourceData);
  }
  
  /**
   * 分析任务来源
   */
  analyzeTaskSources(tasks) {
    // 假设任务有category属性表示来源，如果没有可以根据实际情况调整
    // 这里将分类当作任务来源
    const sourceCategories = ['work', 'personal', 'study', 'health', 'other'];
    
    // 初始化数据结构
    const sourceData = {
      sources: [],
      quadrants: ['q1', 'q2', 'q3', 'q4'],
      matrix: []
    };
    
    // 统计每个来源在每个象限的任务数量和完成率
    const stats = {};
    
    sourceCategories.forEach(source => {
      stats[source] = {
        q1: { total: 0, completed: 0 },
        q2: { total: 0, completed: 0 },
        q3: { total: 0, completed: 0 },
        q4: { total: 0, completed: 0 }
      };
    });
    
    // 统计数据
    tasks.forEach(task => {
      const source = task.category || 'other';
      const quadrant = this.utils.getTaskQuadrant(task);
      
      if (stats[source] && stats[source][quadrant]) {
        stats[source][quadrant].total++;
        
        if (task.status === 'completed') {
          stats[source][quadrant].completed++;
        }
      }
    });
    
    // 转换为矩阵格式
    sourceCategories.forEach(source => {
      // 只包含有任务的来源
      const totalTasks = sourceData.quadrants.reduce((sum, q) => sum + stats[source][q].total, 0);
      
      if (totalTasks > 0) {
        sourceData.sources.push(source);
        
        const row = sourceData.quadrants.map(quadrant => {
          const quadrantStats = stats[source][quadrant];
          const completionRate = quadrantStats.total > 0 
            ? Math.round((quadrantStats.completed / quadrantStats.total) * 100) 
            : 0;
            
          return {
            source,
            quadrant,
            total: quadrantStats.total,
            completed: quadrantStats.completed,
            completionRate
          };
        });
        
        sourceData.matrix.push(row);
      }
    });
    
    return sourceData;
  }
  
  /**
   * 渲染热力图
   */
  renderHeatmap(sourceData) {
    if (!this.chartContainer) return;
    
    // 清空容器
    this.chartContainer.innerHTML = '';
    
    if (sourceData.sources.length === 0) {
      this.chartContainer.innerHTML = `<div style="text-align: center; padding: 50px;">${i18n.getMessage('notEnoughDataForHeatmap')}</div>`;
      return;
    }
    
    // 创建热力图表格
    const heatmapDiv = document.createElement('div');
    heatmapDiv.className = 'heatmap-container';
    heatmapDiv.style.width = '100%';
    heatmapDiv.style.overflow = 'auto';
    
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
    
    // 来源标题美化
    const sourceLabels = {
      'work': i18n.getMessage('work'),
      'personal': i18n.getMessage('personal'),
      'study': i18n.getMessage('study'),
      'health': i18n.getMessage('health'),
      'other': i18n.getMessage('other')
    };
    
    // 创建表格
    let tableHTML = `
      <table class="heatmap-table" style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr>
            <th style="border: 1px solid #ddd; padding: 10px; background-color: #f8f9fa; text-align: left;">${i18n.getMessage('source')}</th>
    `;
    
    // 添加表头
    sourceData.quadrants.forEach(q => {
      tableHTML += `<th style="border: 1px solid #ddd; padding: 10px; background-color: #f8f9fa; text-align: center;">${q}</th>`;
    });
    
    tableHTML += `</tr></thead><tbody>`;
    
    // 添加表格内容
    sourceData.matrix.forEach((row, rowIndex) => {
      const source = sourceData.sources[rowIndex];
      const displaySource = sourceLabels[source] || source;
      
      tableHTML += `<tr><td style="border: 1px solid #ddd; padding: 10px; font-weight: bold;">${displaySource}</td>`;
      
      row.forEach(cell => {
        // 根据完成率决定颜色深浅
        const colorIntensity = Math.min(cell.completionRate / 100, 1);
        let backgroundColor;
        
        if (cell.total === 0) {
          backgroundColor = '#f8f9fa'; // 浅灰色表示无数据
        } else if (cell.completionRate >= 80) {
          backgroundColor = `rgba(16, 185, 129, ${0.2 + colorIntensity * 0.6})`; // 绿色
        } else if (cell.completionRate >= 50) {
          backgroundColor = `rgba(59, 130, 246, ${0.2 + colorIntensity * 0.6})`; // 蓝色
        } else if (cell.completionRate >= 20) {
          backgroundColor = `rgba(245, 158, 11, ${0.2 + colorIntensity * 0.6})`; // 橙色
        } else {
          backgroundColor = `rgba(239, 68, 68, ${0.2 + colorIntensity * 0.6})`; // 红色
        }
        
        tableHTML += `
          <td style="border: 1px solid #ddd; padding: 10px; text-align: center; background-color: ${backgroundColor};">
            ${cell.completionRate}%
            <div style="font-size: 10px; color: #666;">(${cell.completed}/${cell.total})</div>
          </td>
        `;
      });
      
      tableHTML += `</tr>`;
    });
    
    const levelItems = [
      {
        color: 'rgba(239, 68, 68, 0.5)',
        label: i18n.getMessage('low')
      },
      
      {
        color: 'rgba(245, 158, 11, 0.5)',
        label: i18n.getMessage('mediumLow')
      },
      
      {
        color: 'rgba(59, 130, 246, 0.5)',
        label: i18n.getMessage('mediumHigh')
      },
      
      
      {
        color: 'rgba(16, 185, 129, 0.5)',
        label: i18n.getMessage('high')
      },
    ]

    tableHTML += `</tbody></table>`;
    
    // 添加图例
    tableHTML += `<div style="margin-top: 10px; padding: 0px 10px 0px 10px;"><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">`;

    levelItems.forEach(item => {
      tableHTML += `
        <div style="display: flex; align-items: center; gap: 5px;">
          <div style="width: 12px; height: 12px; background-color: ${item.color}; border-radius: 2px;"></div>
          <span style="font-size: 10px;">${item.label}</span>
        </div>
      `;
    });

    tableHTML += `</div></div>`;


    // 添加象限说明
    tableHTML += `</div>`;
    tableHTML += `<div style="margin-top: 2px;padding: 0px 10px 0px 10px;"><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">`;

    Object.keys(quadrantColors).forEach(key => {
      tableHTML += `
        <div style="display: flex; align-items: center; gap: 5px;">
          <span style="font-size: 10px; color: ${quadrantColors[key]};">${key}: ${quadrantLabels[key]}</span>
        </div>
      `;
    });
    
    tableHTML += `</div></div>`;
    
    heatmapDiv.innerHTML = tableHTML;
    this.chartContainer.appendChild(heatmapDiv);
  }
  
  /**
   * 生成洞察
   * 
   * 洞察分析说明：
   * 本模块分析不同任务来源在各象限的完成率分布，识别任务来源与象限匹配度，
   * 发现任务规划中的来源偏好和优先级偏差。
   * 
   * 分析依据：
   * 1. 来源交叉分析：不同来源任务应均衡分布在各个象限
   * 2. 优先级一致性：同一来源任务在不同象限的完成率应反映其重要性
   * 3. 多元化原则：避免单一来源任务过度集中在某一象限
   */
  generateInsights(sourceData) {
    if (!this.insightContainer) return;
    
    const insights = [];
    
    // 象限标题
    const quadrantLabelsMap = {
      q1: 'Important & Urgent (Q1)',
      q2: 'Important & Not Urgent (Q2)',
      q3: 'Not Important & Not Urgent (Q3)',
      q4: 'Not Important & Urgent (Q4)'
    };
    
    // 按来源分析各象限的完成率差异
    sourceData.sources.forEach(source => {
      const sourceRow = sourceData.matrix.find(row => row[0].source === source);
      if (!sourceRow) return;
      
      // 根据实际情况可能需要调整索引
      const q1Cell = sourceRow.find(cell => cell.quadrant === 'q1');
      const q2Cell = sourceRow.find(cell => cell.quadrant === 'q2');
      const q3Cell = sourceRow.find(cell => cell.quadrant === 'q3');
      const q4Cell = sourceRow.find(cell => cell.quadrant === 'q4');
      
      if (!q1Cell || !q2Cell || !q3Cell || !q4Cell) return;
      
      // 检查是否存在Q1完成率高而Q2低的情况
      // 依据：不同象限完成率差异反映任务执行优先级由"外部压力"驱动而非内部战略重点
      // 阈值：Q1完成率 >= 80% 且 Q2完成率 <= 40%
      // 理论基础：理想情况下Q2任务应获得更高完成率，Q1高Q2低表明存在"紧急优先于重要"的偏差
      if (q1Cell.total > 0 && q2Cell.total > 0 && 
          q1Cell.completionRate >= 80 && q2Cell.completionRate <= 40) {
        const sourceLabel = this.utils.getSourceDisplayName(source);
        insights.push(i18n.getMessage('sourceTasksQ1HighQ2Low', [ 
          sourceLabel, 
          q1Cell.completionRate, 
          q2Cell.completionRate 
        ]));
      }
      
      // 检查Q4（低优高急）完成率低的情况
      // 依据：Q4任务完成率过低可能表明任务优先级定义存在问题
      // 阈值：Q4任务数 >= 3 且 完成率 < 40%
      // 理论基础：Q4任务虽然不重要但紧急，完成率过低可能表明存在过多不必要的紧急任务
      if (q4Cell.total >= 3 && q4Cell.completionRate < 40) {
        const sourceLabel = this.utils.getSourceDisplayName(source);
        insights.push(i18n.getMessage('sourceTasksQ4LowCompletionRate', [           sourceLabel, 
           q4Cell.completionRate 
        ]));
      }
      
      // 检查任务是否集中在特定象限
      // 依据：任务来源过度集中可能导致任务规划缺乏多样性
      // 阈值：单一象限占比 >= 60% 且 总任务数 >= 5
      // 理论基础：多元化原则，应平衡不同象限的任务分布，避免单一来源任务过度集中
      const totalTasks = q1Cell.total + q2Cell.total + q3Cell.total + q4Cell.total;
      if (totalTasks >= 5) { // 至少有5个任务才有意义进行分析
        const quadrantShares = [
          { quadrant: 'Q1', name: i18n.getMessage('importantUrgent'), share: q1Cell.total / totalTasks },
          { quadrant: 'Q2', name: i18n.getMessage('importantNotUrgent'), share: q2Cell.total / totalTasks },
          { quadrant: 'Q3', name: i18n.getMessage('notImportantNotUrgent'), share: q3Cell.total / totalTasks },
          { quadrant: 'Q4', name: i18n.getMessage('notImportantUrgent'), share: q4Cell.total / totalTasks }
        ];
        
        // 找出占比最大的象限
        const maxShare = quadrantShares.reduce((max, current) => 
          current.share > max.share ? current : max, quadrantShares[0]);
          
        if (maxShare.share >= 0.6) { // 一个象限占比超过60%
          const sourceLabel = this.utils.getSourceDisplayName(source);
          insights.push(i18n.getMessage('sourceTasksHighlyConcentratedInQuadrant', [ 
             sourceLabel, 
             maxShare.quadrant, 
             maxShare.name, 
             Math.round(maxShare.share * 100) 
          ]));
        }
      }
    });
    
    // 分析整体完成率最高和最低的来源-象限组合
    // 依据：完成率差异过大表明不同任务类型的处理优先级存在明显差异
    // 阈值：最高完成率 - 最低完成率 >= 50%
    // 理论基础：不同来源任务应获得相对公平的关注，完成率差异过大可能影响整体效率
    const allCells = sourceData.matrix.flat();
    const cellsWithData = allCells.filter(cell => cell.total >= 3); // 至少有3个任务
    
    if (cellsWithData.length > 0) {
      // 找出完成率最高的组合
      const highestCell = cellsWithData.reduce((highest, current) => 
        current.completionRate > highest.completionRate ? current : highest, cellsWithData[0]);
      
      // 找出完成率最低的组合
      const lowestCell = cellsWithData.reduce((lowest, current) => 
        current.completionRate < lowest.completionRate ? current : lowest, cellsWithData[0]);
      
      if (highestCell.completionRate - lowestCell.completionRate >= 50) {
        const highSourceLabel = this.utils.getSourceDisplayName(highestCell.source);
        const lowSourceLabel = this.utils.getSourceDisplayName(lowestCell.source);
        
        insights.push(i18n.getMessage('sourceTasksCompletionRateDifference', [
          highSourceLabel, 
          quadrantLabelsMap[highestCell.quadrant], 
          highestCell.completionRate, 
          lowSourceLabel, 
          quadrantLabelsMap[lowestCell.quadrant], 
          lowestCell.completionRate 
        ]));
      }
    }
    
    // 输出洞察
    this.insightContainer.innerHTML = this.utils.generateInsightsHTML(insights);
  }
} 