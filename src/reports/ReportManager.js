/**
 * 报告管理器
 * 负责初始化和管理所有报告模块
 */
import { CompletionRateChart } from './modules/CompletionRateChart.js';
import { TimeStatusChart } from './modules/TimeStatusChart.js';
import { TrendChart } from './modules/TrendChart.js';
import { HeatmapChart } from './modules/HeatmapChart.js';
import { ReportUtils } from './utils/ReportUtils.js';

export class ReportManager {
  constructor(taskManager) {
    this.taskManager = taskManager;
    this.utils = new ReportUtils();
    
    // 初始化报告模块
    this.completionRateChart = new CompletionRateChart(this.utils);
    this.timeStatusChart = new TimeStatusChart(this.utils);
    this.trendChart = new TrendChart(this.utils);
    this.heatmapChart = new HeatmapChart(this.utils);
    
    // 当前周期设置（周/月）
    this.currentPeriod = 'week';
  }
  
  /**
   * 初始化报告模态框
   */
  async initReportModal(modalElement) {
    if (!modalElement) return;
    
    // 创建模态框HTML结构
    await this.createReportModalStructure(modalElement);
    
    // 绑定事件
    this.bindEvents(modalElement);
  }
  
  /**
   * 创建报告模态框HTML结构
   */
  async createReportModalStructure(modalElement) {
    // 创建基本结构
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content report-modal';
    
    modalContent.innerHTML = `
      <div class="modal-header">
        <h3>Analysis Report</h3>
        <button class="modal-close" id="closeReportModal">
          <img src="assets/icons/close.svg" alt="Close" width="20" height="20">
        </button>
      </div>
      <div class="report-content">
        <!-- 报告Tab切换 -->
        <div class="report-tabs">
          <div class="tab-button active" data-tab="module1">Completion-Rate</div>
          <div class="tab-button" data-tab="module2">Time-Status</div>
          <div class="tab-button" data-tab="module3">Time-Trend</div>
          <div class="tab-button" data-tab="module4">Source-Cross</div>
        </div>
        
        <!-- 报告内容区域 -->
        <div class="report-tab-content">
          <!-- 各模块的内容区域将由对应模块动态生成 -->
          <div class="tab-pane active" id="module1"></div>
          <div class="tab-pane" id="module2"></div>
          <div class="tab-pane" id="module3"></div>
          <div class="tab-pane" id="module4"></div>
        </div>
      </div>
    `;
    
    // 清空并添加新内容
    modalElement.innerHTML = '';
    modalElement.appendChild(modalContent);
    
    // 初始化各模块的内容区域
    this.completionRateChart.initContainer(document.getElementById('module1'));
    this.timeStatusChart.initContainer(document.getElementById('module2'));
    this.trendChart.initContainer(document.getElementById('module3'));
    this.heatmapChart.initContainer(document.getElementById('module4'));
  }
  
  /**
   * 绑定事件
   */
  bindEvents(modalElement) {
    // Tab切换事件
    const tabButtons = modalElement.querySelectorAll('.report-tabs .tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // 移除所有tab的active类
        tabButtons.forEach(btn => btn.classList.remove('active'));
        
        // 添加当前点击tab的active类
        button.classList.add('active');
        
        // 获取对应的内容区域
        const targetTabId = button.dataset.tab;
        
        // 隐藏所有内容区域
        modalElement.querySelectorAll('.tab-pane').forEach(pane => {
          pane.classList.remove('active');
        });
        
        // 显示目标内容区域
        modalElement.querySelector(`#${targetTabId}`).classList.add('active');
      });
    });
    
    // 关闭按钮事件
    const closeBtn = modalElement.querySelector('#closeReportModal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modalElement.classList.remove('show');
      });
    }
    
    // 为趋势图模块添加周期切换事件（在TrendChart模块内部实现）
    this.trendChart.bindPeriodSelector(modalElement);
  }
  
  /**
   * 显示报告并加载数据
   */
  async showReport() {
    const modal = document.getElementById('reportModal');
    if (!modal) return;
    
    // 显示模态框
    modal.classList.add('show');
    
    // 确保默认标签页的按钮状态正确
    this.setDefaultTabActive(modal);
    
    try {
      // 获取所有任务
      const tasks = await this.taskManager.getTasks();
      
      // 分析四象限数据
      const quadrantData = this.utils.analyzeTasksByQuadrant(tasks);
      
      // 更新各模块的图表和洞察
      await this.completionRateChart.update(tasks, quadrantData);
      await this.timeStatusChart.update(tasks, quadrantData);
      await this.trendChart.update(tasks, this.currentPeriod);
      await this.heatmapChart.update(tasks, quadrantData);
      
    } catch (error) {
      console.error('加载报告数据失败:', error);
    }
  }
  
  /**
   * 设置默认标签页为激活状态
   */
  setDefaultTabActive(modalElement) {
    // 移除所有标签按钮的active类
    const tabButtons = modalElement.querySelectorAll('.report-tabs .tab-button');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    // 设置第一个标签页为默认激活状态
    const firstTabButton = modalElement.querySelector('.report-tabs .tab-button[data-tab="module1"]');
    if (firstTabButton) {
      firstTabButton.classList.add('active');
    }
    
    // 确保对应的内容区域也是激活状态
    const tabPanes = modalElement.querySelectorAll('.tab-pane');
    tabPanes.forEach(pane => pane.classList.remove('active'));
    
    const firstTabPane = modalElement.querySelector('#module1');
    if (firstTabPane) {
      firstTabPane.classList.add('active');
    }
  }

  /**
   * 更新趋势图的时间周期
   */
  async updateTrendPeriod(period) {
    this.currentPeriod = period;
    
    const tasks = await this.taskManager.getTasks();
    await this.trendChart.update(tasks, period);
  }
} 