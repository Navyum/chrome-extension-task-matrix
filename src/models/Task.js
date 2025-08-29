/**
 * 任务数据模型
 */
export class Task {
  constructor(id, title, description, importance, dueDate, category, status = 'pending', coordinates = null) {
    this.id = id;
    this.title = title;
    this.description = description || '';
    this.importance = importance; // 0-5级
    this.dueDate = dueDate;
    this.category = category || 'default';
    this.status = status; // pending, completed, cancelled
    this.coordinates = coordinates; // 任务在矩阵中的坐标位置
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.completedAt = null;
  }

  /**
   * 根据重要性和紧急程度获取颜色
   */
  async getColor() {
    const isImportant = this.importance >= 5; // 重要性5级以上为重要
    const isUrgent = await this.isUrgent(); // 根据剩余时间判断紧急程度
    
    if (isImportant && isUrgent) {
      return '#EF4444'; // 红色 - 重要且紧急
    } else if (isImportant && !isUrgent) {
      return '#10B981'; // 黄色 - 重要不紧急
    } else if (!isImportant && isUrgent) {
      return '#F59E0B'; // 绿色 - 不重要紧急
    } else {
      return '#9CA3AF'; // 灰色 - 不重要不紧急
    }
  }

  /**
   * 判断任务是否紧急
   */
  async isUrgent() {
    if (this.status === 'completed') return false;
    
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
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * 标记为取消
   */
  markAsCancelled() {
    this.status = 'cancelled';
    this.updatedAt = new Date();
  }

  /**
   * 更新任务信息
   */
  update(updates) {
    Object.assign(this, updates);
    this.updatedAt = new Date();
  }

  /**
   * 检查是否超期
   */
  isOverdue() {
    if (this.status === 'completed') return false;
    return new Date(this.dueDate) < new Date();
  }

  /**
   * 获取剩余时间（毫秒）
   */
  getTimeRemaining() {
    const now = new Date();
    const due = new Date(this.dueDate);
    return due - now;
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
    const remaining = this.getTimeRemaining();
    
    if (remaining < 0) {
      // 超期：根据超期时间长度显示不同格式
      const overdueMs = Math.abs(remaining);
      const overdueHours = overdueMs / (1000 * 60 * 60);
      const overdueMinutes = overdueMs / (1000 * 60);
      
      if (overdueHours < 1) {
        // 超期不到1小时：显示分钟
        const minutes = Math.ceil(overdueMinutes);
        return `Overdue ${minutes}m`;
      } else if (overdueHours < 24) {
        // 超期1-24小时：显示小时和分钟
        const wholeHours = Math.floor(overdueHours);
        const minutes = Math.ceil((overdueHours - wholeHours) * 60);
        if (minutes === 60) {
          return `Overdue ${wholeHours + 1}h`;
        } else {
          return `Overdue ${wholeHours}h ${minutes}m`;
        }
      } else {
        // 超期超过1天：显示天数
        const days = Math.ceil(overdueHours / 24);
        return `Overdue ${days} day${days > 1 ? 's' : ''}`;
      }
    }

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      // 超过1天：显示具体日期
      const dueDate = new Date(this.dueDate);
      return `Due ${dueDate.toLocaleDateString()}`;
    } else if (hours > 0) {
      // 1-24小时：显示小时和分钟
      return `${hours}h ${minutes}m left`;
    } else {
      // 不到1小时：只显示分钟
      return `${minutes}m left`;
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
      obj.color,
      obj.status,
      obj.coordinates
    );
    
    task.createdAt = new Date(obj.createdAt);
    task.updatedAt = new Date(obj.updatedAt);
    task.completedAt = obj.completedAt ? new Date(obj.completedAt) : null;
    
    return task;
  }
} 