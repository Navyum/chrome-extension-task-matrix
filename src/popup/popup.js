/**
 * 弹窗页面主要逻辑
 */
import './popup.css';
import { StorageManager } from '../services/StorageManager.js';
import { TaskManager } from '../services/TaskManager.js';
import { MatrixManager } from '../services/MatrixManager.js';
import { MatrixRenderer } from '../renderers/MatrixRenderer.js';
import { showNotification, confirmDialog, debounce } from '../utils/helpers.js';

class PopupApp {
  constructor() {
    this.storageManager = new StorageManager();
    this.taskManager = new TaskManager(this.storageManager);
    this.matrixManager = new MatrixManager(this.taskManager);
    this.matrixRenderer = null;
    

    
    this.init();
  }

  /**
   * 初始化应用
   */
  async init() {
    try {
      // 初始化矩阵渲染器
      this.initMatrixRenderer();
      
      // 绑定事件
      this.bindEvents();
      
      // 加载数据
      await this.loadData();
      
      // 启动矩阵自动更新
      this.matrixManager.startAutoUpdate();
      
      // 启动时间更新
      this.startTimeUpdate();
      
      // 更新状态
      this.updateStatus('Ready');
      
    } catch (error) {
      console.error('初始化失败:', error);
      this.updateStatus('Initialization Failed');
    }
  }

  /**
   * 初始化矩阵渲染器
   */
  initMatrixRenderer() {
    const container = document.getElementById('matrixContainer');
    if (container) {
      this.matrixRenderer = new MatrixRenderer(container);
      
      // 设置任务双击回调
      this.matrixRenderer.onTaskDoubleClick((task) => {
        this.editTask(task);
      });

      // 设置背景双击回调
      this.matrixRenderer.onBackgroundDoubleClick((coordinates, quadrantKey) => {
        this.createTaskAtPosition(coordinates, quadrantKey);
      });
      
      // 监听窗口大小变化
      window.addEventListener('resize', debounce(() => {
        this.matrixRenderer.resize();
      }, 250));
    }
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 添加任务按钮
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
      addTaskBtn.addEventListener('click', () => {
        this.showAddTaskModal();
      });
    }

    // 任务管理按钮
    const taskManagerBtn = document.getElementById('taskManagerBtn');
    if (taskManagerBtn) {
      taskManagerBtn.addEventListener('click', () => {
        this.showTaskManagerModal();
      });
    }



    // 设置按钮
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.showSettingsModal();
      });
    }

    // 帮助按钮
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        this.showHelpModal();
      });
    }

    // 任务表单
    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
      taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveTask();
      });
    }

    // 模态框关闭
    const closeModalBtns = document.querySelectorAll('.modal-close, #cancelTask, #cancelSettings');
    closeModalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeModal();
      });
    });

    // 任务管理模态框关闭
    const closeTaskManagerModal = document.getElementById('closeTaskManagerModal');
    if (closeTaskManagerModal) {
      closeTaskManagerModal.addEventListener('click', () => {
        this.closeTaskManagerModal();
      });
    }

    // 设置模态框关闭
    const closeSettingsModal = document.getElementById('closeSettingsModal');
    if (closeSettingsModal) {
      closeSettingsModal.addEventListener('click', () => {
        this.closeSettingsModal();
      });
    }

    // 任务管理过滤器
    const taskManagerFilterBtns = document.querySelectorAll('#taskManagerModal .filter-btn');
    taskManagerFilterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setTaskManagerFilter(e.target.dataset.filter);
      });
    });

    // 任务搜索
    const taskSearch = document.getElementById('taskSearch');
    if (taskSearch) {
      taskSearch.addEventListener('input', debounce((e) => {
        this.searchTasks(e.target.value);
      }, 300));
    }

    // 设置表单
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSettings();
      });
    }

    // 重要性选择器
    const importanceBtns = document.querySelectorAll('.importance-btn');
    importanceBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectImportance(parseInt(e.target.dataset.importance));
      });
    });



    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      this.handleKeyboard(e);
    });

    // 点击模态框外部关闭
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
    });

    // 点击外部关闭更多菜单
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.task-more-menu') && !e.target.closest('.task-action-btn.more')) {
        document.querySelectorAll('.task-more-menu.show').forEach(menu => {
          menu.classList.remove('show');
        });
      }
    });
  }

  /**
   * 加载数据
   */
  async loadData() {
    try {
      this.updateStatus('加载中...');
      
      // 更新矩阵
      await this.matrixManager.updateMatrix();
      
      // 更新统计信息
      await this.updateStatistics();
      
      // 渲染矩阵
      await this.renderMatrix();
      
    } catch (error) {
      console.error('加载数据失败:', error);
      showNotification('加载数据失败', 'error');
    }
  }



  /**
   * 渲染矩阵
   */
  async renderMatrix() {
    if (this.matrixRenderer) {
      const matrix = this.matrixManager.getMatrix();
      await this.matrixRenderer.updateMatrix(matrix);
    }
  }

  /**
   * 更新统计信息
   */
  async updateStatistics() {
    try {
      const stats = await this.taskManager.getTaskStats();
      // 统计信息现在在任务管理页面显示，这里只记录日志
      console.log('任务统计:', stats);
    } catch (error) {
      console.error('更新统计信息失败:', error);
    }
  }



  /**
   * 显示添加任务模态框
   */
  showAddTaskModal() {
    this.selectedTask = null;
    this.resetTaskForm();
    this.showModal('taskModal');
    document.getElementById('modalTitle').textContent = 'Add New Task';
    
    // 隐藏编辑模式特有的元素
    document.getElementById('taskStatusValue').style.display = 'none';
    document.getElementById('taskStatusGroup').style.display = 'none';
    document.getElementById('deleteTaskBtn').style.display = 'none';
  }

  /**
   * 编辑任务
   */
  editTask(task) {
    this.selectedTask = task;
    this.fillTaskForm(task);
    this.showModal('taskModal');
    document.getElementById('modalTitle').textContent = 'Edit Task';
    
    // 显示编辑模式特有的元素
    this.showEditModeElements(task);
  }

  /**
   * 在指定位置创建任务
   */
  createTaskAtPosition(coordinates, quadrantKey) {
    this.selectedTask = null;
    this.resetTaskForm();
    
    // 根据象限和坐标位置设置默认值
    const { defaultImportance, defaultTime } = this.calculateDefaultsFromPosition(coordinates, quadrantKey);
    
    // 设置默认重要性
    this.selectImportance(defaultImportance);
    
    // 设置默认时间
    const defaultDate = new Date();
    defaultDate.setTime(defaultDate.getTime() + defaultTime);
    
    document.getElementById('taskDueDate').value = defaultDate.toISOString().split('T')[0];
    document.getElementById('taskDueTime').value = defaultDate.toTimeString().slice(0, 5);
    
    // 存储坐标信息用于任务定位
    this.pendingCoordinates = coordinates && coordinates.x !== undefined && coordinates.y !== undefined ? coordinates : null;
    this.pendingQuadrantKey = quadrantKey;
    this.originalDefaults = { importance: defaultImportance, time: defaultTime };
    
    this.showModal('taskModal');
    document.getElementById('modalTitle').textContent = 'Add New Task';
    
    // 添加位置变化提示
    this.addPositionChangeWarning();
  }

  /**
   * 重置任务表单
   */
  resetTaskForm() {
    const form = document.getElementById('taskForm');
    if (form) {
      form.reset();
      
      // 设置默认日期和时间
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      document.getElementById('taskDueDate').value = tomorrow.toISOString().split('T')[0];
      document.getElementById('taskDueTime').value = '09:00';
      
      // 重置选择器
      this.selectImportance(5);
    }
  }

  /**
   * 填充任务表单
   */
  fillTaskForm(task) {
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description;
    document.getElementById('taskCategory').value = task.category;
    
    const dueDate = new Date(task.dueDate);
    document.getElementById('taskDueDate').value = dueDate.toISOString().split('T')[0];
    document.getElementById('taskDueTime').value = dueDate.toTimeString().slice(0, 5);
    
    this.selectImportance(task.importance);
  }

  /**
   * 选择重要性
   */
  selectImportance(importance) {
    document.querySelectorAll('.importance-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    document.querySelector(`[data-importance="${importance}"]`).classList.add('selected');
  }

  /**
   * 根据位置计算默认值
   */
  calculateDefaultsFromPosition(coordinates, quadrantKey) {
    let defaultImportance = 5;
    let defaultTime = 24 * 60 * 60 * 1000; // 默认24小时
    
    // 根据坐标位置计算默认值
    if (coordinates && coordinates.x !== undefined && coordinates.y !== undefined) {
      // 根据X坐标位置计算默认时间
      const hours = this.matrixRenderer.getTimeFromXCoordinate(coordinates.x);
      defaultTime = hours * 60 * 60 * 1000; // 转换为毫秒
      
      // 根据Y坐标位置计算默认重要性
      const margin = 30;
      const yAxisHeight = this.matrixRenderer.height - 2 * margin;
      const relativeY = (coordinates.y - margin) / yAxisHeight; // 0-1
      
      // 反向计算重要性：Y坐标越小（越靠上）→ 重要性越高
      // relativeY = 0 (顶部) → importance = 10
      // relativeY = 1 (底部) → importance = 1
      const relativeImportance = 1 - relativeY; // 0-1
      defaultImportance = Math.round(1 + (relativeImportance * 9)); // 1-10
      
      console.log(`=== 双击位置计算默认值 ===`);
      console.log(`Y坐标: ${coordinates.y}`);
      console.log(`Y轴高度: ${yAxisHeight}`);
      console.log(`相对Y位置: ${relativeY.toFixed(3)}`);
      console.log(`相对重要性: ${relativeImportance.toFixed(3)}`);
      console.log(`计算的重要性: ${defaultImportance}`);
      console.log(`计算的时间: ${hours}小时`);
      console.log(`========================`);
    } else {
      // 如果没有坐标，根据象限设置默认值
      if (quadrantKey === 'q1' || quadrantKey === 'q2') {
        defaultImportance = 8; // 重要象限
      } else {
        defaultImportance = 3; // 不重要象限
      }
      
      switch (quadrantKey) {
        case 'q1': // 重要且紧急 - 1小时内
          defaultTime = 1 * 60 * 60 * 1000;
          break;
        case 'q2': // 重要不紧急 - 7天
          defaultTime = 7 * 24 * 60 * 60 * 1000;
          break;
        case 'q3': // 紧急不重要 - 6小时内
          defaultTime = 6 * 60 * 60 * 1000;
          break;
        case 'q4': // 不重要不紧急 - 30天
          defaultTime = 30 * 24 * 60 * 60 * 1000;
          break;
      }
    }
    
    return { defaultImportance, defaultTime };
  }

  /**
   * 添加位置变化警告
   */
  addPositionChangeWarning() {
    // 移除现有的警告
    this.removePositionChangeWarning();
    
    // 创建警告元素
    const warning = document.createElement('div');
    warning.id = 'positionWarning';
    warning.className = 'position-warning';
    warning.innerHTML = `
      <div class="warning-content">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6m0 0v6"/>
        </svg>
        <span>Task position will change if you modify importance or due time</span>
      </div>
    `;
    
    // 插入到表单顶部
    const form = document.getElementById('taskForm');
    form.insertBefore(warning, form.firstChild);
    
    // 添加事件监听器
    this.addFormChangeListeners();
  }

  /**
   * 移除位置变化警告
   */
  removePositionChangeWarning() {
    const warning = document.getElementById('positionWarning');
    if (warning) {
      warning.remove();
    }
  }

  /**
   * 添加表单变化监听器
   */
  addFormChangeListeners() {
    // 重要性按钮变化监听
    document.querySelectorAll('.importance-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.checkPositionChange();
      });
    });
    
    // 日期时间变化监听
    document.getElementById('taskDueDate').addEventListener('change', () => {
      this.checkPositionChange();
    });
    
    document.getElementById('taskDueTime').addEventListener('change', () => {
      this.checkPositionChange();
    });
  }

  /**
   * 检查位置是否发生变化
   */
  checkPositionChange() {
    if (!this.originalDefaults) return;
    
    const currentImportance = parseInt(document.querySelector('.importance-btn.selected').dataset.importance);
    const currentDate = document.getElementById('taskDueDate').value;
    const currentTime = document.getElementById('taskDueTime').value;
    
    const currentDateTime = new Date(`${currentDate}T${currentTime}`);
    const currentTimeDiff = currentDateTime.getTime() - new Date().getTime();
    
    const importanceChanged = currentImportance !== this.originalDefaults.importance;
    const timeChanged = Math.abs(currentTimeDiff - this.originalDefaults.time) > 60 * 60 * 1000; // 1小时容差
    
    if (importanceChanged || timeChanged) {
      this.showPositionChangeIndicator();
    } else {
      this.hidePositionChangeIndicator();
    }
  }

  /**
   * 显示位置变化指示器
   */
  showPositionChangeIndicator() {
    const warning = document.getElementById('positionWarning');
    if (warning) {
      warning.classList.add('active');
    }
  }

  /**
   * 隐藏位置变化指示器
   */
  hidePositionChangeIndicator() {
    const warning = document.getElementById('positionWarning');
    if (warning) {
      warning.classList.remove('active');
    }
  }



  /**
   * 保存任务
   */
  async saveTask() {
    try {
      const formData = this.getTaskFormData();
      
      if (!formData.title.trim()) {
        showNotification('Please enter a task title', 'warning');
        return;
      }

      this.updateStatus('Saving...');

      let result;
      if (this.selectedTask) {
        // 更新任务
        result = await this.taskManager.updateTask(this.selectedTask.id, formData);
        if (result) {
          showNotification('Task updated successfully', 'success');
        }
      } else {
        // 添加任务
        // 如果有待处理的坐标信息，添加到任务数据中
        if (this.pendingCoordinates) {
          formData.coordinates = this.pendingCoordinates;
          this.pendingCoordinates = null;
          this.pendingQuadrantKey = null;
        }
        
        result = await this.taskManager.addTask(formData);
        if (result) {
          showNotification('Task added successfully', 'success');
        }
      }

      if (result) {
        this.closeModal();
        await this.loadData();
        
        // 如果是从Task Manager打开的编辑，刷新Task Manager的任务列表
        if (this.selectedTask && this.selectedTask.fromTaskManager) {
          // 清除标记
          delete this.selectedTask.fromTaskManager;
          // 刷新Task Manager的任务列表
          this.renderTaskManagerList();
        }
      } else {
        showNotification('Save failed', 'error');
      }

    } catch (error) {
      console.error('Failed to save task:', error);
      showNotification('Save failed', 'error');
    }
  }

  /**
   * 获取任务表单数据
   */
  getTaskFormData() {
    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDescription').value;
    const category = document.getElementById('taskCategory').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const dueTime = document.getElementById('taskDueTime').value;
    
    const importance = parseInt(document.querySelector('.importance-btn.selected').dataset.importance);
    
    const dueDateTime = new Date(`${dueDate}T${dueTime}`);
    
    const formData = {
      title: title.trim(),
      description: description.trim(),
      importance,
      dueDate: dueDateTime.toISOString(),
      category
    };
    
    // 如果是编辑模式，包含任务状态
    if (this.selectedTask) {
      const statusSelect = document.getElementById('taskStatus');
      if (statusSelect && statusSelect.style.display !== 'none') {
        formData.status = statusSelect.value;
      }
    }
    
    return formData;
  }





  /**
   * 编辑任务（任务管理）
   */
  async editTaskFromManager(taskId) {
    try {
      const task = await this.taskManager.getTaskById(taskId);
      if (task) {
        // 不关闭Task Manager模态框，让编辑模态框在Task Manager之上显示
        // 标记任务来源为Task Manager
        task.fromTaskManager = true;
        this.editTask(task);
      } else {
        showNotification('Task not found', 'error');
      }
    } catch (error) {
      console.error('Failed to edit task:', error);
      showNotification('Failed to edit task', 'error');
    }
  }

  /**
   * 显示编辑模式特有的元素
   */
  showEditModeElements(task) {
    // 显示任务状态显示
    const statusValue = document.getElementById('taskStatusValue');
    statusValue.style.display = 'inline-block';
    
    // 根据任务状态和时间计算显示状态
    const taskStatus = this.calculateTaskStatus(task);
    statusValue.textContent = this.getStatusDisplayText(taskStatus);
    statusValue.className = `status-value status-${taskStatus}`;
    
    // 显示任务状态选择器
    const statusGroup = document.getElementById('taskStatusGroup');
    const statusSelect = document.getElementById('taskStatus');
    statusGroup.style.display = 'block';
    statusSelect.value = taskStatus;
    
    // 移除之前的事件监听器（避免重复绑定）
    statusSelect.removeEventListener('change', this.handleStatusChange);
    
    // 绑定状态选择器变化事件
    this.handleStatusChange = (e) => {
      const newStatus = e.target.value;
      statusValue.textContent = this.getStatusDisplayText(newStatus);
      statusValue.className = `status-value status-${newStatus}`;
    };
    statusSelect.addEventListener('change', this.handleStatusChange);
    
    // 显示删除按钮
    document.getElementById('deleteTaskBtn').style.display = 'block';
    
    // 绑定删除按钮事件
    const deleteBtn = document.getElementById('deleteTaskBtn');
    deleteBtn.onclick = () => {
      this.deleteTaskFromEdit(task.id);
    };
  }

  /**
   * 计算任务状态
   */
  calculateTaskStatus(task) {
    // 如果任务已经是completed或rejected状态，保持原状态
    if (task.status === 'completed') return 'completed';
    if (task.status === 'rejected') return 'rejected';
    
    const now = new Date();
    const createdTime = new Date(task.createdAt);
    const dueTime = new Date(task.dueDate);
    
    // 检查是否是新任务（最近5分钟创建）
    const minutesSinceCreated = (now - createdTime) / (1000 * 60);
    if (minutesSinceCreated <= 5) {
      return 'new';
    }
    
    // 检查是否过期
    if (now > dueTime) {
      return 'overdue';
    }
    
    // 默认状态
    return 'doing';
  }

  /**
   * 获取状态显示文本
   */
  getStatusDisplayText(status) {
    const statusMap = {
      'new': 'New',
      'doing': 'Doing',
      'overdue': 'Overdue',
      'completed': 'Complete',
      'rejected': 'Reject'
    };
    return statusMap[status] || 'Doing';
  }

  /**
   * 从编辑模态框删除任务
   */
  async deleteTaskFromEdit(taskId) {
    try {
      const confirmed = await confirmDialog('Are you sure you want to delete this task? This action cannot be undone.', 'Delete Task');
      if (confirmed) {
        const success = await this.taskManager.deleteTask(taskId);
        if (success) {
          showNotification('Task deleted successfully', 'success');
          this.closeModal();
          await this.loadData();
        } else {
          showNotification('Failed to delete task', 'error');
        }
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      showNotification('Failed to delete task', 'error');
    }
  }



  /**
   * 显示模态框
   */
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('show');
    }
  }

  /**
   * 关闭模态框
   */
  closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.remove('show');
    });
    
    // 清理位置变化相关的状态
    this.originalDefaults = null;
    this.removePositionChangeWarning();
  }

  /**
   * 显示帮助模态框
   */
  showHelpModal() {
    this.showModal('helpModal');
  }





  /**
   * 处理键盘事件
   */
  handleKeyboard(event) {
    // Ctrl+N: 新建任务
    if (event.ctrlKey && event.key === 'n') {
      event.preventDefault();
      this.showAddTaskModal();
    }
    
    // Ctrl+F: 搜索任务
    if (event.ctrlKey && event.key === 'f') {
      event.preventDefault();
      // TODO: 实现搜索功能
    }
    
    // Ctrl+S: 保存任务
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      this.saveTask();
    }
    
    // Esc: 关闭模态框
    if (event.key === 'Escape') {
      this.closeModal();
    }
  }

  /**
   * 启动时间更新
   */
  startTimeUpdate() {
    // 立即更新一次
    this.updateCurrentTime();
    
    // 每秒更新一次
    setInterval(() => {
      this.updateCurrentTime();
    }, 1000);
  }

  /**
   * 更新当前时间显示
   */
  updateCurrentTime() {
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      timeElement.textContent = timeString;
    }
  }

  /**
   * 更新状态
   */
  updateStatus(text) {
    const statusText = document.getElementById('statusText');
    if (statusText) {
      statusText.textContent = text;
    }
  }

  /**
   * 显示任务管理模态框
   */
  async showTaskManagerModal() {
    const modal = document.getElementById('taskManagerModal');
    if (modal) {
      modal.classList.add('show');
      await this.loadTaskManagerData();
    }
  }

  /**
   * 关闭任务管理模态框
   */
  closeTaskManagerModal() {
    const modal = document.getElementById('taskManagerModal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  /**
   * 显示设置模态框
   */
  async showSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.add('show');
      await this.loadSettings();
    }
  }

  /**
   * 关闭设置模态框
   */
  closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  /**
   * 加载任务管理数据
   */
  async loadTaskManagerData() {
    try {
      const tasks = await this.taskManager.getTasks();
      // 按截止时间排序：由近到远
      const sortedTasks = this.sortTasksByDueTime(tasks);
      this.renderTaskManagerList(sortedTasks);
      this.updateTaskStats(sortedTasks);
    } catch (error) {
      console.error('加载任务管理数据失败:', error);
    }
  }

  /**
   * 按截止时间排序任务
   */
  sortTasksByDueTime(tasks) {
    return tasks.sort((a, b) => {
      const aTime = new Date(a.dueDate).getTime();
      const bTime = new Date(b.dueDate).getTime();
      return aTime - bTime; // 由近到远排序
    });
  }

  /**
   * 渲染任务管理列表
   */
  renderTaskManagerList(tasks) {
    const taskList = document.getElementById('taskList');
    if (!taskList) return;

    taskList.innerHTML = '';
    
    if (tasks.length === 0) {
      taskList.innerHTML = '<div class="no-tasks">No tasks found</div>';
      return;
    }

    tasks.forEach(task => {
      const taskElement = this.createTaskElement(task);
      taskList.appendChild(taskElement);
    });
  }

  /**
   * 创建任务元素
   */
  createTaskElement(task) {
    const taskDiv = document.createElement('div');
    
    // 确定任务状态类名
    let statusClass = task.status;
    if (task.isOverdue()) {
      statusClass += ' overdue';
    }
    
    // 根据重要性和紧急程度添加状态类
    const importance = parseInt(task.importance);
    const hoursUntilDue = task.getHoursUntilDue();
    
    if (importance >= 5 && hoursUntilDue <= 24) {
      statusClass += ' important-urgent';
    } else if (importance >= 5 && hoursUntilDue > 24) {
      statusClass += ' important-not-urgent';
    } else if (importance < 5 && hoursUntilDue <= 24) {
      statusClass += ' not-important-urgent';
    } else {
      statusClass += ' not-important-not-urgent';
    }
    
    taskDiv.className = `task-item ${statusClass}`;
    taskDiv.dataset.taskId = task.id;

    const timeText = task.getTimeRemainingText();
    const starRating = this.createStarRating(task.importance);
    const description = task.description ? task.description.trim() : '';

    taskDiv.innerHTML = `
      <div class="task-item-content">
        <div class="task-item-title">${task.title}</div>
        ${description ? `<div class="task-item-description">${description}</div>` : ''}
        <div class="task-item-meta">
          <div class="task-item-importance">
            <span>Importance:</span>
            <div class="star-rating">
              ${starRating}
            </div>
          </div>
          <div class="task-item-time">
            <span>${timeText}</span>
          </div>
        </div>
      </div>
    `;

    // 绑定双击事件
    taskDiv.addEventListener('dblclick', () => {
      this.editTaskFromManager(task.id);
    });

    return taskDiv;
  }

  /**
   * 创建五星评级
   */
  createStarRating(importance) {
    const stars = [];
    const filledStars = Math.round(importance / 2); // 1-10 转换为 0-5 星
    
    for (let i = 0; i < 5; i++) {
      const isFilled = i < filledStars;
      stars.push(`
        <svg class="star ${isFilled ? 'filled' : ''}" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      `);
    }
    
    return stars.join('');
  }

  /**
   * 更新任务统计
   */
  updateTaskStats(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(task => task.status === 'completed').length;
    const pending = tasks.filter(task => task.status === 'pending').length;
    const overdue = tasks.filter(task => task.isOverdue()).length;

    document.getElementById('totalTasks').textContent = total;
    document.getElementById('completedTasks').textContent = completed;
    document.getElementById('pendingTasks').textContent = pending;
    document.getElementById('overdueTasks').textContent = overdue;
  }

  /**
   * 设置任务管理过滤器
   */
  async setTaskManagerFilter(filter) {
    // 更新按钮状态
    document.querySelectorAll('#taskManagerModal .filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`#taskManagerModal [data-filter="${filter}"]`).classList.add('active');

    // 获取过滤后的任务
    let tasks = await this.taskManager.getTasks();
    
    switch (filter) {
      case 'pending':
        tasks = tasks.filter(task => task.status === 'pending');
        break;
      case 'completed':
        tasks = tasks.filter(task => task.status === 'completed');
        break;
      case 'overdue':
        tasks = tasks.filter(task => task.isOverdue());
        break;
      default:
        // 'all' - 显示所有任务
        break;
    }

    // 按截止时间排序
    const sortedTasks = this.sortTasksByDueTime(tasks);
    this.renderTaskManagerList(sortedTasks);
  }

  /**
   * 搜索任务
   */
  async searchTasks(query) {
    if (!query.trim()) {
      await this.loadTaskManagerData();
      return;
    }

    const tasks = await this.taskManager.getTasks();
    const filteredTasks = tasks.filter(task => 
      task.title.toLowerCase().includes(query.toLowerCase()) ||
      task.description.toLowerCase().includes(query.toLowerCase())
    );

    // 按截止时间排序
    const sortedTasks = this.sortTasksByDueTime(filteredTasks);
    this.renderTaskManagerList(sortedTasks);
  }

  /**
   * 完成任务
   */
  async completeTask(taskId) {
    try {
      await this.taskManager.completeTask(taskId);
      await this.loadTaskManagerData();
      await this.loadData(); // 刷新主界面
      showNotification('Task completed successfully', 'success');
    } catch (error) {
      console.error('完成任务失败:', error);
      showNotification('Failed to complete task', 'error');
    }
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId) {
    try {
      const confirmed = await confirmDialog('Are you sure you want to delete this task?');
      if (confirmed) {
        await this.taskManager.deleteTask(taskId);
        await this.loadTaskManagerData();
        await this.loadData(); // 刷新主界面
        showNotification('Task deleted successfully', 'success');
      }
    } catch (error) {
      console.error('删除任务失败:', error);
      showNotification('Failed to delete task', 'error');
    }
  }

  /**
   * 加载设置
   */
  async loadSettings() {
    try {
      const settings = await this.storageManager.getSettings();
      
      document.getElementById('urgentThreshold').value = settings.urgentThreshold || 24;
      document.getElementById('dailyReminder').checked = settings.dailyReminder !== false;
      document.getElementById('reminderTime').value = settings.reminderTime || '09:00';
      document.getElementById('overdueAlert').checked = settings.overdueAlert !== false;
      document.getElementById('autoRefresh').checked = settings.autoRefresh !== false;
      document.getElementById('refreshInterval').value = settings.refreshInterval || 5;
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }

  /**
   * 保存设置
   */
  async saveSettings() {
    try {
      const formData = new FormData(document.getElementById('settingsForm'));
      const settings = {
        urgentThreshold: parseInt(formData.get('urgentThreshold')),
        dailyReminder: formData.get('dailyReminder') === 'on',
        reminderTime: formData.get('reminderTime'),
        overdueAlert: formData.get('overdueAlert') === 'on',
        autoRefresh: formData.get('autoRefresh') === 'on',
        refreshInterval: parseInt(formData.get('refreshInterval'))
      };

      await this.storageManager.saveSettings(settings);
      this.closeSettingsModal();
      showNotification('Settings saved successfully', 'success');
    } catch (error) {
      console.error('保存设置失败:', error);
      showNotification('Failed to save settings', 'error');
    }
  }

  /**
   * 销毁应用
   */
  destroy() {
    this.matrixManager.destroy();
    this.matrixRenderer = null;
  }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  window.popupApp = new PopupApp();
});

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  if (window.popupApp) {
    window.popupApp.destroy();
  }
}); 