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
    
    // 存储当前悬停的圆点引用
    this.currentHoveredCircle = null;
    
    // 存储当前悬停的任务ID
    this.currentHoveredTaskId = null;
    
    // 防抖定时器
    this.hoverDebounceTimer = null;
    
    // 回调函数
    this.onTaskDoubleClick = null;
    this.onBackgroundDoubleClick = null;
    
    console.log(`MatrixRenderer初始化: ${this.width}x${this.height}`);
  }

  // 字符宽度计算函数 - 区分拉丁和非拉丁字符
  getCharWidth(char) {
    // 检测是否为拉丁字符（英文、数字、标点符号等）
    const charCode = char.charCodeAt(0);
    const isLatin = charCode <= 127; // ASCII范围 0-127
    return isLatin ? 6.5 : 11; // 拉丁字符6.5px，非拉丁字符11px
  }

  // 计算每行能容纳的字符数（动态计算）
  getMaxCharsForWidth(text, maxWidth) {
    let currentWidth = 0;
    let charCount = 0;
    
    for (let i = 0; i < text.length; i++) {
      const charWidth = this.getCharWidth(text[i]);
      if (currentWidth + charWidth <= maxWidth) {
        currentWidth += charWidth;
        charCount++;
      } else {
        break;
      }
    }
    
    return charCount;
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
   * 更新矩阵（别名方法，用于兼容性）
   */
  async updateMatrix(matrix) {
    return this.render(matrix);
  }

  /**
   * 调整大小
   */
  resize() {
    // 获取容器的新尺寸
    const newWidth = this.container.clientWidth || 480;
    const newHeight = this.container.clientHeight || 450;
    
    // 如果尺寸没有变化，不需要重新渲染
    if (newWidth === this.width && newHeight === this.height) {
      return;
    }
    
    console.log(`MatrixRenderer resize: ${this.width}x${this.height} -> ${newWidth}x${newHeight}`);
    
    // 更新尺寸
    this.width = newWidth;
    this.height = newHeight;
    
    // 更新SVG尺寸
    this.svg
      .attr('width', this.width)
      .attr('height', this.height);
    
    // 如果有当前矩阵数据，重新渲染
    if (this.currentMatrix) {
      this.render(this.currentMatrix);
    }
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
    
    // 清除当前悬停状态
    this.currentHoveredTaskId = null;
    this.currentHoveredCircle = null;
    if (this.hoverDebounceTimer) {
      clearTimeout(this.hoverDebounceTimer);
      this.hoverDebounceTimer = null;
    }
    
    // 重置悬停圆点引用
    this.currentHoveredCircle = null;
    this.currentHoveredTaskId = null; // 重置任务ID
    
    // 清理防抖定时器
    if (this.hoverDebounceTimer) {
      clearTimeout(this.hoverDebounceTimer);
      this.hoverDebounceTimer = null;
    }
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

    console.log(task);
    
    // 根据任务的重要性和时间计算坐标
    const coordinates = this.calculateTaskCoordinates(task);
    x = coordinates.x;
    y = coordinates.y;
    console.log(`Using calculated coordinates for "${task.title}": (${x}, ${y})`);

    const radius = 6;
    const color = await this.getTaskColor(task);
    
    console.log(`Drawing task "${task.title}" at position (${x}, ${y}) with color ${color}`);
    
    // 绘制圆点
    this.tasksGroup.append('circle')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', radius)
      .attr('fill', color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .attr('data-task-id', task.id)
      .attr('cursor', 'pointer')
      .on('mouseenter', () => this.handleTaskHover(task, x, y))
      .on('mouseleave', () => this.handleTaskLeave())
      .on('dblclick', (event) => {
        event.stopPropagation(); // 阻止事件冒泡到背景
        this.handleTaskDoubleClick(task);
      });
    
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
    const now = Date.now();
    const dueDate = new Date(task.dueDate);
    
    // X轴映射：使用新的分钟级精度时间坐标映射
    const x = this.getXCoordinateFromTime(dueDate.getTime());
    
    // 计算Y坐标（基于重要性）
    const importance = parseInt(task.importance);
    // Y轴映射：重要程度（重要性越高越靠上）
    // SVG坐标系统中，Y轴向下，所以重要任务在上方（Y值较小）
    // 重要性1-10映射：1（最低）→ 底部，10（最高）→ 顶部
    const relativeImportance = Math.max(0, Math.min(1, (importance - 1) / 9)); // 1-10映射到0-1
    let y = margin + ((1 - relativeImportance) * yAxisHeight);
    
    // 确保坐标在有效范围内
    y = Math.max(margin, Math.min(this.height - margin, y));
    
    // 调试信息
    console.log(`=== 计算任务坐标 ===`);
    console.log('任务信息:', {
      id: task.id,
      title: task.title,
      importance,
      dueDate: new Date(task.dueDate).toLocaleString(), // 转换为本地时间字符串
      status: task.status
    });
    console.log('坐标系信息:', {
      width: this.width,
      height: this.height,
      margin,
      xAxisWidth,
      yAxisHeight
    });
    console.log('Y轴计算:', {
      importance,
      relativeImportance: relativeImportance.toFixed(4),
      yCoordinate: y.toFixed(2)
    });
    console.log('最终坐标:', {
      x: x.toFixed(2),
      y: y.toFixed(2),
      xPercent: ((x - margin) / xAxisWidth * 100).toFixed(1) + '%',
      yPercent: ((y - margin) / yAxisHeight * 100).toFixed(1) + '%'
    });
    console.log('===============================');
    
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
    const centerY = this.height / 2;
    const margin = 30;
    const tickLength = 8;
    
    // 计算X轴可用宽度
    const availableWidth = this.width - 2 * margin;
    const segmentWidth = availableWidth / (this.timeScales.length - 1);
    
    // 绘制刻度标签
    this.timeScales.forEach((scale, index) => {
      const x = this.width - margin - (segmentWidth * index);
      
      this.axesGroup.append('text')
        .attr('x', x)
        .attr('y', centerY + tickLength + 15)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
        .attr('font-size', '11px')
        .attr('fill', '#6B7280')
        .text(scale.label);
    });
  }

  /**
   * 定义时间刻度和权重
   */
  timeScales = [
    { label: 'Now', minutes: 0, weight: 0 },
    { label: '30m', minutes: 30, weight: 30 },      // 0-30分钟
    { label: '1h', minutes: 60, weight: 30 },       // 30-60分钟
    { label: '4h', minutes: 240, weight: 180 },     // 1-4小时
    { label: '12h', minutes: 720, weight: 480 },    // 4-12小时
    { label: '24h', minutes: 1440, weight: 720 },   // 12-24小时
    { label: '2d', minutes: 2880, weight: 1440 },   // 24-48小时
    { label: '3d', minutes: 4320, weight: 1440 },   // 2-3天
    { label: '7d', minutes: 10080, weight: 5760 },  // 3-7天
    { label: '14d', minutes: 20160, weight: 10080 }, // 7-14天
    { label: '31d', minutes: 44640, weight: 24480 }  // 14-31天
  ];

  /**
   * 获取时间对应的X坐标
   * @param {number} dueTimestamp - 截止时间戳
   * @returns {number} X坐标
   */
  getXCoordinateFromTime(dueTimestamp) {
    const now = Date.now();
    const diffMinutes = (dueTimestamp - now) / (1000 * 60);
    
    console.log('=== 计算时间到X坐标的映射 ===');
    console.log('当前时间戳:', now);
    console.log('目标时间戳:', dueTimestamp);
    console.log('目标时间(Date):', new Date(dueTimestamp).toLocaleString());
    console.log('时间差(分钟):', diffMinutes.toFixed(2));
    
    // 如果已过期，返回最右侧
    if (diffMinutes <= 0) {
      console.log('任务已过期，返回最右侧坐标:', this.width - 30);
      return this.width - 30;
    }

    const margin = 30;
    const availableWidth = this.width - 2 * margin;
    const segmentWidth = availableWidth / (this.timeScales.length - 1);

    // 找到时间所在的区间
    let startScale, endScale;
    for (let i = 0; i < this.timeScales.length - 1; i++) {
      if (diffMinutes <= this.timeScales[i + 1].minutes) {
        startScale = this.timeScales[i];
        endScale = this.timeScales[i + 1];
        break;
      }
    }

    // 如果超过最大时间，返回最左侧
    if (!startScale || !endScale) {
      console.log('任务超过最大时间范围，返回最左侧坐标:', margin);
      return margin;
    }

    console.log('时间区间:', {
      start: {
        label: startScale.label,
        minutes: startScale.minutes,
        weight: startScale.weight
      },
      end: {
        label: endScale.label,
        minutes: endScale.minutes,
        weight: endScale.weight
      }
    });

    // 计算在区间内的位置
    const segmentStart = this.width - margin - (startScale.minutes === 0 ? 0 : segmentWidth * this.timeScales.indexOf(startScale));
    const segmentEnd = this.width - margin - segmentWidth * this.timeScales.indexOf(endScale);
    
    // 使用权重计算插值比例
    const timeInSegment = diffMinutes - startScale.minutes;
    const segmentWeight = endScale.weight;
    const ratio = timeInSegment / segmentWeight;
    
    const finalX = segmentStart - (segmentStart - segmentEnd) * ratio;
    
    console.log('坐标计算:', {
      segmentStart,
      segmentEnd,
      timeInSegment: timeInSegment.toFixed(2),
      weight: segmentWeight,
      ratio: ratio.toFixed(4),
      finalX: finalX.toFixed(2)
    });
    console.log('===============================');
    
    return finalX;
  }

  /**
   * 根据X坐标获取对应的时间
   * @param {number} x - X坐标
   * @returns {number} 对应的时间戳
   */
  getTimeFromXCoordinate(x) {
    console.log('=== 计算X坐标到时间的映射 ===');
    console.log('输入X坐标:', x.toFixed(2));
    
    const margin = 30;
    const availableWidth = this.width - 2 * margin;
    const segmentWidth = availableWidth / (this.timeScales.length - 1);
    
    // 计算从右到左的位置（相对位置）
    const positionFromRight = Math.max(0, Math.min(availableWidth, this.width - margin - x));
    const relativePosition = positionFromRight / availableWidth;
    
    console.log('位置计算:', {
      width: this.width,
      margin,
      availableWidth,
      segmentWidth: segmentWidth.toFixed(2),
      positionFromRight: positionFromRight.toFixed(2),
      relativePosition: relativePosition.toFixed(4)
    });
    
    // 如果在最右边（Now）
    if (relativePosition <= 0) {
      const now = Date.now();
      console.log('位于最右边，返回当前时间戳:', now);
      return now;
    }
    
    // 如果在最左边（31d）
    if (relativePosition >= 1) {
      const now = Date.now();
      const maxTime = now + this.timeScales[this.timeScales.length - 1].minutes * 60 * 1000; // 直接计算时间戳
      console.log('位于最左边，返回最大时间戳:', maxTime);
      return maxTime;
    }
    
    // 找到坐标所在的区间
    const segmentIndex = Math.floor(positionFromRight / segmentWidth);
    const startScale = this.timeScales[Math.min(segmentIndex, this.timeScales.length - 2)];
    const endScale = this.timeScales[Math.min(segmentIndex + 1, this.timeScales.length - 1)];
    
    console.log('区间定位:', {
      segmentIndex,
      start: {
        label: startScale.label,
        minutes: startScale.minutes,
        weight: startScale.weight
      },
      end: {
        label: endScale.label,
        minutes: endScale.minutes,
        weight: endScale.weight
      }
    });
    
    // 计算在区间内的位置
    const segmentStart = this.width - margin - segmentWidth * segmentIndex;
    const segmentEnd = this.width - margin - segmentWidth * (segmentIndex + 1);
    const ratio = Math.max(0, Math.min(1, (segmentStart - x) / (segmentStart - segmentEnd)));
    
    // 使用权重计算时间（确保不超过区间范围）
    const minutesInSegment = Math.min(endScale.weight, ratio * endScale.weight);
    const totalMinutes = Math.min(endScale.minutes, startScale.minutes + minutesInSegment);
    
    console.log('时间计算:', {
      segmentStart: segmentStart.toFixed(2),
      segmentEnd: segmentEnd.toFixed(2),
      ratio: ratio.toFixed(4),
      minutesInSegment: minutesInSegment.toFixed(2),
      totalMinutes: totalMinutes.toFixed(2)
    });
    
    // 返回对应的时间点（确保不超过最大时间）
    const now = Date.now();
    const maxMinutes = this.timeScales[this.timeScales.length - 1].minutes;
    const finalMinutes = Math.min(maxMinutes, totalMinutes);
    const resultTimestamp = now + finalMinutes * 60 * 1000; // 直接返回时间戳
    
    console.log('计算结果:', {
      currentTime: new Date(now).toLocaleString(),
      resultTime: new Date(resultTimestamp).toLocaleString(),
      minutesFromNow: finalMinutes.toFixed(2),
      resultTimestamp
    });
    console.log('===============================');
    
    return resultTimestamp; // 返回时间戳
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
      x: x,
      y: y,
      radius: radius
    });
  }

  /**
   * 处理任务悬停
   */
  handleTaskHover(task, x, y) {
    // 清除之前的防抖定时器
    if (this.hoverDebounceTimer) {
      clearTimeout(this.hoverDebounceTimer);
      this.hoverDebounceTimer = null;
    }
    
    // 防止重复处理同一个任务的悬停
    if (this.currentHoveredTaskId === task.id) {
      return;
    }
    
    // 立即重置所有圆点的大小
    this.resetAllCircleSizes();
    
    this.currentHoveredTaskId = task.id;
    this.svg.style('cursor', 'pointer');
    
    // 添加悬停效果：轻微放大圆点
    const circle = this.svg.select(`circle[data-task-id="${task.id}"]`);
    if (!circle.empty()) {
      // 标记当前悬停的圆点
      this.currentHoveredCircle = circle;
      circle.transition()
        .duration(200)
        .attr('r', 8) // 悬停时稍微放大
        .attr('stroke-width', 2);
    }
    
    // 延迟显示tooltip，避免快速移动时的闪烁
    this.hoverDebounceTimer = setTimeout(() => {
      this.showTaskTooltip(task, x, y);
    }, 200); // 200ms延迟
  }

  /**
   * 重置所有圆点的大小
   */
  resetAllCircleSizes() {
      this.svg.selectAll('circle[data-task-id]').each((d, i, nodes) => {
        const circle = d3.select(nodes[i]);
        const currentRadius = parseFloat(circle.attr('r'));
        if (currentRadius > 6) {
          circle.transition()
            .duration(200)
            .attr('r', 6)
            .attr('stroke-width', 1.5);
        }
      });
    }

  /**
   * 处理任务离开
   */
  handleTaskLeave() {
    // 清除悬停定时器
    if (this.hoverDebounceTimer) {
      clearTimeout(this.hoverDebounceTimer);
      this.hoverDebounceTimer = null;
    }
    
    // 设置防抖延迟，避免快速移动时的闪动
    this.hoverDebounceTimer = setTimeout(() => {
      // 清除当前悬停的任务ID
      this.currentHoveredTaskId = null;
      this.svg.style('cursor', 'default');
      this.hideTaskTooltip();
      
      // 重置所有圆点的大小
      this.resetAllCircleSizes();
      this.currentHoveredCircle = null;
      
      this.hoverDebounceTimer = null;
    }, 100); // 减少延迟到100ms，提高响应性
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
   * 处理背景双击
   */
  handleBackgroundDoubleClick(event) {
    console.log('=== 处理背景双击事件 ===');
    
    // 检查是否点击在任务圆点上
    const [x, y] = d3.pointer(event);
    const clickedElement = event.target;
    
    console.log('点击坐标:', {
      x: x.toFixed(2),
      y: y.toFixed(2)
    });
    
    // 如果点击的是任务圆点，不处理背景双击
    if (clickedElement.tagName === 'circle' && clickedElement.getAttribute('data-task-id')) {
      console.log('点击被忽略 - 点击在任务圆点上');
      return;
    }
    
    // 检查是否点击在任务圆点附近（考虑圆点大小）
    const taskRadius = 6; // 任务圆点的半径
    const margin = 30; // 矩阵边距
    
    // 检查是否在有效区域内（排除边距）
    if (x < margin || x > this.width - margin || y < margin || y > this.height - margin) {
      console.log('点击被忽略 - 超出矩阵有效区域:', {
        validArea: {
          x: [margin, this.width - margin],
          y: [margin, this.height - margin]
        }
      });
      return;
    }
    
    // 检查是否点击在任务圆点附近
    for (const taskInfo of this.taskInfo || []) {
      const distance = Math.sqrt(Math.pow(x - taskInfo.x, 2) + Math.pow(y - taskInfo.y, 2));
      if (distance <= taskRadius + 2) { // 添加2px的容差
        console.log('点击被忽略 - 太靠近现有任务:', {
          taskId: taskInfo.task.id,
          taskTitle: taskInfo.task.title,
          distance: distance.toFixed(2)
        });
        return;
      }
    }
    
    if (this.onBackgroundDoubleClick) {
      const coordinates = { x, y };
      
      // 计算象限
      const centerX = this.width / 2;
      const centerY = this.height / 2;
      let quadrantKey = 'q1'; // 默认第一象限
      
      if (x < centerX && y < centerY) {
        quadrantKey = 'q2'; // 第二象限
      } else if (x < centerX && y >= centerY) {
        quadrantKey = 'q3'; // 第三象限
      } else if (x >= centerX && y >= centerY) {
        quadrantKey = 'q4'; // 第四象限
      }
      
      // 计算默认重要性（基于Y轴位置）
      const yAxisHeight = this.height - 2 * margin;
      const importance = Math.round(10 - ((y - margin) / yAxisHeight) * 9);
      
      // 计算默认截止时间
      const defaultDueTime = this.getTimeFromXCoordinate(x);
      
      console.log('新任务默认值:', {
        coordinates: {
          x: x.toFixed(2),
          y: y.toFixed(2)
        },
        quadrant: quadrantKey,
        importance,
        dueTime: new Date(defaultDueTime).toLocaleString()
      });
      
      this.onBackgroundDoubleClick(coordinates, quadrantKey);
    }
    
    console.log('===============================');
  }

  /**
   * 显示任务提示框
   */
  showTaskTooltip(task, x, y) {
    // 移除现有的提示框
    this.hideTaskTooltip();
    
    // 固定尺寸和样式配置
    const tooltipWidth = 280;
    const tooltipHeight = 140;
    const padding = 12;
    
    // 创建tooltip元素
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'task-tooltip')
      .style('position', 'absolute')
      .style('z-index', '1000')
      .style('background', 'rgba(0, 0, 0, 0.9)')
      .style('color', '#ffffff')
      .style('padding', `${padding}px`)
      .style('border-radius', '8px')
      .style('font-size', '12px')
      .style('line-height', '1.4')
      .style('width', `${tooltipWidth}px`)
      .style('height', `${tooltipHeight}px`)
      .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.3)')
      .style('pointer-events', 'none')
      .style('opacity', '0')
      .style('transition', 'opacity 0.2s ease')
      .style('overflow', 'hidden');
    
    // 添加标题
    tooltip.append('div')
      .style('font-weight', 'bold')
      .style('margin-bottom', '6px')
      .style('color', '#ffffff')
      .style('font-size', '13px')
      .style('height', '20px')
      .style('line-height', '20px')
      .style('overflow', 'hidden')
      .style('text-overflow', 'ellipsis')
      .style('white-space', 'nowrap')
      .text(`Task: ${task.title}`);
    
    // 添加描述容器
    const descriptionContainer = tooltip.append('div')
      .style('color', '#e5e7eb')
      .style('margin-bottom', '8px')
      .style('height', '60px')
      .style('overflow', 'hidden')
      .style('border-top', '1px solid rgba(255, 255, 255, 0.3)')
      .style('padding-top', '8px'); // Increased from 6px to 10px
    
    // 添加描述内容
    if (task.description) {
      const description = task.description.trim();
      const maxWidth = tooltipWidth - 2 * padding;
      const wrappedLines = [];
      let currentLine = '';
      let currentLineWidth = 0;
      
      for (let i = 0; i < description.length; i++) {
        const char = description[i];
        const charWidth = this.getCharWidth(char);
        
        if (currentLineWidth + charWidth <= maxWidth) {
          currentLine += char;
          currentLineWidth += charWidth;
        } else {
          wrappedLines.push(currentLine);
          currentLine = char;
          currentLineWidth = charWidth;
        }
      }
      if (currentLine) {
        wrappedLines.push(currentLine);
      }

      wrappedLines.forEach((line, index) => {
        if (index < 3) { // 最多显示4行
          descriptionContainer.append('div')
            .style('margin-bottom', index < wrappedLines.length - 1 && index < 3 ? '2px' : '0')
            .style('line-height', '16px')
            .style('height', '16px')
            .style('overflow', 'hidden')
            .style('text-overflow', 'ellipsis')
            .style('white-space', 'nowrap')
            .text(line);
        }
      });
    }
    
    // 创建底部信息容器
    const bottomInfoContainer = tooltip.append('div')
      .style('display', 'flex')
      .style('justify-content', 'space-between')
      .style('align-items', 'center')
      .style('height', '30px')
      .style('padding-top', '8px')
      .style('border-top', '1px solid rgba(255, 255, 255, 0.2)');
    
    // 添加重要性（星级评分）
    const importanceContainer = bottomInfoContainer.append('div')
      .style('color', '#d1d5db')
      .style('font-size', '14px')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('gap', '4px');
    
    importanceContainer.append('span')
      .style('font-size', '11px')
      .text('Importance:');
    
    importanceContainer.append('div')
      .style('line-height', '1')
      .html(this.generateStarRating(task.importance));
    
    // 添加时间信息
    const timeInfo = this.getTimeDisplayText(task);
    const timeContainer = bottomInfoContainer.append('div')
      .style('font-size', '11px')
      .style('text-align', 'right')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('gap', '4px');

    // 添加"Due:"标签
    timeContainer.append('span')
      .style('color', '#d1d5db')
      .text('');

    // 获取时间状态和颜色
    const now = Date.now();
    const dueDate = new Date(task.dueDate);
    const timeDiff = dueDate.getTime() - now;
    const hours = timeDiff / (1000 * 60 * 60);
    
    let timeColor;
    if (timeDiff < 0) {
      // 已过期 - 红色
      timeColor = '#ef4444';
    } else if (hours <= 24) {
      // 24小时内 - 橙色
      timeColor = '#f97316';
    } else if (hours <= 72) {
      // 72小时内 - 黄色
      timeColor = '#eab308';
    } else {
      // 其他 - 绿色
      timeColor = '#22c55e';
    }

    // 添加高亮的时间信息
    timeContainer.append('span')
      .style('color', timeColor)
      .style('font-weight', 'bold')
      .text(timeInfo);
    
    // 计算tooltip位置
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 计算tooltip位置
    const pos = this.calculateTooltipPosition(x, y, tooltipWidth, tooltipHeight);
    
    // 边界检查
    let tooltipX = Math.max(10, Math.min(viewportWidth - tooltipWidth - 10, pos.x));
    let tooltipY = Math.max(10, Math.min(viewportHeight - tooltipHeight - 10, pos.y));
    
    console.log('Tooltip position:', {
      task: { x, y },
      tooltip: { x: tooltipX, y: tooltipY },
      corner: pos.corner
    });
    
    // 设置位置并显示
    tooltip
      .style('left', `${tooltipX}px`)
      .style('top', `${tooltipY}px`)
      .style('opacity', '1');
    
    this.currentTooltip = tooltip;
  }

  /**
   * 隐藏任务提示框
   */
  hideTaskTooltip() {
    if (this.currentTooltip) {
      this.currentTooltip.remove();
      this.currentTooltip = null;
    }
  }

  /**
   * 计算tooltip位置
   * @param {number} taskX - 任务圆点X坐标
   * @param {number} taskY - 任务圆点Y坐标
   * @param {number} tooltipWidth - tooltip宽度
   * @param {number} tooltipHeight - tooltip高度
   * @returns {{x: number, y: number, corner: string}} tooltip左上角坐标和使用的角
   */
  /**
   * 生成星级评分HTML
   * @param {number} importance - 重要性值(1-10)
   * @returns {string} 星级评分HTML
   */
  generateStarRating(importance) {
    // 将1-10的重要性转换为0-5的星级（支持半星）
    const starScore = (importance / 10) * 5;
    const fullStars = Math.floor(starScore);  // 整星数
    const hasHalfStar = (starScore - fullStars) >= 0.5;  // 是否有半星
    
    let stars = '';
    
    // 生成星星HTML
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        // 整星
        stars += `<span style="display: inline-block; width: 16px; text-align: center; color: #FFD700; text-shadow: 0 0 1px rgba(0,0,0,0.5);">★</span>`;
      } else if (i === fullStars && hasHalfStar) {
        // 半星，使用CSS来实现
        stars += `<span style="display: inline-block; width: 16px; text-align: center; position: relative;">
          <span style="color: rgba(255,255,255,0.3); text-shadow: 0 0 1px rgba(0,0,0,0.5);">★</span>
          <span style="position: absolute; left: 0; top: 0; width: 50%; overflow: hidden; color: #FFD700; text-shadow: 0 0 1px rgba(0,0,0,0.5);">★</span>
        </span>`;
      } else {
        // 空星
        stars += `<span style="display: inline-block; width: 16px; text-align: center; color: rgba(255,255,255,0.3); text-shadow: 0 0 1px rgba(0,0,0,0.5);">★</span>`;
      }
    }
    
    return `<div style="display: inline-flex; align-items: center;">${stars}</div>`;
  }

  calculateTooltipPosition(taskX, taskY, tooltipWidth, tooltipHeight) {
    const margin = 10; // 视窗边距
    const taskRadius = 6; // 任务圆点半径
    
    // 计算tooltip矩形的对角线长度的一半
    const tooltipDiagonal = Math.sqrt(Math.pow(tooltipWidth, 2) + Math.pow(tooltipHeight, 2)) / 2;
    
    // 计算最小安全距离：任务圆点半径 + tooltip对角线一半 + 额外边距
    const minSafeDistance = taskRadius + tooltipDiagonal + 10;
    
    // 设置固定的中心点距离，确保大于最小安全距离
    const centerDistance = Math.max(minSafeDistance, 120); // 使用120作为期望值，但确保不小于安全距离

    // 计算视窗尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 计算tooltip的中心点到边缘的距离
    const tooltipHalfWidth = tooltipWidth / 2;
    const tooltipHalfHeight = tooltipHeight / 2;

    // 生成8个候选角度（0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°）
    const angles = Array.from({ length: 8 }, (_, i) => (i * 45 * Math.PI) / 180);
    
    // 存储所有可能的位置
    const positions = angles.map(angle => {
      // 计算tooltip中心点的位置（确保使用精确的centerDistance）
      const tooltipCenterX = taskX + centerDistance * Math.cos(angle);
      const tooltipCenterY = taskY + centerDistance * Math.sin(angle);

      // 根据角度确定连接点的方向和偏移
      let side;
      let offsetX = 0, offsetY = 0;

      if (angle <= Math.PI/8 || angle > 7*Math.PI/8) {
        side = 'left';
        offsetX = tooltipWidth/2;  // 向右偏移半个宽度
      } else if (angle <= 3*Math.PI/8) {
        side = 'top-left';
        offsetX = tooltipWidth/4;  // 向右偏移1/4宽度
        offsetY = tooltipHeight/4; // 向下偏移1/4高度
      } else if (angle <= 5*Math.PI/8) {
        side = 'top';
        offsetY = tooltipHeight/2; // 向下偏移半个高度
      } else if (angle <= 7*Math.PI/8) {
        side = 'top-right';
        offsetX = -tooltipWidth/4; // 向左偏移1/4宽度
        offsetY = tooltipHeight/4; // 向下偏移1/4高度
      } else if (angle <= 9*Math.PI/8) {
        side = 'right';
        offsetX = -tooltipWidth/2; // 向左偏移半个宽度
      } else if (angle <= 11*Math.PI/8) {
        side = 'bottom-right';
        offsetX = -tooltipWidth/4; // 向左偏移1/4宽度
        offsetY = -tooltipHeight/4; // 向上偏移1/4高度
      } else if (angle <= 13*Math.PI/8) {
        side = 'bottom';
        offsetY = -tooltipHeight/2; // 向上偏移半个高度
      } else {
        side = 'bottom-left';
        offsetX = tooltipWidth/4;  // 向右偏移1/4宽度
        offsetY = -tooltipHeight/4; // 向上偏移1/4高度
      }
      
      // 计算tooltip左上角的位置（考虑偏移）
      const tooltipX = tooltipCenterX - tooltipWidth/2 + offsetX;
      const tooltipY = tooltipCenterY - tooltipHeight/2 + offsetY;

      // 计算这个位置是否在视窗内
      const isInViewport = 
        tooltipX >= margin &&
        tooltipX + tooltipWidth <= viewportWidth - margin &&
        tooltipY >= margin &&
        tooltipY + tooltipHeight <= viewportHeight - margin;

      return {
        x: tooltipX,
        y: tooltipY,
        centerX: tooltipCenterX,
        centerY: tooltipCenterY,
        angle,
        side,
        isInViewport
      };
    });

    

         // 找到第一个在视窗内的位置
     const validPosition = positions.find(pos => pos.isInViewport);
     
     if (validPosition) {

      return {
        x: validPosition.x,
        y: validPosition.y,
        corner: validPosition.side
      };
    }

         // 如果没有找到合适的位置，缩短距离重试
    const shorterDistance = centerDistance * 0.7;
    const emergencyPosition = {
      x: taskX + shorterDistance - tooltipHalfWidth,
      y: taskY - tooltipHeight - margin,
      corner: 'bottom'
    };

        return emergencyPosition;
  }
  /**
   * 获取时间显示文本
   */
  getTimeDisplayText(task) {
    // 直接调用Task模型的方法
    return task.getTimeRemainingText();
  }
}