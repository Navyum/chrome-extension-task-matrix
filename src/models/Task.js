/**
 * 任务数据模型
 */
export class Task {
  constructor(id, title, description, importance, dueDate, category, status = 'doing', coordinates = null) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.importance = importance;
    this.dueDate = dueDate;
    this.category = category;
    this.status = status; // doing, completed, rejected
    this.coordinates = coordinates;
    this.createdAt = Date.now(); // 存储时间戳
    this.updatedAt = Date.now(); // 存储时间戳
    this.completedAt = null;
  }

  /**
   * 根据重要性和紧急程度获取颜色
   */
  async getColor() {
    const isImportant = this.importance >= 5.5; // 重要性5.5级以上为重要
    const isUrgent = await this.isUrgent(); // 根据剩余时间判断紧急程度
    
    // === 添加调试日志 ===
    console.log(`[Task.getColor] 任务 "${this.title}" 颜色计算:`, {
      taskId: this.id,
      importance: this.importance,
      importanceThreshold: 5.5,
      isImportant: isImportant,
      isUrgent: isUrgent,
      dueDate: this.dueDate,
      currentTime: Date.now(),
      timeRemaining: this.getTimeRemaining(),
      timeRemainingHours: this.getTimeRemaining() / (1000 * 60 * 60)
    });
    
    let color;
    if (isImportant && isUrgent) {
      color = '#EF4444'; // 红色 - 重要且紧急 (Q1)
      console.log(`[Task.getColor] 分配颜色: ${color} (Q1: 重要且紧急)`);
    } else if (isImportant && !isUrgent) {
      color = '#10B981'; // 绿色 - 重要不紧急 (Q2)
      console.log(`[Task.getColor] 分配颜色: ${color} (Q2: 重要不紧急)`);
    } else if (!isImportant && !isUrgent) {
      color = '#9CA3AF'; // 灰色 - 不重要不紧急 (Q3)
      console.log(`[Task.getColor] 分配颜色: ${color} (Q3: 不重要不紧急)`);
    } else {
      color = '#F59E0B'; // 黄色 - 不重要紧急 (Q4)
      console.log(`[Task.getColor] 分配颜色: ${color} (Q4: 不重要紧急)`);
    }
    
    return color;
  }

  /**
   * 获取默认颜色
   */
  getDefaultColor() {
    // 根据重要性返回默认颜色
    if (this.importance >= 8) {
      return '#EF4444'; // 红色 - 非常重要
    } else if (this.importance >= 6) {
      return '#F59E0B'; // 橙色 - 重要
    } else if (this.importance >= 4) {
      return '#3B82F6'; // 蓝色 - 中等
    } else {
      return '#9CA3AF'; // 灰色 - 不重要
    }
  }

  /**
   * 判断任务是否紧急
   */
  async isUrgent() {
    // 如果任务已经完成或拒绝，不算紧急
    if (this.status === 'completed' || this.status === 'rejected') return false;
    
    const remaining = this.getTimeRemaining();
    const hours = remaining / (1000 * 60 * 60);
    
    // 从设置中获取紧急时间阈值，默认为24小时
    const urgentThreshold = await this.getUrgentThreshold();
    return hours <= urgentThreshold;
  }

  /**
   * 获取紧急时间阈值（小时）
   */
  async getUrgentThreshold() {
    // 从Chrome Storage获取设置，默认为24小时
    try {
      const result = await chrome.storage.local.get(['settings']);
      return result.settings?.urgentThreshold || 24;
    } catch (error) {
      return 24; // 默认24小时
    }
  }

  /**
   * 标记为完成
   */
  markAsCompleted() {
    this.status = 'completed';
    this.completedAt = Date.now(); // 存储时间戳
    this.updatedAt = Date.now(); // 存储时间戳
  }

  /**
   * 标记为拒绝
   */
  markAsRejected() {
    this.status = 'rejected';
    this.updatedAt = Date.now(); // 存储时间戳
  }

  /**
   * 标记为取消
   */
  markAsCancelled() {
    this.status = 'cancelled';
    this.updatedAt = Date.now(); // 存储时间戳
  }

  /**
   * 更新任务信息
   */
  update(updates) {
    Object.assign(this, updates);
    this.updatedAt = Date.now(); // 存储时间戳
  }

  /**
   * 更新任务的颜色，主要用于异步计算颜色后设置
   */
  async updateColor() {
    this.color = await this.getColor();
  }

  /**
   * 检查是否超期
   */
  isOverdue() {
    // 如果任务已经完成或拒绝，不算超期
    if (this.status === 'completed' || this.status === 'rejected') return false;
    return this.dueDate < Date.now(); // 直接比较时间戳
  }

  /**
   * 获取剩余时间（毫秒）
   */
  getTimeRemaining() {
    return this.dueDate - Date.now(); // 直接比较时间戳
  }

  /**
   * 获取剩余时间（小时）
   */
  getHoursUntilDue() {
    const remaining = this.getTimeRemaining();
    return remaining / (1000 * 60 * 60);
  }

  /**
   * 获取剩余时间描述
   */
  getTimeRemainingText() {
    // 确保dueDate是有效的时间戳
    if (typeof this.dueDate !== 'number' || isNaN(this.dueDate)) {
      console.warn('Invalid or missing dueDate timestamp for task:', this.id, this.title);
      // === 新增调试日志 ===
      console.error('DEBUG: Invalid dueDate detected!', {
        taskId: this.id,
        taskTitle: this.title,
        dueDateValue: this.dueDate,
        dueDateType: typeof this.dueDate,
        isNaNResult: isNaN(this.dueDate)
      });
      // ====================
      return 'Invalid due date';
    }
    
    const remaining = this.getTimeRemaining(); // 毫秒
    
    // 处理超期任务
    if (remaining < 0) {
      const overdueMs = Math.abs(remaining);
      const overdueMinutes = Math.floor(overdueMs / (1000 * 60));
      const overdueHours = Math.floor(overdueMinutes / 60);
      const overdueDays = Math.floor(overdueHours / 24);
      
      if (overdueDays >= 1) {
        // 超期大于1天，显示具体超期日期
        const overdueDate = new Date(this.dueDate);
        return `Overdue ${overdueDate.toLocaleDateString()}`;
      } else if (overdueHours >= 1) {
        // 超期1小时到1天，显示小时和分钟
        const minutes = overdueMinutes % 60;
        return `Overdue ${overdueHours}h ${minutes}m`;
      } else {
        // 超期不到1小时，显示分钟
        return `Overdue ${overdueMinutes}m`;
      }
    }
    
    // 处理未超期任务
    const totalMinutes = Math.floor(remaining / (1000 * 60));
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    if (days >= 1) {
      // 剩余大于1天，显示具体到期日期
      const dueDate = new Date(this.dueDate);
      return `Due at ${dueDate.toLocaleDateString()}`;
    } else if (hours >= 1) {
      // 剩余1小时到1天，显示小时和分钟
      return `Due in ${hours}h ${minutes}m`;
    } else {
      // 剩余不到1小时，显示分钟
      return `Due in ${minutes}m`;
    }
  }

  /**
   * 转换为普通对象
   */
  toObject() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      importance: this.importance,
      dueDate: this.dueDate,
      category: this.category,
      color: this.color,
      status: this.status,
      coordinates: this.coordinates,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt
    };
  }

  /**
   * 从对象创建任务实例
   */
  static fromObject(obj) {
    const task = new Task(
      obj.id,
      obj.title,
      obj.description,
      obj.importance,
      obj.dueDate,
      obj.category,
      obj.status,
      obj.coordinates
    );
    
    // === 添加调试日志 ===
    console.log(`[Task.fromObject] 从存储恢复任务 "${obj.title}":`, {
      taskId: obj.id,
      storedColor: obj.color,
      importance: obj.importance,
      dueDate: obj.dueDate,
      currentTime: Date.now(),
      timeRemaining: task.getTimeRemaining(),
      timeRemainingHours: task.getTimeRemaining() / (1000 * 60 * 60)
    });
    
    // 设置颜色
    task.color = obj.color;
    
    // === 检查颜色是否需要更新 ===
    const shouldUpdateColor = async () => {
      const currentColor = await task.getColor();
      if (currentColor !== obj.color) {
        console.log(`[Task.fromObject] 颜色需要更新: 存储=${obj.color} -> 当前=${currentColor}`);
        task.color = currentColor;
      } else {
        console.log(`[Task.fromObject] 颜色无需更新: ${obj.color}`);
      }
    };
    
    // 异步更新颜色
    shouldUpdateColor();
    
    // 设置时间
    task.createdAt = obj.createdAt; // obj.createdAt 应为时间戳
    task.updatedAt = obj.updatedAt; // obj.updatedAt 应为时间戳
    task.completedAt = obj.completedAt || null; // obj.completedAt 应为时间戳或null
    
    return task;
  }
} 