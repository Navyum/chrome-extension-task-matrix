/**
 * 完成率-数量双轴图模块
 */
export class CompletionRateChart {
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
    
    const elements = this.utils.createModuleContainer(container, 'Completion Rate - Quantity');
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
    
    // 创建图表
    this.createCompletionRateChart(quadrantData);
    
    // 生成洞察
    this.generateInsights(quadrantData);
  }
  
  /**
   * 创建完成率-数量双轴图
   */
  createCompletionRateChart(quadrantData) {
    if (!this.chartContainer) return;
    
    // 清空容器
    this.chartContainer.innerHTML = '';

    // 定义象限颜色
    const quadrantColors = {
      q1: '#EF4444', // 红色 - 重要且紧急
      q2: '#10B981', // 绿色 - 重要不紧急
      q3: '#F59E0B', // 黄色 - 不重要紧急
      q4: '#9CA3AF'  // 灰色 - 不重要不紧急
    };

    // 定义象限标签
    const quadrantLabels = {
      q1: 'Important & Urgent',
      q2: 'Important & Not Urgent',
      q3: 'Not Important & Not Urgent',
      q4: 'Not Important & Urgent'
    };
    
    const quadrantKeys = ['q1', 'q2', 'q3', 'q4'];
    const taskCounts = quadrantKeys.map(key => quadrantData[key].total);
    const completionRates = quadrantKeys.map(key => quadrantData[key].completionRate);
    
    // 创建图表HTML
    const chartDiv = document.createElement('div');
    chartDiv.style.width = '100%';
    chartDiv.style.height = '100%';
    
    // 创建简单的双轴图表
    let chartHTML = `
      <div style="display: flex; height: 250px; align-items: flex-end; margin-top: 20px;">
    `;
    
    // 计算最大值以便比例缩放
    const maxCount = Math.max(...taskCounts, 1);
    
    // 添加柱状图和完成率标记
    quadrantKeys.forEach((key, index) => {
      const count = taskCounts[index];
      const rate = completionRates[index];
      const barHeight = (count / maxCount) * 200;
      const label = key;
      const color = quadrantColors[key];
      
      chartHTML += `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; margin: 0 10px;">
          <div style="position: relative; width: 60px; height: ${barHeight}px; background-color: ${color}; border-radius: 4px 4px 0 0;">
            <div style="position: absolute; top: -25px; width: 100%; text-align: center; font-weight: bold; font-size: 11px">
              ${rate}% (${count})
            </div>
          </div>
          <div style="margin-top: 10px; text-align: center; font-size: 12px;">${label}</div>
        </div>
      `;
    });
    
    chartHTML += `</div>`;
    
    // 添加象限说明容器
    chartHTML += `
      <div style="margin-top: 20px;padding: 0px 10px 0px 10px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
    `;
    
    // 遍历象限添加说明
    Object.keys(quadrantColors).forEach(key => {
      chartHTML += `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 12px; height: 12px; background-color: ${quadrantColors[key]}; border-radius: 50%;"></div>
          <span style="font-size: 10px; color: ${quadrantColors[key]}; font-weight: 500;">${key}: ${quadrantLabels[key]}</span>
        </div>
      `;
    });
    
    chartHTML += `
        </div>
      </div>
    `;

    chartDiv.innerHTML = chartHTML;
    this.chartContainer.appendChild(chartDiv);
  }
  
  /**
   * 生成完成率-数量双轴图的洞察
   */
  generateInsights(quadrantData) {
    if (!this.insightContainer) return;
    
    const insights = [];
    
    // 分析Q2完成率是否显著低于其他象限
    const q2Rate = quadrantData.q2.completionRate;
    const otherRates = [
      quadrantData.q1.completionRate,
      quadrantData.q3.completionRate,
      quadrantData.q4.completionRate
    ];
    const avgOtherRate = otherRates.reduce((sum, rate) => sum + rate, 0) / otherRates.length;
    
    if (q2Rate < avgOtherRate * 0.7 && quadrantData.q2.total > 0) {
      insights.push('Q2 (Important & Not Urgent) quadrant task completion rate is significantly lower than other quadrants, reflecting "urgent over important" execution bias, which may lead to strategic goal delays in the long term.');
    }
    
    // 分析Q3完成率是否过高
    const q3Rate = quadrantData.q3.completionRate;
    const q1Rate = quadrantData.q1.completionRate;
    
    if (q3Rate > 85 && q3Rate > q1Rate * 1.2 && quadrantData.q3.total > 0) {
      insights.push('Q3 (Not Important & Not Urgent) quadrant task completion rate is too high, beware of "ineffective busyness" - whether too much energy is consumed on trivial tasks, squeezing core task time.');
    }
    
    // 分析任务分布是否合理
    const totalTasks = quadrantData.q1.total + quadrantData.q2.total + quadrantData.q3.total + quadrantData.q4.total;
    if (totalTasks > 0) {
      const q1Percentage = (quadrantData.q1.total / totalTasks) * 100;
      const q4Percentage = (quadrantData.q4.total / totalTasks) * 100;
      
      if (q1Percentage > 40) {
        insights.push(`Q1 (Important & Urgent) quadrant tasks account for ${Math.round(q1Percentage)}% of total tasks, suggesting improvement in task planning, handle important tasks early to avoid urgent situations.`);
      }
      
      if (q4Percentage > 30) {
        insights.push(`Q4 (Not Important & Urgent) quadrant tasks account for ${Math.round(q4Percentage)}% of total tasks, review the sources of these low-priority but urgent tasks, optimize emergency response processes.`);
      }
    }
    
    // 输出洞察
    this.insightContainer.innerHTML = this.utils.generateInsightsHTML(insights);
  }
} 