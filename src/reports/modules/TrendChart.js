/**
 * 时间趋势图模块
 */
import { i18n } from '../../utils/i18n.js';

export class TrendChart {
  constructor(utils) {
    this.utils = utils;
    this.chartContainer = null;
    this.insightContainer = null;
    this.periodContainer = null;
    this.currentPeriod = 'week';
  }
  
  /**
   * 初始化容器
   */
  initContainer(container) {
    if (!container) return;
    
    const elements = this.utils.createModuleContainer(container, i18n.getMessage('weeklyMonthlyTrend'));
    if (elements) {
      this.chartContainer = elements.chartContainer;
      this.insightContainer = elements.insightContainer;
      
      // 添加周期选择器到图表容器外部，在标题下方
      this.periodContainer = document.createElement('div');
      this.periodContainer.className = 'period-selector';
      this.periodContainer.innerHTML = `
        <button class="period-btn active" data-period="week">${i18n.getMessage('weekly')}</button>
        <button class="period-btn" data-period="month">${i18n.getMessage('monthly')}</button>
      `;
      
      // 将周期选择器插入到图表容器的父节点（section）中，在图表容器之前
      const section = this.chartContainer.closest('.report-section');
      if (section) {
        section.insertBefore(this.periodContainer, this.chartContainer);
      }
    }
  }
  
  /**
   * 绑定周期选择器事件
   */
  bindPeriodSelector(modalElement) {
    if (!this.periodContainer) return;
    
    const periodButtons = this.periodContainer.querySelectorAll('.period-btn');
    periodButtons.forEach(button => {
      button.addEventListener('click', () => {
        // 移除所有按钮的active类
        periodButtons.forEach(btn => btn.classList.remove('active'));
        
        // 添加当前点击按钮的active类
        button.classList.add('active');
        
        // 获取选择的周期
        this.currentPeriod = button.dataset.period;
        
        // 获取ReportManager实例并触发更新
        if (window.popupApp && window.popupApp.reportManager) {
          window.popupApp.reportManager.updateTrendPeriod(this.currentPeriod);
        }
      });
    });
  }
  
  /**
   * 更新图表
   */
  async update(tasks, period) {
    if (!this.chartContainer || !this.insightContainer) return;
    
    this.currentPeriod = period;
    
    // 分析趋势数据
    const trendData = this.analyzeTrends(tasks, period);
    
    // 创建趋势图表
    this.createTrendChart(trendData);
    
    // 生成洞察
    this.generateInsights(trendData);
  }
  
  /**
   * 格式化日期显示
   */
  formatDateForDisplay(date, period) {
    if (period === 'week') {
      // 周视图：显示周开始日期
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${month}-${day}`;
    } else {
      // 月视图：只显示月份
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return month;
    }
  }

  /**
   * 分析趋势数据
   */
  analyzeTrends(tasks, period) {
    // 获取日期范围
    const dates = tasks.map(task => {
      const createdDate = new Date(task.createdAt);
      return new Date(createdDate.getFullYear(), createdDate.getMonth(), period === 'week' ? createdDate.getDate() : 1);
    });
    
    // 获取任务创建的最早日期和最晚日期
    let minDate = new Date();
    let maxDate = new Date(0);
    
    dates.forEach(date => {
      if (date < minDate) minDate = new Date(date);
      if (date > maxDate) maxDate = new Date(date);
    });
    
    // 确保至少有4个时间点
    if (period === 'week') {
      // 确保至少4周的数据
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      if (minDate > fourWeeksAgo) minDate = fourWeeksAgo;
    } else {
      // 确保至少4个月的数据
      const fourMonthsAgo = new Date();
      fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
      if (minDate > fourMonthsAgo) minDate = fourMonthsAgo;
    }
    
    // 生成时间点列表
    const timePoints = [];
    const currentDate = new Date(minDate);
    
    while (currentDate <= maxDate) {
      timePoints.push(new Date(currentDate));
      
      if (period === 'week') {
        currentDate.setDate(currentDate.getDate() + 7); // 增加一周
      } else {
        currentDate.setMonth(currentDate.getMonth() + 1); // 增加一个月
      }
    }
    
    // 确保当前日期也包含在内
    const now = new Date();
    const lastTimePoint = timePoints[timePoints.length - 1];
    
    if (period === 'week') {
      const nowWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      if (lastTimePoint < nowWeek) {
        timePoints.push(nowWeek);
      }
    } else {
      const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      if (lastTimePoint < nowMonth) {
        timePoints.push(nowMonth);
      }
    }
    
    // 为每个象限准备数据
    const quadrantData = {
      q1: { label: i18n.getMessage('importantUrgent'), timePoints: {} },
      q2: { label: i18n.getMessage('importantNotUrgent'), timePoints: {} },
      q3: { label: i18n.getMessage('notImportantNotUrgent'), timePoints: {} },
      q4: { label: i18n.getMessage('notImportantUrgent'), timePoints: {} }
    };
    
    // 初始化数据结构
    timePoints.forEach(date => {
      const timeKey = date.toISOString();
      Object.keys(quadrantData).forEach(quadrant => {
        quadrantData[quadrant].timePoints[timeKey] = { 
          completed: 0, 
          pending: 0, 
          total: 0,
          date: date
        };
      });
    });
    
    // 按象限和时间点统计任务
    tasks.forEach(task => {
      // 确定任务象限
      const quadrant = this.utils.getTaskQuadrant(task);
      
      // 确定任务所属的时间点
      const taskDate = new Date(task.createdAt);
      let timePointDate;
      
      if (period === 'week') {
        // 找到对应的周开始日期（以周日为开始）
        const day = taskDate.getDay(); // 0 是周日，1 是周一，以此类推
        timePointDate = new Date(taskDate);
        timePointDate.setDate(taskDate.getDate() - day);
        timePointDate = new Date(timePointDate.getFullYear(), timePointDate.getMonth(), timePointDate.getDate());
      } else {
        // 月视图，取当月1号
        timePointDate = new Date(taskDate.getFullYear(), taskDate.getMonth(), 1);
      }
      
      // 找到最近的时间点
      let closestTimePoint = null;
      for (const timePoint of timePoints) {
        if (timePointDate.getTime() <= timePoint.getTime()) {
          if (!closestTimePoint || timePoint.getTime() < closestTimePoint.getTime()) {
            closestTimePoint = timePoint;
          }
        }
      }
      
      // 如果找不到合适的时间点，使用第一个时间点
      if (!closestTimePoint && timePoints.length > 0) {
        closestTimePoint = timePoints[0];
      }
      
      if (closestTimePoint) {
        const timeKey = closestTimePoint.toISOString();
        if (quadrantData[quadrant].timePoints[timeKey]) {
          quadrantData[quadrant].timePoints[timeKey].total++;
          
          if (task.status === 'completed') {
            quadrantData[quadrant].timePoints[timeKey].completed++;
          } else {
            quadrantData[quadrant].timePoints[timeKey].pending++;
          }
        }
      }
    });
    
    // 将数据转换为数组格式
    Object.keys(quadrantData).forEach(quadrant => {
      const quadrantTimePoints = [];
      
      timePoints.forEach(date => {
        const timeKey = date.toISOString();
        const pointData = quadrantData[quadrant].timePoints[timeKey];
        
        if (pointData) {
                      quadrantTimePoints.push({
              date: date,
              completed: pointData.completed,
              pending: pointData.pending,
              total: pointData.total,
              timeKey: timeKey,
              formattedDate: this.formatDateForDisplay(date, period)
            });
        }
      });
      
      // 按日期排序
      quadrantTimePoints.sort((a, b) => a.date - b.date);
      
      // 替换原始数据
      quadrantData[quadrant].timePoints = quadrantTimePoints;
    });
    
    return {
      quadrantData,
      timePoints: timePoints.map(date => ({
        date,
        formattedDate: this.formatDateForDisplay(date, period)
      })).sort((a, b) => a.date - b.date),
      period
    };
  }
  
  /**
   * 创建趋势图表
   */
  createTrendChart(trendData) {
    if (!this.chartContainer) return;
    
    // 清空容器
    this.chartContainer.innerHTML = '';
    
    // 创建4个子图表容器
    const chartsContainer = document.createElement('div');
    chartsContainer.className = 'charts-container';
    chartsContainer.style.display = 'grid';
    chartsContainer.style.gridTemplateColumns = '1fr 1fr';
    chartsContainer.style.gridTemplateRows = '1fr 1fr';
    chartsContainer.style.gap = '15px';
    chartsContainer.style.height = '280px';
    chartsContainer.style.marginTop = '10px';
    
    // 象限颜色
    const quadrantColors = {
      q1: '#EF4444', // 红色 - 重要且紧急
      q2: '#10B981', // 绿色 - 重要不紧急
      q3: '#F59E0B', // 黄色 - 不重要紧急
      q4: '#9CA3AF'  // 灰色 - 不重要不紧急
    };
    
    // 任务状态颜色
    const statusColors = {
      completed: 'rgba(16, 185, 129, 0.7)', // 完成 - 绿色
      pending: 'rgba(239, 68, 68, 0.7)'     // 未完成 - 红色
    };
    
    // 创建每个象限的图表
    Object.keys(trendData.quadrantData).forEach(quadrant => {
      const quadrantInfo = trendData.quadrantData[quadrant];
      const quadrantDiv = document.createElement('div');
      quadrantDiv.className = `chart-quadrant ${quadrant}`;
      quadrantDiv.style.backgroundColor = `rgba(0, 0, 0, 0.02)`;
      quadrantDiv.style.borderRadius = '8px';
      quadrantDiv.style.padding = '10px';
      quadrantDiv.style.position = 'relative';
      
      // 添加象限标题
      const titleDiv = document.createElement('div');
      titleDiv.className = 'chart-title';
      titleDiv.textContent = quadrantInfo.label;
      titleDiv.style.fontSize = '13px';
      titleDiv.style.fontWeight = 'bold';
      titleDiv.style.marginBottom = '5px';
      titleDiv.style.textAlign = 'center';
      titleDiv.style.color = quadrantColors[quadrant];
      quadrantDiv.appendChild(titleDiv);
      
      // 创建SVG图表
      const chartHeight = 150;
      const chartWidth = 100; // 百分比宽度
      const padding = { top: 10, right: 10, bottom: 20, left: 22 };
      
      // 检查是否有数据点
      const timePoints = quadrantInfo.timePoints;
      if (!timePoints || timePoints.length === 0) {
        const noDataDiv = document.createElement('div');
        noDataDiv.textContent = i18n.getMessage('noData');
        noDataDiv.style.textAlign = 'center';
        noDataDiv.style.paddingTop = '50px';
        noDataDiv.style.color = '#666';
        noDataDiv.style.fontSize = '12px';
        quadrantDiv.appendChild(noDataDiv);
        chartsContainer.appendChild(quadrantDiv);
        return;
      }
      
      // 计算最大值，用于Y轴缩放
      const maxTotal = Math.max(...timePoints.map(point => point.total), 1);
      
      let svg = `
        <svg width="100%" height="${chartHeight}" viewBox="0 0 100 ${chartHeight}" preserveAspectRatio="none">
      `;
      
      // 绘制堆叠面积
      if (timePoints.length > 1) {
        // 生成已完成任务的面积路径
        let completedPath = `M ${padding.left} ${chartHeight - padding.bottom}`;
        timePoints.forEach((point, index) => {
          const x = padding.left + (index / (timePoints.length - 1)) * (chartWidth - padding.left - padding.right);
          const y = chartHeight - padding.bottom - (point.completed / maxTotal) * (chartHeight - padding.top - padding.bottom);
          completedPath += ` L ${x} ${y}`;
        });
        // 闭合路径
        completedPath += ` L ${padding.left + (chartWidth - padding.left - padding.right)} ${chartHeight - padding.bottom} Z`;
        
        // 生成总任务面积路径
        let totalPath = `M ${padding.left} ${chartHeight - padding.bottom}`;
        timePoints.forEach((point, index) => {
          const x = padding.left + (index / (timePoints.length - 1)) * (chartWidth - padding.left - padding.right);
          const y = chartHeight - padding.bottom - (point.total / maxTotal) * (chartHeight - padding.top - padding.bottom);
          totalPath += ` L ${x} ${y}`;
        });
        // 闭合路径
        totalPath += ` L ${padding.left + (chartWidth - padding.left - padding.right)} ${chartHeight - padding.bottom} Z`;
        
        // 先绘制总任务面积
        svg += `<path d="${totalPath}" fill="${statusColors.pending}" />`;
        
        // 再绘制已完成任务面积
        svg += `<path d="${completedPath}" fill="${statusColors.completed}" />`;
      }
      
      // 绘制坐标轴
      svg += `
        <!-- Y轴 -->
        <line 
          x1="${padding.left}" 
          y1="${padding.top}" 
          x2="${padding.left}" 
          y2="${chartHeight - padding.bottom}" 
          stroke="#ccc" 
          stroke-width="0.5"
        />
        <!-- X轴 -->
        <line 
          x1="${padding.left}" 
          y1="${chartHeight - padding.bottom}" 
          x2="${padding.left + (chartWidth - padding.left - padding.right)}" 
          y2="${chartHeight - padding.bottom}" 
          stroke="#ccc" 
          stroke-width="0.5"
        />
      `;
      
      // 绘制X轴标签
      if (timePoints.length > 1) {
        // 只显示首尾和中间的标签，避免拥挤
        const labelIndices = [0, Math.floor(timePoints.length / 2), timePoints.length - 1];
        
        labelIndices.forEach(index => {
          if (index < timePoints.length) {
            const point = timePoints[index];
            const x = padding.left + (index / (timePoints.length - 1)) * (chartWidth - padding.left - padding.right);
            
            svg += `
              <text 
                x="${x}" 
                y="${chartHeight - padding.bottom + 15}" 
                text-anchor="middle" 
                font-size="8"
                fill="#666"
              >${point.formattedDate}</text>
            `;
          }
        });
      }
      
      // Y轴标签
      const yAxisCenter = padding.top + (chartHeight - padding.top - padding.bottom) / 2;
      svg += `
        <text 
          x="${padding.left - 15}" 
          y="${yAxisCenter}" 
          text-anchor="middle" 
          font-size="8" 
          fill="#666"
          transform="rotate(-90, ${padding.left - 15}, ${yAxisCenter})"
        >${i18n.getMessage('taskCount')}</text>
      `;
      
      // 结束SVG
      svg += '</svg>';
      
      // 将SVG添加到容器
      const svgContainer = document.createElement('div');
      svgContainer.innerHTML = svg;
      quadrantDiv.appendChild(svgContainer);
      
      // 添加图例
      const legendDiv = document.createElement('div');
      legendDiv.className = 'chart-legend';
      legendDiv.style.display = 'flex';
      legendDiv.style.justifyContent = 'center';
      legendDiv.style.gap = '15px';
      legendDiv.style.marginTop = '5px';
      legendDiv.style.fontSize = '10px';
      
      const legend = `
        <div style="display: flex; align-items: center; gap: 5px;">
          <div style="width: 8px; height: 8px; background-color: ${statusColors.completed}; border-radius: 2px;"></div>
          <span>${i18n.getMessage('completed')}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <div style="width: 8px; height: 8px; background-color: ${statusColors.pending}; border-radius: 2px;"></div>
          <span>${i18n.getMessage('pending')}</span>
        </div>
      `;
      
      legendDiv.innerHTML = legend;
      quadrantDiv.appendChild(legendDiv);
      
      // 添加到主容器
      chartsContainer.appendChild(quadrantDiv);
    });
    
    // 将所有图表添加到主容器
    this.chartContainer.appendChild(chartsContainer);
  }
  
  /**
   * 生成趋势洞察
   * 
   * 洞察分析说明：
   * 本模块分析任务管理的时间趋势，通过追踪各象限任务量和完成率的变化，
   * 识别任务管理策略的有效性和需要改进的方向。
   * 
   * 分析依据：
   * 1. 趋势稳定性：稳定的任务分配有助于提高执行效率
   * 2. 完成率趋势：持续改善表明策略有效，持续下降需要调整
   * 3. 任务积累：Q2任务持续积累反映战略任务未纳入常规执行计划
   */
  generateInsights(trendData) {
    if (!this.insightContainer) return;
    
    const insights = [];
    const periodText = trendData.period === 'week' ? 'week' : 'month';
    
    // 分析任务数量变化趋势
    Object.keys(trendData.quadrantData).forEach(quadrant => {
      const quadrantInfo = trendData.quadrantData[quadrant];
      const timePoints = quadrantInfo.timePoints;
      
      // 至少需要2个时间点才能分析趋势
      if (timePoints.length >= 2) {
        // 任务增长波动检测
        // 依据：任务量剧烈波动可能表明任务规划不稳定或外部干扰过多
        // 阈值：任务量变化幅度 > 50%
        // 理论基础：稳定的任务分配有助于提高执行效率，剧烈波动需要关注
        if (timePoints.length >= 3) {
          const fluctuations = [];
          
          // 计算相邻时间点之间的变化
          for (let i = 1; i < timePoints.length; i++) {
            const prevTotal = timePoints[i-1].total;
            const currTotal = timePoints[i].total;
            
            if (prevTotal > 0) {
              const changeRate = ((currTotal - prevTotal) / prevTotal) * 100;
              fluctuations.push({
                from: timePoints[i-1].formattedDate,
                to: timePoints[i].formattedDate,
                rate: changeRate,
                absolute: Math.abs(changeRate)
              });
            }
          }
          
          // 找出显著波动
          const significantFluctuations = fluctuations.filter(f => f.absolute > 50); // 变化率超过50%
          
          if (significantFluctuations.length > 0) {
            // 取变化最大的波动
            const maxFluctuation = significantFluctuations.reduce((max, curr) => 
              curr.absolute > max.absolute ? curr : max, significantFluctuations[0]);
            
            const direction = maxFluctuation.rate > 0 ? 'increased' : 'decreased';
            const quadrantLabel = quadrantInfo.label;
            
            insights.push(i18n.getMessage('quadrantTaskVolumeFluctuation', [
              quadrantLabel, 
              direction, 
              Math.round(Math.abs(maxFluctuation.rate)), 
              maxFluctuation.from, 
              maxFluctuation.to 
            ]));
          }
        }
        
        // 完成率趋势分析
        // 依据：完成率持续上升表明工作效率改善，持续下降需要关注执行效率问题
        // 阈值：连续3个周期完成率上升/下降趋势 >= 70%
        // 理论基础：趋势分析是评估任务管理策略有效性的重要指标
        if (timePoints.length >= 3) {
          const completionRates = timePoints.map(point => 
            point.total > 0 ? (point.completed / point.total) * 100 : 0);
          
          // 计算完成率的平均变化趋势
          let increaseCount = 0;
          let decreaseCount = 0;
          
          for (let i = 1; i < completionRates.length; i++) {
            if (completionRates[i] > completionRates[i-1]) {
              increaseCount++;
            } else if (completionRates[i] < completionRates[i-1]) {
              decreaseCount++;
            }
          }
          
          // 判断趋势
          const totalChanges = increaseCount + decreaseCount;
          if (totalChanges > 0) {
            if (increaseCount / totalChanges >= 0.7) {
              insights.push(i18n.getMessage('quadrantCompletionRateUpwardTrend', [
                quadrantInfo.label 
              ]));
            } else if (decreaseCount / totalChanges >= 0.7) {
              insights.push(i18n.getMessage('quadrantCompletionRateDownwardTrend', [
                quadrantInfo.label 
              ]));
            }
          }
        }
        
        // 分析Q2任务积累情况
        // 依据：Q2任务持续积累且完成率无改善反映"战略任务"未纳入常规执行计划
        // 阈值：70%的时间点Q2任务数量增加
        // 理论基础：Q2任务积累存在"拖延积累"风险，需要将战略任务纳入日常执行计划
        if (quadrant === 'q2' && timePoints.length >= 3) {
          let accumulationCount = 0;
          
          for (let i = 1; i < timePoints.length; i++) {
            const prevPending = timePoints[i-1].pending;
            const currPending = timePoints[i].pending;
            
            if (currPending > prevPending) {
              accumulationCount++;
            }
          }
          
          if (accumulationCount >= timePoints.length * 0.7) {
            insights.push(i18n.getMessage('q2TasksContinueToAccumulate'));
          }
        }
      }
    });
    
    // 输出洞察
    this.insightContainer.innerHTML = this.utils.generateInsightsHTML(insights);
  }
} 