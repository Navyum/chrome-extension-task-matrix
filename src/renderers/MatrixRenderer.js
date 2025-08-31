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
    
    // X轴映射：使用新的分钟级精度时间坐标映射
    let x;
    if (hours <= 0) {
      // 已超期：使用新的超期时间计算逻辑
      x = this.getXCoordinateFromTime(hours);
    } else {
      // 使用新的时间坐标映射（支持分钟级精度）
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
    x = Math.max(margin - 20, Math.min(this.width - margin + 20, x)); // 允许超期和超远期任务超出边界
    y = Math.max(margin, Math.min(this.height - margin, y));
    
    // 调试信息
    console.log(`=== Task "${task.title}" Coordinates ===`);
    console.log(`Task Details:`, {
      title: task.title,
      importance: importance,
      dueDate: task.dueDate,
      hoursLeft: hours,
      minutesLeft: hours * 60,
      status: task.status,
      coordinates: task.coordinates
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
      minutes: hours * 60,
      isOverdue: hours <= 0,
      isUrgent: hours <= 24, // 24小时内为紧急
      isVeryUrgent: hours <= 1, // 1小时内为非常紧急
      xCoordinate: x,
      xPosition: x < (this.width / 2) ? 'left' : 'right'
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
    
    // 定义右侧区域的刻度点（紧急区域：0-24小时）
    const rightTicks = [
      { label: 'Now', hours: 0, x: this.width - margin },                    // 当前时间（最右侧）
      { label: '30m', hours: 0.5, x: centerX + (0.8 * rightHalf) },         // 30分钟后
      { label: '1h', hours: 1, x: centerX + (0.6 * rightHalf) },            // 1小时后
      { label: '4h', hours: 4, x: centerX + (0.4 * rightHalf) },            // 4小时后
      { label: '12h', hours: 12, x: centerX + (0.2 * rightHalf) },          // 12小时后
      { label: '24h', hours: 24, x: centerX }                               // 24小时后（中心点）
    ];
    
    // 定义左侧区域的刻度点（非紧急区域：24小时-31天）
    const leftTicks = [
      { label: '24h', hours: 24, x: centerX },                         // 24小时后（中心点）
      { label: '3d', hours: 72, x: centerX - (0.25 * leftHalf) },      // 3天后
      { label: '7d', hours: 168, x: centerX - (0.5 * leftHalf) },      // 7天后
      { label: '14d', hours: 336, x: centerX - (0.75 * leftHalf) },    // 14天后
      { label: '31d', hours: 744, x: margin }                          // 31天后（最左侧）
    ];
    
    // 绘制右侧刻度标签（紧急区域，更密集）
    rightTicks.forEach(tick => {
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
    
    // 绘制左侧刻度标签（非紧急区域）
    leftTicks.forEach(tick => {
      // 跳过24h，因为右侧已经绘制了
      if (tick.hours === 24) return;
      
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
   * 根据时间（小时）计算X坐标
   */
  getXCoordinateFromTime(hours) {
    const margin = 30;
    const centerX = this.width / 2;
    const xAxisWidth = this.width - 2 * margin;
    const rightHalf = xAxisWidth / 2;
    const leftHalf = xAxisWidth / 2;
    
    // 重新定义时间轴逻辑：
    // 最右侧（Now）：当前时间（0小时）
    // 中心点：24小时后
    // 最左侧：远期时间（31天后）
    
    // 添加边界容差，确保一致性
    const boundaryTolerance = 0.5; // 0.5小时的容差
    
    // 判断是否在右侧（紧急区域：0-24小时）
    if (hours >= 0 && hours <= 24 + boundaryTolerance) {
      // 右侧区域：使用线性插值进行分钟级精确计算
      return this.getXCoordinateFromRightSideTime(hours, centerX, rightHalf, margin);
    } else if (hours > 24 + boundaryTolerance) {
      // 左侧区域：使用原有的刻度点逻辑
      return this.getXCoordinateFromLeftSideTime(hours, centerX, leftHalf, margin);
    } else {
      // 超期任务（hours < 0）：最右侧
      return this.width - margin;
    }
  }

  /**
   * 右侧区域（紧急区域）的精确X坐标计算
   */
  getXCoordinateFromRightSideTime(hours, centerX, rightHalf, margin) {
    // 重新定义右侧区域的刻度点
    // 时间范围：0小时（Now）到24小时（中心点）
    const rightTicks = [
      { label: 'Now', hours: 0, x: this.width - margin },                    // 当前时间（最右侧）
      { label: '30m', hours: 0.5, x: centerX + (0.8 * rightHalf) },         // 30分钟后
      { label: '1h', hours: 1, x: centerX + (0.6 * rightHalf) },            // 1小时后
      { label: '4h', hours: 4, x: centerX + (0.4 * rightHalf) },            // 4小时后
      { label: '12h', hours: 12, x: centerX + (0.2 * rightHalf) },          // 12小时后
      { label: '24h', hours: 24, x: centerX }                               // 24小时后（中心点）
    ];
    
    // 找到时间所在的区间
    let startTick = rightTicks[0];
    let endTick = rightTicks[0];
    
    for (let i = 0; i < rightTicks.length - 1; i++) {
      if (hours >= rightTicks[i].hours && hours <= rightTicks[i + 1].hours) {
        startTick = rightTicks[i];
        endTick = rightTicks[i + 1];
        break;
      }
    }
    
    // 计算线性插值
    const totalTimeRange = endTick.hours - startTick.hours;
    const currentTimeOffset = hours - startTick.hours;
    const ratio = totalTimeRange > 0 ? currentTimeOffset / totalTimeRange : 0;
    
    // 计算X坐标插值
    const startX = startTick.x;
    const endX = endTick.x;
    const interpolatedX = startX + (endX - startX) * ratio;
    
    console.log(`=== 右侧时间X坐标计算（精确模式）===`);
    console.log(`目标时间: ${hours.toFixed(2)}小时`);
    console.log(`区间: ${startTick.label} (${startTick.hours}h) - ${endTick.label} (${endTick.hours}h)`);
    console.log(`插值比例: ${(ratio * 100).toFixed(1)}%`);
    console.log(`X坐标插值: ${startX} + ${((endX - startX) * ratio).toFixed(1)} = ${interpolatedX.toFixed(1)}`);
    console.log(`=====================================`);
    
    return interpolatedX;
  }

  /**
   * 左侧区域（非紧急区域）的X坐标计算
   */
  getXCoordinateFromLeftSideTime(hours, centerX, leftHalf, margin) {
    // 定义左侧区域的刻度点
    // 时间范围：24小时（中心点）到31天（最左侧）
    const leftTicks = [
      { label: '24h', hours: 24, x: centerX },                         // 24小时后（中心点）
      { label: '3d', hours: 72, x: centerX - (0.25 * leftHalf) },      // 3天后
      { label: '7d', hours: 168, x: centerX - (0.5 * leftHalf) },      // 7天后
      { label: '14d', hours: 336, x: centerX - (0.75 * leftHalf) },    // 14天后
      { label: '31d', hours: 744, x: margin }                          // 31天后（最左侧）
    ];
    
    // 处理超过31天的任务
    if (hours > 744) {
      const extraHours = hours - 744;
      const maxExtraHours = 744; // 额外显示30天
      const extraRatio = Math.min(1, extraHours / maxExtraHours);
      const x = margin - (extraRatio * 20); // 在左边界基础上再向左延伸20px
      
      console.log(`=== 超远期任务X坐标计算 ===`);
      console.log(`超远期时间: ${extraHours.toFixed(2)}小时`);
      console.log(`超远期比例: ${(extraRatio * 100).toFixed(1)}%`);
      console.log(`X坐标: ${x.toFixed(1)}`);
      console.log(`=====================`);
      
      return x;
    }
    
    // 找到时间所在的区间
    let startTick = leftTicks[0];
    let endTick = leftTicks[0];
    
    for (let i = 0; i < leftTicks.length - 1; i++) {
      if (hours >= leftTicks[i].hours && hours <= leftTicks[i + 1].hours) {
        startTick = leftTicks[i];
        endTick = leftTicks[i + 1];
        break;
      }
    }
    
    // 如果没找到区间，使用最近点
    if (startTick === endTick) {
    let minDistance = Infinity;
      let closestTick = leftTicks[0];
    
      for (const tick of leftTicks) {
        const distance = Math.abs(hours - tick.hours);
      if (distance < minDistance) {
        minDistance = distance;
        closestTick = tick;
      }
    }
    
      console.log(`=== 左侧时间X坐标计算（最近点）===`);
      console.log(`目标时间: ${hours.toFixed(2)}小时`);
      console.log(`最近刻度: ${closestTick.label} (${closestTick.hours}h)`);
      console.log(`X坐标: ${closestTick.x}`);
      console.log(`=====================`);
      
      return closestTick.x;
    }
    
    // 计算线性插值
    const totalTimeRange = endTick.hours - startTick.hours;
    const currentTimeOffset = hours - startTick.hours;
    const ratio = totalTimeRange > 0 ? currentTimeOffset / totalTimeRange : 0;
    
    // 计算X坐标插值
    const startX = startTick.x;
    const endX = endTick.x;
    const interpolatedX = startX + (endX - startX) * ratio;
    
    console.log(`=== 左侧时间X坐标计算（插值模式）===`);
    console.log(`目标时间: ${hours.toFixed(2)}小时`);
    console.log(`区间: ${startTick.label} (${startTick.hours}h) - ${endTick.label} (${endTick.hours}h)`);
    console.log(`插值比例: ${(ratio * 100).toFixed(1)}%`);
    console.log(`X坐标插值: ${startX} + ${((endX - startX) * ratio).toFixed(1)} = ${interpolatedX.toFixed(1)}`);
    console.log(`=====================`);
    
    return interpolatedX;
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
    
    // 重新定义时间轴逻辑：
    // 最右侧（Now）：当前时间（0小时）
    // 中心点：24小时后
    // 最左侧：远期时间（31天后）
    
    // 添加边界容差，避免在中心点附近跳变
    const boundaryTolerance = 2; // 2px的容差
    
    // 判断是否在右侧（紧急区域）
    if (x >= centerX - boundaryTolerance) {
      // 右侧区域：使用线性插值进行分钟级精确计算
      return this.getTimeFromRightSideCoordinate(x, centerX, rightHalf, margin);
    } else {
      // 左侧区域：使用原有的刻度点逻辑
      return this.getTimeFromLeftSideCoordinate(x, centerX, leftHalf, margin);
    }
  }

  /**
   * 右侧区域（紧急区域）的精确时间计算
   */
  getTimeFromRightSideCoordinate(x, centerX, rightHalf, margin) {
    // 定义右侧区域的刻度点
    // 时间范围：0小时（Now）到24小时（中心点）
    const rightTicks = [
      { label: 'Now', hours: 0, x: this.width - margin },                    // 当前时间（最右侧）
      { label: '30m', hours: 0.5, x: centerX + (0.8 * rightHalf) },         // 30分钟后
      { label: '1h', hours: 1, x: centerX + (0.6 * rightHalf) },            // 1小时后
      { label: '4h', hours: 4, x: centerX + (0.4 * rightHalf) },            // 4小时后
      { label: '12h', hours: 12, x: centerX + (0.2 * rightHalf) },          // 12小时后
      { label: '24h', hours: 24, x: centerX }                               // 24小时后（中心点）
    ];
    
    // 找到X坐标所在的区间
    let startTick = rightTicks[0];
    let endTick = rightTicks[0];
    let foundInterval = false;
    
    // 修复区间判断逻辑：X坐标从右到左递减，时间从右到左递增
    for (let i = 0; i < rightTicks.length - 1; i++) {
      // 检查X坐标是否在当前区间内
      // 注意：X坐标从右到左递减，所以需要反向比较
      if (x <= rightTicks[i].x && x >= rightTicks[i + 1].x) {
        startTick = rightTicks[i];
        endTick = rightTicks[i + 1];
        foundInterval = true;
        break;
      }
    }
    
    // 如果没找到区间，使用最近点
    if (!foundInterval) {
      let minDistance = Infinity;
      let closestTick = rightTicks[0];
      
      for (const tick of rightTicks) {
        const distance = Math.abs(x - tick.x);
        if (distance < minDistance) {
          minDistance = distance;
          closestTick = tick;
        }
      }
      
      console.log(`=== 右侧X坐标时间计算（最近点）===`);
      console.log(`X坐标: ${x}`);
      console.log(`中心点: ${centerX}`);
      console.log(`最近刻度: ${closestTick.label} (${closestTick.hours}h)`);
      console.log(`=====================`);
      
      return closestTick.hours;
    }
    
    // 计算线性插值
    const totalDistance = startTick.x - endTick.x; // 注意：从右到左
    const currentDistance = startTick.x - x; // 从右到左的距离
    const ratio = totalDistance > 0 ? currentDistance / totalDistance : 0;
    
    // 计算时间插值（分钟级精度）
    const startHours = startTick.hours;
    const endHours = endTick.hours;
    const interpolatedHours = startHours + (endHours - startHours) * ratio;
    
    console.log(`=== 右侧X坐标时间计算（精确模式）===`);
    console.log(`X坐标: ${x}`);
    console.log(`中心点: ${centerX}`);
    console.log(`区间: ${startTick.label} (${startTick.x}) - ${endTick.label} (${endTick.x})`);
    console.log(`插值比例: ${(ratio * 100).toFixed(1)}%`);
    console.log(`时间插值: ${startHours}h + ${((endHours - startHours) * ratio).toFixed(2)}h = ${interpolatedHours.toFixed(2)}h`);
    console.log(`=====================================`);
    
    return Math.max(0, interpolatedHours);
  }

  /**
   * 左侧区域（非紧急区域）的时间计算
   */
  getTimeFromLeftSideCoordinate(x, centerX, leftHalf, margin) {
    // 定义左侧区域的刻度点
    // 时间范围：24小时（中心点）到31天（最左侧）
    const leftTicks = [
      { label: '24h', hours: 24, x: centerX },                         // 24小时后（中心点）
      { label: '3d', hours: 72, x: centerX - (0.25 * leftHalf) },      // 3天后
      { label: '7d', hours: 168, x: centerX - (0.5 * leftHalf) },      // 7天后
      { label: '14d', hours: 336, x: centerX - (0.75 * leftHalf) },    // 14天后
      { label: '31d', hours: 744, x: margin }                          // 31天后（最左侧）
    ];
    
    // 找到最近的刻度点
    let minDistance = Infinity;
    let closestTick = leftTicks[0];
    
    for (const tick of leftTicks) {
      const distance = Math.abs(x - tick.x);
      if (distance < minDistance) {
        minDistance = distance;
        closestTick = tick;
      }
    }
    
    // 计算线性插值
    let startTick = leftTicks[0];
    let endTick = leftTicks[0];
    
    for (let i = 0; i < leftTicks.length - 1; i++) {
      if (x >= leftTicks[i + 1].x && x <= leftTicks[i].x) {
        startTick = leftTicks[i + 1];
        endTick = leftTicks[i];
        break;
      }
    }
    
    // 如果没找到区间，使用最近点
    if (startTick === endTick) {
      console.log(`=== 左侧X坐标时间计算（最近点）===`);
      console.log(`X坐标: ${x}`);
      console.log(`最近刻度: ${closestTick.label} (${closestTick.hours}h)`);
    console.log(`=====================`);
    
      return closestTick.hours;
    }
    
    // 计算线性插值
    const totalDistance = endTick.x - startTick.x;
    const currentDistance = x - startTick.x;
    const ratio = totalDistance > 0 ? currentDistance / totalDistance : 0;
    
    // 计算时间插值
    const startHours = startTick.hours;
    const endHours = endTick.hours;
    const interpolatedHours = startHours + (endHours - startHours) * ratio;
    
    console.log(`=== 左侧X坐标时间计算（插值模式）===`);
    console.log(`X坐标: ${x}`);
    console.log(`区间: ${startTick.label} (${startTick.x}) - ${endTick.label} (${endTick.x})`);
    console.log(`插值比例: ${(ratio * 100).toFixed(1)}%`);
    console.log(`时间插值: ${startHours}h + ${((endHours - startHours) * ratio).toFixed(2)}h = ${interpolatedHours.toFixed(2)}h`);
    console.log(`=====================`);
    
    return interpolatedHours;
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
      
      console.log('Original description:', `