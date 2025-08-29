/**
 * 矩阵渲染器 - 使用D3.js
 * 负责艾森豪威尔矩阵的可视化渲染
 */
import * as d3 from 'd3';

export class MatrixRenderer {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth || 480;
    this.height = container.clientHeight || 450;
    
    // 初始化D3 SVG
    this.initSVG();
    
    // 任务卡片配置
    this.cardConfig = {
      width: 160,
      height: 90,
      margin: 8,
      borderRadius: 8,
      padding: 10
    };
    
    // 存储当前矩阵数据
    this.currentMatrix = null;
    
    console.log(`MatrixRenderer初始化: ${this.width}x${this.height}`);
  }



  /**
   * 初始化SVG
   */
  initSVG() {
    // 清空容器
    d3.select(this.container).selectAll('*').remove();
    
    // 创建SVG
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .style('background', 'rgba(255, 255, 255, 0.95)')
      .on('dblclick', (event) => this.handleBackgroundDoubleClick(event));
    
    // 创建主组
    this.mainGroup = this.svg.append('g')
      .attr('class', 'matrix-main');
    
    // 创建象限组
    this.quadrantsGroup = this.mainGroup.append('g')
      .attr('class', 'quadrants');
    
    // 创建轴线组
    this.axesGroup = this.mainGroup.append('g')
      .attr('class', 'axes');
    
    // 创建任务组
    this.tasksGroup = this.mainGroup.append('g')
      .attr('class', 'tasks');
    
    // 创建标签组
    this.labelsGroup = this.mainGroup.append('g')
      .attr('class', 'labels');
  }

  /**
   * 渲染矩阵
   */
  async render(matrix) {
    console.log(`=== Starting Matrix Render ===`);
    console.log(`Matrix dimensions: ${this.width}x${this.height}`);
    console.log(`Total tasks: ${Object.values(matrix.quadrants).reduce((sum, q) => sum + q.tasks.length, 0)}`);
    
    this.currentMatrix = matrix;
    this.clear();
    this.drawAxes();
    this.drawQuadrants(matrix);
    this.drawAxisLabels();
    await this.drawTasks(matrix);
    
    console.log(`=== Matrix Render Complete ===`);
  }

  /**
   * 清空画布
   */
  clear() {
    // 清空所有组
    this.quadrantsGroup.selectAll('*').remove();
    this.axesGroup.selectAll('*').remove();
    this.tasksGroup.selectAll('*').remove();
    this.labelsGroup.selectAll('*').remove();
    
    // 清空任务信息
    this.taskInfo = [];
  }

  /**
   * 绘制轴线
   */
  drawAxes() {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const margin = 30; // 添加边距，确保轴线不超出边界
    
    // 绘制X轴（垂直线）
    this.axesGroup.append('line')
      .attr('x1', centerX)
      .attr('y1', margin)
      .attr('x2', centerX)
      .attr('y2', this.height - margin)
      .attr('stroke', '#374151')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round');
    
    // 绘制Y轴（水平线）
    this.axesGroup.append('line')
      .attr('x1', margin)
      .attr('y1', centerY)
      .attr('x2', this.width - margin)
      .attr('y2', centerY)
      .attr('stroke', '#374151')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round');
    
    // 绘制轴线箭头
    this.drawAxisArrows();
    
    // 绘制X轴刻度
    this.drawXAxisTicks();
  }

  /**
   * 绘制象限
   */
  drawQuadrants(matrix) {
    // 不再绘制象限背景、边框和标题，只保留坐标轴
    // 任务将直接绘制在对应的象限位置
  }



  /**
   * 绘制任务
   */
  async drawTasks(matrix) {
    for (const [key, quadrant] of Object.entries(matrix.quadrants)) {
      for (let index = 0; index < quadrant.tasks.length; index++) {
        await this.drawTaskPoint(quadrant.tasks[index], key, index);
      }
    }
  }

  /**
   * 绘制任务圆点
   */
  async drawTaskPoint(task, quadrantKey, index) {
    // 使用任务的坐标点，如果没有则根据任务属性计算
    let x, y;
    
    if (task.coordinates && task.coordinates.x !== undefined && task.coordinates.y !== undefined) {
      x = task.coordinates.x;
      y = task.coordinates.y;
      console.log(`Using user-set coordinates for "${task.title}": (${x}, ${y})`);
    } else {
      // 根据任务的重要性和时间计算坐标
      const coordinates = this.calculateTaskCoordinates(task);
      x = coordinates.x;
      y = coordinates.y;
      console.log(`Using calculated coordinates for "${task.title}": (${x}, ${y})`);
    }

    const radius = 8;
    const color = await this.getTaskColor(task);
    
    console.log(`Drawing task "${task.title}" at position (${x}, ${y}) with color ${color}`);
    
    // 绘制圆点
    this.tasksGroup.append('circle')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', radius)
      .attr('fill', color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('data-task-id', task.id)
      .attr('cursor', 'pointer')
      .on('mouseenter', () => this.handleTaskHover(task, x, y))
      .on('mouseleave', () => this.handleTaskLeave())
      .on('dblclick', () => this.handleTaskDoubleClick(task));
    
    // 存储任务信息用于交互
    this.storeTaskInfo(task, x, y, radius);
  }





  /**
   * 获取任务颜色
   */
  async getTaskColor(task) {
    if (task.status === 'completed') {
      return '#10B981'; // 绿色 - 已完成
    } else if (task.isOverdue()) {
      return '#EF4444'; // 红色 - 超期
    } else {
      // 使用任务的自定义颜色逻辑
      return await task.getColor();
    }
  }

  /**
   * 截断文本
   */
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength) + '...';
  }

  /**
   * 根据任务的重要性和时间计算坐标
   * X轴：紧急程度（基于截止时间）
   * Y轴：重要程度（基于重要性值）
   */
  calculateTaskCoordinates(task) {
    const margin = 30;
    const xAxisWidth = this.width - 2 * margin;
    const yAxisHeight = this.height - 2 * margin;
    
    // 计算X坐标（基于时间紧急程度）
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const timeDiff = dueDate.getTime() - now.getTime();
    const hours = timeDiff / (1000 * 60 * 60);
    
    // X轴映射：使用新的刻度映射方法
    let x;
    if (hours <= 0) {
      // 已超期：最右边
      x = this.width - margin;
    } else {
      // 使用新的时间坐标映射
      x = this.getXCoordinateFromTime(hours);
    }
    
    // 计算Y坐标（基于重要性）
    const importance = parseInt(task.importance);
    // Y轴映射：重要程度（重要性越高越靠上）
    // SVG坐标系统中，Y轴向下，所以重要任务在上方（Y值较小）
    // 重要性1-10映射：1（最低）→ 底部，10（最高）→ 顶部
    const relativeImportance = Math.max(0, Math.min(1, (importance - 1) / 9)); // 1-10映射到0-1
    let y = margin + ((1 - relativeImportance) * yAxisHeight);
    
    // 确保坐标在有效范围内
    x = Math.max(margin, Math.min(this.width - margin, x));
    y = Math.max(margin, Math.min(this.height - margin, y));
    
    // 调试信息
    console.log(`=== Task "${task.title}" Coordinates ===`);
    console.log(`Task Details:`, {
      title: task.title,
      importance: importance,
      dueDate: task.dueDate,
      hoursLeft: hours
    });
    console.log(`Matrix Dimensions:`, {
      width: this.width,
      height: this.height,
      margin: margin,
      xAxisWidth: xAxisWidth,
      yAxisHeight: yAxisHeight
    });
    console.log(`X-Axis Calculation:`, {
      hours: hours,
      isOverdue: hours <= 0,
      isToday: hours > 0 && hours <= 24,
      isFuture: hours > 24,
      relativePosition: hours <= 24 ? (hours / 24) : (hours > 24 ? ((hours - 24) / (744 - 24)) : 0)
    });
    console.log(`Y-Axis Calculation:`, {
      importance: importance,
      relativeImportance: relativeImportance
    });
    console.log(`Final Coordinates:`, {
      x: x,
      y: y,
      xPercent: ((x - margin) / xAxisWidth * 100).toFixed(1) + '%',
      yPercent: ((y - margin) / yAxisHeight * 100).toFixed(1) + '%'
    });
    console.log(`=====================================`);
    
    return { x, y };
  }

  /**
   * 获取象限边界
   * 新的坐标轴逻辑：
   * X轴：紧急程度（左不紧急，右紧急）
   * Y轴：重要程度（上重要，下不重要）
   */
  getQuadrantBounds(quadrantKey) {
    const width = this.width / 2;
    const height = this.height / 2;

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
   * 绘制轴线箭头
   */
  drawAxisArrows() {
    const arrowSize = 6; // 减小箭头大小
    
    // X轴箭头 (向右) - 确保不超出边界
    const xArrowX = this.width - 25; // 进一步增加边距
    const xArrowY = this.height / 2;
    
    this.axesGroup.append('polygon')
      .attr('points', `${xArrowX - arrowSize},${xArrowY - arrowSize} ${xArrowX},${xArrowY} ${xArrowX - arrowSize},${xArrowY + arrowSize}`)
      .attr('fill', '#374151')
      .attr('stroke', '#374151')
      .attr('stroke-width', 1);
    
    // Y轴箭头 (向上) - 确保不超出边界
    const yArrowX = this.width / 2;
    const yArrowY = 25; // 进一步增加边距
    
    this.axesGroup.append('polygon')
      .attr('points', `${yArrowX - arrowSize},${yArrowY + arrowSize} ${yArrowX},${yArrowY} ${yArrowX + arrowSize},${yArrowY + arrowSize}`)
      .attr('fill', '#374151')
      .attr('stroke', '#374151')
      .attr('stroke-width', 1);
  }

  /**
   * 绘制X轴刻度
   */
  drawXAxisTicks() {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const margin = 30;
    const tickLength = 8;
    
    // 计算X轴可用宽度
    const xAxisWidth = this.width - 2 * margin;
    const rightHalf = xAxisWidth / 2;
    const leftHalf = xAxisWidth / 2;
    
    // 定义刻度数据模型（相对于原点的偏移时间）
    const timeTicks = [
      { label: 'Now', hoursFromOrigin: -24, x: this.width - margin },           // 原点前24小时
      { label: '1h', hoursFromOrigin: -23, x: centerX + (0.75 * rightHalf) },   // 原点前23小时
      { label: '6h', hoursFromOrigin: -18, x: centerX + (0.5 * rightHalf) },    // 原点前18小时
      { label: '12h', hoursFromOrigin: -12, x: centerX + (0.25 * rightHalf) },  // 原点前12小时
      { label: '24h', hoursFromOrigin: 0, x: centerX },                         // 原点（当前时间+24小时）
      { label: '3d', hoursFromOrigin: 48, x: centerX - (0.25 * leftHalf) },     // 原点后48小时
      { label: '7d', hoursFromOrigin: 144, x: centerX - (0.5 * leftHalf) },     // 原点后144小时
      { label: '14d', hoursFromOrigin: 312, x: centerX - (0.75 * leftHalf) },   // 原点后312小时
      { label: '31d', hoursFromOrigin: 720, x: margin }                         // 原点后720小时
    ];
    
    // 绘制所有刻度标签
    timeTicks.forEach(tick => {
      this.axesGroup.append('text')
        .attr('x', tick.x)
        .attr('y', centerY + tickLength + 15)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
        .attr('font-size', '11px')
        .attr('fill', '#6B7280')
        .text(tick.label);
    });
  }

  /**
   * 根据X坐标计算对应的时间（小时）
   */
  getTimeFromXCoordinate(x) {
    const margin = 30;
    const centerX = this.width / 2;
    const xAxisWidth = this.width - 2 * margin;
    const rightHalf = xAxisWidth / 2;
    const leftHalf = xAxisWidth / 2;
    
    // 定义刻度数据模型（相对于原点的偏移时间）
    const timeTicks = [
      { label: 'Now', hoursFromOrigin: -24, x: this.width - margin },           // 原点前24小时
      { label: '1h', hoursFromOrigin: -23, x: centerX + (0.75 * rightHalf) },   // 原点前23小时
      { label: '6h', hoursFromOrigin: -18, x: centerX + (0.5 * rightHalf) },    // 原点前18小时
      { label: '12h', hoursFromOrigin: -12, x: centerX + (0.25 * rightHalf) },  // 原点前12小时
      { label: '24h', hoursFromOrigin: 0, x: centerX },                         // 原点（当前时间+24小时）
      { label: '3d', hoursFromOrigin: 48, x: centerX - (0.25 * leftHalf) },     // 原点后48小时
      { label: '7d', hoursFromOrigin: 144, x: centerX - (0.5 * leftHalf) },     // 原点后144小时
      { label: '14d', hoursFromOrigin: 312, x: centerX - (0.75 * leftHalf) },   // 原点后312小时
      { label: '31d', hoursFromOrigin: 720, x: margin }                         // 原点后720小时
    ];
    
    // 计算原点时间（当前时间+24小时）
    const now = new Date();
    const originTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // 找到最近的刻度点
    let minDistance = Infinity;
    let closestTick = timeTicks[0];
    
    for (const tick of timeTicks) {
      const distance = Math.abs(x - tick.x);
      if (distance < minDistance) {
        minDistance = distance;
        closestTick = tick;
      }
    }
    
    // 计算实际时间：原点时间 + 偏移时间
    const actualTime = new Date(originTime.getTime() + closestTick.hoursFromOrigin * 60 * 60 * 1000);
    
    // 返回相对于当前时间的小时数
    const hoursFromNow = (actualTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    console.log(`=== X坐标时间计算 ===`);
    console.log(`X坐标: ${x}`);
    console.log(`当前时间: ${now.toLocaleString()}`);
    console.log(`原点时间: ${originTime.toLocaleString()}`);
    console.log(`最近刻度: ${closestTick.label} (偏移: ${closestTick.hoursFromOrigin}h)`);
    console.log(`实际时间: ${actualTime.toLocaleString()}`);
    console.log(`相对当前时间: ${hoursFromNow.toFixed(1)}小时`);
    console.log(`=====================`);
    
    return Math.max(0, hoursFromNow);
  }

  /**
   * 根据时间（小时）计算X坐标
   */
  getXCoordinateFromTime(hours) {
    const margin = 30;
    const centerX = this.width / 2;
    const xAxisWidth = this.width - 2 * margin;
    const rightHalf = xAxisWidth / 2;
    const leftHalf = xAxisWidth / 2;
    
    // 定义刻度数据模型（相对于原点的偏移时间）
    const timeTicks = [
      { label: 'Now', hoursFromOrigin: -24, x: this.width - margin },           // 原点前24小时
      { label: '1h', hoursFromOrigin: -23, x: centerX + (0.75 * rightHalf) },   // 原点前23小时
      { label: '6h', hoursFromOrigin: -18, x: centerX + (0.5 * rightHalf) },    // 原点前18小时
      { label: '12h', hoursFromOrigin: -12, x: centerX + (0.25 * rightHalf) },  // 原点前12小时
      { label: '24h', hoursFromOrigin: 0, x: centerX },                         // 原点（当前时间+24小时）
      { label: '3d', hoursFromOrigin: 48, x: centerX - (0.25 * leftHalf) },     // 原点后48小时
      { label: '7d', hoursFromOrigin: 144, x: centerX - (0.5 * leftHalf) },     // 原点后144小时
      { label: '14d', hoursFromOrigin: 312, x: centerX - (0.75 * leftHalf) },   // 原点后312小时
      { label: '31d', hoursFromOrigin: 720, x: margin }                         // 原点后720小时
    ];
    
    // 计算原点时间（当前时间+24小时）
    const now = new Date();
    const originTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // 计算目标时间（当前时间 + 指定小时数）
    const targetTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
    
    // 计算相对于原点的时间偏移
    const hoursFromOrigin = (targetTime.getTime() - originTime.getTime()) / (1000 * 60 * 60);
    
    // 找到最接近的时间刻度点
    let minDistance = Infinity;
    let closestTick = timeTicks[0];
    
    for (const tick of timeTicks) {
      const distance = Math.abs(hoursFromOrigin - tick.hoursFromOrigin);
      if (distance < minDistance) {
        minDistance = distance;
        closestTick = tick;
      }
    }
    
    console.log(`=== 时间X坐标计算 ===`);
    console.log(`目标时间: ${hours}小时后`);
    console.log(`当前时间: ${now.toLocaleString()}`);
    console.log(`原点时间: ${originTime.toLocaleString()}`);
    console.log(`目标时间: ${targetTime.toLocaleString()}`);
    console.log(`相对原点偏移: ${hoursFromOrigin.toFixed(1)}小时`);
    console.log(`最近刻度: ${closestTick.label} (偏移: ${closestTick.hoursFromOrigin}h)`);
    console.log(`X坐标: ${closestTick.x}`);
    console.log(`=====================`);
    
    return closestTick.x;
  }

  /**
   * 绘制坐标轴标签
   */
  drawAxisLabels() {
    const margin = 30;
    const labelOffset = 4; // 标签距离轴线的偏移量
    
    // X轴标签 - 紧急程度
    // Not Urgent: 放在X轴左边缘的左上方
    this.labelsGroup.append('text')
      .attr('x', 0)
      .attr('y', (this.height - margin)/2 - 2*labelOffset)
      .attr('text-anchor', 'start')
      .attr('dominant-baseline', 'hanging')
      .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text('Not Urgent');
    
    // Urgent: 放在X轴右边缘的右上方
    this.labelsGroup.append('text')
      .attr('x', this.width )
      .attr('y', (this.height - margin)/2 - 2*labelOffset)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'hanging')
      .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text('Urgent');
    
    // Y轴标签 - 重要程度
    // Important: 放在Y轴上边缘的右上方
    this.labelsGroup.append('text')
      .attr('x', (this.width - margin)/2 + 2*labelOffset)
      .attr('y', labelOffset)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'hanging')
      .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text('Important');
    
    // Not Important: 放在Y轴下边缘的右下方
    this.labelsGroup.append('text')
      .attr('x', (this.width - margin)/2 + 2*labelOffset)
      .attr('y', this.height - 2*labelOffset)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'auto')
      .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text('Not Important');
  }

  /**
   * 存储任务信息用于交互
   */
  storeTaskInfo(task, x, y, radius) {
    if (!this.taskInfo) {
      this.taskInfo = [];
    }
    
    this.taskInfo.push({
      task,
      bounds: { x, y, radius }
    });
  }

  /**
   * 处理任务悬停
   */
  handleTaskHover(task, x, y) {
    this.svg.style('cursor', 'pointer');
    this.showTaskTooltip(task, x, y);
  }

  /**
   * 处理任务离开
   */
  handleTaskLeave() {
    this.svg.style('cursor', 'default');
    this.hideTaskTooltip();
  }

  /**
   * 处理任务双击
   */
  handleTaskDoubleClick(task) {
    if (this.onTaskDoubleClick) {
      this.onTaskDoubleClick(task);
    }
  }

  /**
   * 显示任务提示框
   */
  showTaskTooltip(task, x, y) {
    // 移除现有的提示框
    this.hideTaskTooltip();
    
    // 计算tooltip的尺寸 - 使用固定高度避免popup高度变化
    const tooltipWidth = 300;
    const tooltipHeight = 120; // 固定高度
    const margin = 15;
    const padding = 12;
    const availableWidth = tooltipWidth - (padding * 2);
    
    // 字符宽度计算函数 - 区分拉丁和非拉丁字符
    const getCharWidth = (char) => {
      // 检测是否为拉丁字符（英文、数字、标点符号等）
      const charCode = char.charCodeAt(0);
      const isLatin = charCode <= 127; // ASCII范围 0-127
      return isLatin ? 6.5 : 11; // 拉丁字符6.5px，非拉丁字符11px
    };
    
    // 计算文本宽度
    const getTextWidth = (text) => {
      let totalWidth = 0;
      for (let i = 0; i < text.length; i++) {
        totalWidth += getCharWidth(text[i]);
      }
      return totalWidth;
    };
    
    // 计算每行能容纳的字符数（动态计算）
    const getMaxCharsForWidth = (text, maxWidth) => {
      let currentWidth = 0;
      let charCount = 0;
      
      for (let i = 0; i < text.length; i++) {
        const charWidth = getCharWidth(text[i]);
        if (currentWidth + charWidth <= maxWidth) {
          currentWidth += charWidth;
          charCount++;
        } else {
          break;
        }
      }
      
      return charCount;
    };
    
    console.log('=== Tooltip Description Calculation ===');
    console.log('availableWidth:', availableWidth, 'px');
    console.log('tooltipWidth:', tooltipWidth, 'px');
    console.log('padding:', padding, 'px');
    
    // 计算描述需要的行数和每行内容
    let descriptionLines = [];
    if (task.description && task.description.trim()) {
      const description = task.description.trim();
      let remainingText = description;
      
      console.log('Original description:', `"${description}"`);
      console.log('Description length:', description.length, 'characters');
      
      while (remainingText.length > 0 && descriptionLines.length < 3) {
        let line = '';
        
        // 计算当前文本能容纳的最大字符数
        const maxCharsForCurrentText = getMaxCharsForWidth(remainingText, availableWidth);
        
        if (remainingText.length <= maxCharsForCurrentText) {
          line = remainingText;
          remainingText = '';
          console.log(`Line ${descriptionLines.length + 1} (fits): "${line}" (${line.length} chars, width: ${getTextWidth(line)}px)`);
        } else {
          // 尝试在空格处换行
          let breakPoint = maxCharsForCurrentText;
          while (breakPoint > 0 && remainingText[breakPoint] !== ' ') {
            breakPoint--;
          }
          
          if (breakPoint === 0) {
            // 没有找到空格，强制截断
            breakPoint = maxCharsForCurrentText;
            console.log(`No space found, forcing break at ${breakPoint}`);
          } else {
            console.log(`Found space at position ${breakPoint}`);
          }
          
          line = remainingText.substring(0, breakPoint).trim();
          remainingText = remainingText.substring(breakPoint).trim();
          console.log(`Line ${descriptionLines.length + 1} (split): "${line}" (${line.length} chars, width: ${getTextWidth(line)}px)`);
          console.log(`Remaining text: "${remainingText}" (${remainingText.length} chars)`);
        }
        
        descriptionLines.push(line);
      }
      
      // 如果还有剩余文本且已经达到3行，添加省略号
      if (remainingText.length > 0 && descriptionLines.length >= 3) {
        const lastLine = descriptionLines[descriptionLines.length - 1];
        // 计算为省略号留出空间后的最大字符数
        const maxCharsForEllipsis = getMaxCharsForWidth(lastLine + '...', availableWidth) - 3;
        console.log(`Adding ellipsis. Last line: "${lastLine}" (${lastLine.length} chars, width: ${getTextWidth(lastLine)}px)`);
        console.log(`maxChars for ellipsis: ${maxCharsForEllipsis} chars`);
        
        if (lastLine.length > maxCharsForEllipsis) {
          const truncatedLine = lastLine.substring(0, maxCharsForEllipsis) + '...';
          descriptionLines[descriptionLines.length - 1] = truncatedLine;
          console.log(`Truncated to: "${truncatedLine}" (${truncatedLine.length} chars, width: ${getTextWidth(truncatedLine)}px)`);
        }
      }
      
      console.log('Final description lines:', descriptionLines);
      console.log('Total lines:', descriptionLines.length);
    } else {
      console.log('No description to process');
    }
    console.log('=== End Description Calculation ===');
    
    // 计算最佳位置，避免越界
    let tooltipX = x + margin;
    let tooltipY = y - margin;
    
    // 检查右边界
    if (tooltipX + tooltipWidth > this.width) {
      tooltipX = x - tooltipWidth - margin;
    }
    
    // 检查左边界
    if (tooltipX < 0) {
      tooltipX = margin;
    }
    
    // 检查下边界
    if (tooltipY + tooltipHeight > this.height) {
      tooltipY = y - tooltipHeight - margin;
    }
    
    // 检查上边界
    if (tooltipY < 0) {
      tooltipY = margin;
    }
    
    const tooltip = this.svg.append('g')
      .attr('class', 'task-tooltip')
      .attr('transform', `translate(${tooltipX}, ${tooltipY})`);
    
    // 创建背景矩形
    tooltip.append('rect')
      .attr('width', tooltipWidth)
      .attr('height', tooltipHeight)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', 'rgba(17, 24, 39, 0.95)')
      .attr('stroke', 'rgba(255, 255, 255, 0.2)')
      .attr('stroke-width', 1)
      .style('filter', 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))');
    
    // 任务标题
    tooltip.append('text')
      .attr('x', padding)
      .attr('y', 20)
      .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .attr('fill', '#ffffff')
      .text(this.truncateText(task.title, 35));
    
    // 任务描述（支持换行）
    if (descriptionLines.length > 0) {
      const lineHeight = 16;
      descriptionLines.forEach((line, index) => {
        tooltip.append('text')
          .attr('x', padding)
          .attr('y', 42 + index * lineHeight)
          .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
          .attr('font-size', '11px')
          .attr('fill', '#d1d5db')
          .text(line);
      });
    }
    
    // 截止时间
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    const hours = timeDiff / (1000 * 60 * 60);
    
    let timeText = '';
    if (hours < 0) {
      // 超期：根据超期时间长度显示不同格式
      const overdueHours = Math.abs(hours);
      if (overdueHours < 1) {
        // 超期不到1小时：显示分钟
        const minutes = Math.ceil(overdueHours * 60);
        timeText = `Overdue ${minutes}m`;
      } else if (overdueHours < 24) {
        // 超期1-24小时：显示小时和分钟
        const wholeHours = Math.floor(overdueHours);
        const minutes = Math.ceil((overdueHours - wholeHours) * 60);
        if (minutes === 60) {
          timeText = `Overdue ${wholeHours + 1}h`;
        } else {
          timeText = `Overdue ${wholeHours}h ${minutes}m`;
        }
      } else {
        // 超期超过1天：显示天数
        const overdueDays = Math.ceil(overdueHours / 24);
        timeText = `Overdue ${overdueDays}d`;
      }
    } else if (hours < 1) {
      // 不到1小时：显示分钟
      const minutes = Math.ceil(hours * 60);
      timeText = `Due in ${minutes}m`;
    } else if (hours < 24) {
      // 1-24小时：显示小时和分钟
      const wholeHours = Math.floor(hours);
      const minutes = Math.ceil((hours - wholeHours) * 60);
      if (minutes === 60) {
        timeText = `Due in ${wholeHours + 1}h`;
      } else {
        timeText = `Due in ${wholeHours}h ${minutes}m`;
      }
    } else {
      // 超过1天：显示具体日期
      timeText = `Due ${dueDate.toLocaleDateString()}`;
    }
    
    tooltip.append('text')
      .attr('x', 12)
      .attr('y', tooltipHeight - 12)
      .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
      .attr('font-size', '11px')
      .attr('fill', hours < 0 ? '#ef4444' : '#10b981')
      .text(timeText);
  }

  /**
   * 隐藏任务提示框
   */
  hideTaskTooltip() {
    this.svg.selectAll('.task-tooltip').remove();
  }

  /**
   * 获取指定位置的任务
   */
  getTaskAtPosition(x, y) {
    if (!this.taskInfo) return null;
    
    return this.taskInfo.find(task => {
      const bounds = task.bounds;
      const distance = Math.sqrt((x - bounds.x) ** 2 + (y - bounds.y) ** 2);
      return distance <= bounds.radius;
    });
  }

  /**
   * 处理背景双击
   */
  handleBackgroundDoubleClick(event) {
    const rect = this.svg.node().getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 检查是否点击在任务上
    const task = this.getTaskAtPosition(x, y);
    if (task) {
      // 如果点击在任务上，不创建新任务
      return;
    }
    
    // 计算坐标对应的象限和位置
    const quadrantKey = this.getQuadrantFromCoordinates(x, y);
    const coordinates = { x, y };
    
    if (this.onBackgroundDoubleClick) {
      this.onBackgroundDoubleClick(coordinates, quadrantKey);
    }
  }

  /**
   * 根据坐标获取象限
   */
  getQuadrantFromCoordinates(x, y) {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    const isImportant = y < centerY; // 上半部分为重要
    const isUrgent = x > centerX;    // 右半部分为紧急
    
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
   * 设置任务双击回调
   */
  onTaskDoubleClick(callback) {
    this.onTaskDoubleClick = callback;
  }

  /**
   * 设置背景双击回调
   */
  onBackgroundDoubleClick(callback) {
    this.onBackgroundDoubleClick = callback;
  }

  /**
   * 更新矩阵数据并重新渲染
   */
  async updateMatrix(matrix) {
    this.currentMatrix = matrix;
    this.taskInfo = []; // 清空任务信息
    await this.render(matrix);
  }

  /**
   * 调整画布大小
   */
  resize() {
    this.width = this.container.clientWidth || 480;
    this.height = this.container.clientHeight || 380;
    
    // 重新初始化SVG
    this.initSVG();
    
    if (this.currentMatrix) {
      this.render(this.currentMatrix);
    }
  }
} 