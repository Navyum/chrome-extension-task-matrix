/**
 * 完成率-数量双轴图模块
 */
import { i18n } from '../../utils/i18n.js';
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
    
    const elements = this.utils.createModuleContainer(container, i18n.getMessage('completionRateQuantity'));
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
      q1: i18n.getMessage('importantUrgent'),
      q2: i18n.getMessage('importantNotUrgent'),
      q3: i18n.getMessage('notImportantNotUrgent'),
      q4: i18n.getMessage('notImportantUrgent')
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
   * 
   * 洞察分析说明：
   * 本模块基于艾森豪威尔矩阵理论，分析各象限任务的完成率分布，
   * 识别任务管理中的效率问题和改进机会。
   * 
   * 分析依据：
   * 1. 艾森豪威尔矩阵理论：Q1(重要紧急) > Q2(重要不紧急) > Q3(不重要紧急) > Q4(不重要不紧急)
   * 2. 时间管理最佳实践：理想情况下Q2任务应获得最高完成率
   * 3. 帕累托原理：80%的成果来自20%的重要任务
   */
  generateInsights(quadrantData) {
    if (!this.insightContainer) return;
    
    const insights = [];
    
    // 分析Q2完成率是否显著低于其他象限
    // 依据：Q2象限（重要但不紧急）任务应优先处理，完成率过低表明存在"紧急优先于重要"的执行偏差
    // 阈值：Q2完成率 < 70% × 其他象限平均完成率
    // 理论基础：艾森豪威尔矩阵理论强调Q2任务的重要性，低完成率可能导致长期战略目标延迟
    const q2Rate = quadrantData.q2.completionRate;
    const otherRates = [
      quadrantData.q1.completionRate,
      quadrantData.q3.completionRate,
      quadrantData.q4.completionRate
    ];
    const avgOtherRate = otherRates.reduce((sum, rate) => sum + rate, 0) / otherRates.length;
    
    if (q2Rate < avgOtherRate * 0.7 && quadrantData.q2.total > 0) {
      insights.push(i18n.getMessage('q2CompletionRateLowerThanOthers'));
    }
    
    // 分析Q3完成率是否过高
    // 依据：Q3象限（不重要但紧急）任务完成率过高可能表明"无效忙碌"现象
    // 阈值：Q3完成率 > 85% 且 > Q1完成率 × 120%
    // 理论基础：时间管理理论强调应优先处理重要任务而非紧急但不重要的任务
    const q3Rate = quadrantData.q3.completionRate;
    const q1Rate = quadrantData.q1.completionRate;
    
    if (q3Rate > 85 && q3Rate > q1Rate * 1.2 && quadrantData.q3.total > 0) {
      insights.push(i18n.getMessage('q3CompletionRateTooHigh'));
    }
    
    // 分析任务分布是否合理
    // 依据：任务分布应遵循艾森豪威尔矩阵的最佳实践
    // 理论基础：理想状态下Q1任务应控制在20-30%以内，Q4任务应最小化
    const totalTasks = quadrantData.q1.total + quadrantData.q2.total + quadrantData.q3.total + quadrantData.q4.total;
    if (totalTasks > 0) {
      const q1Percentage = (quadrantData.q1.total / totalTasks) * 100;
      const q4Percentage = (quadrantData.q4.total / totalTasks) * 100;
      
      // Q1任务占比过高检测
      // 阈值：Q1任务占比 > 40%
      // 依据：Q1象限任务过多表明任务规划不当，存在过多紧急情况
      if (q1Percentage > 40) {
        insights.push(i18n.getMessage('q1TasksAccountForHighPercentage', [ Math.round(q1Percentage) ]));
      }
      
      // Q4任务占比过高检测
      // 阈值：Q4任务占比 > 30%
      // 依据：Q4象限任务过多表明时间管理效率低下，应专注于高价值任务
      if (q4Percentage > 30) {
        insights.push(i18n.getMessage('q4TasksAccountForHighPercentage', [ Math.round(q4Percentage) ]));
      }
    }
    
    // 输出洞察
    this.insightContainer.innerHTML = this.utils.generateInsightsHTML(insights);
  }
} 