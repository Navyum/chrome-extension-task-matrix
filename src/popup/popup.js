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
   * 初始化
   */
  async init() {
    try {
      // 数据迁移：将pending状态转换为doing状态
      await this.taskManager.migratePendingToDoing();
      
      // 初始化矩阵渲染器
      this.initMatrixRenderer();
      
      // 加载数据
      await this.loadData();
      
      // 绑定事件
      this.bindEvents();
      
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
   * 动态创建编辑模态框
   */
  createEditModal() {
    // 如果已存在编辑模态框，先移除
    if (this.editModal) {
      this.editModal.remove();
    }

    // 创建模态框HTML
    const modalHTML = `
      <div class="modal" id="editTaskModal">
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-header-content">
              <div class="modal-title-row">
                <h3 id="modalTitle">Edit Task</h3>
                <span class="status-value" id="taskStatusValue" style="display: none;">New</span>
              </div>
            </div>
            <button class="modal-close" id="closeEditModal">&times;</button>
          </div>
          <form class="task-form" id="editTaskForm">
            <div class="form-group">
              <label for="editTaskTitle">Task Title *</label>
              <input type="text" id="editTaskTitle" name="title" required maxlength="50" placeholder="Enter task title">
            </div>
            
            <div class="form-group">
              <label for="editTaskDescription">Task Description</label>
              <textarea id="editTaskDescription" name="description" maxlength="200" placeholder="Enter task description (optional)"></textarea>
            </div>
            
            <div class="form-group">
              <label>Importance Level *</label>
              <div class="importance-selector">
                <button type="button" class="importance-btn" data-importance="1">1</button>
                <button type="button" class="importance-btn" data-importance="2">2</button>
                <button type="button" class="importance-btn" data-importance="3">3</button>
                <button type="button" class="importance-btn" data-importance="4">4</button>
                <button type="button" class="importance-btn" data-importance="5">5</button>
                <button type="button" class="importance-btn" data-importance="6">6</button>
                <button type="button" class="importance-btn" data-importance="7">7</button>
                <button type="button" class="importance-btn" data-importance="8">8</button>
                <button type="button" class="importance-btn" data-importance="9">9</button>
                <button type="button" class="importance-btn" data-importance="10">10</button>
              </div>
              <div class="importance-labels">
                <span>Not Important</span>
                <span>Very Important</span>
              </div>
            </div>
            
            <div class="form-group">
              <label for="editTaskDueDate">Due Date *</label>
              <div class="date-time-inputs">
                <input type="date" id="editTaskDueDate" name="dueDate" required>
                <input type="time" id="editTaskDueTime" name="dueTime" required>
              </div>
            </div>
            
            <div class="form-group">
              <label for="editTaskCategory">Task Category</label>
              <select id="editTaskCategory" name="category">
                <option value="work">Work</option>
                <option value="personal">Personal</option>
                <option value="study">Study</option>
                <option value="health">Health</option>
                <option value="other">Other</option>
              </select>
            </div>


            
            <div class="form-actions">
              <div class="form-actions-left">
                <button type="button" class="btn btn-danger" id="editDeleteTaskBtn" style="display: none;">Delete Task</button>
              </div>
              <div class="form-actions-right">
                <button type="button" class="btn btn-secondary" id="editCancelTask">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Task</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;

    // 创建DOM元素
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = modalHTML;
    this.editModal = tempDiv.firstElementChild;

    // 添加到页面
    document.body.appendChild(this.editModal);

    // 绑定事件
    this.bindEditModalEvents();
  }

  /**
   * 绑定编辑模态框事件
   */
  bindEditModalEvents() {
    // 关闭按钮
    const closeBtn = this.editModal.querySelector('#closeEditModal');
    closeBtn.addEventListener('click', () => {
      this.closeEditModal();
    });

    // 取消按钮
    const cancelBtn = this.editModal.querySelector('#editCancelTask');
    cancelBtn.addEventListener('click', () => {
      this.closeEditModal();
    });

    // 表单提交
    const form = this.editModal.querySelector('#editTaskForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTask();
    });

    // 重要性选择器
    const importanceBtns = this.editModal.querySelectorAll('.importance-btn');
    importanceBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        importanceBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });



    // 点击遮罩关闭
    this.editModal.addEventListener('click', (e) => {
      if (e.target === this.editModal) {
        this.closeEditModal();
      }
    });

    // 键盘事件
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.editModal.classList.contains('show')) {
        this.closeEditModal();
      }
    });
  }

  /**
   * 关闭编辑模态框
   */
  closeEditModal() {
    if (this.editModal) {
      this.editModal.classList.remove('show');
      // 延迟移除DOM元素，等待动画完成
      setTimeout(() => {
        if (this.editModal && this.editModal.parentNode) {
          this.editModal.remove();
          this.editModal = null;
        }
      }, 300);
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
    const taskFilter = document.getElementById('taskFilter');
    if (taskFilter) {
      taskFilter.addEventListener('change', (e) => {
        this.setTaskManagerFilter(e.target.value);
      });
    }

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
    
    // 创建动态编辑模态框
    this.createEditModal();
    
    // 重置表单
    this.resetTaskForm();
    
    // 设置标题
    this.editModal.querySelector('#modalTitle').textContent = 'Add New Task';
    
    // 隐藏编辑模式特有的元素
    this.hideEditModeElements();
    
    // 显示模态框
    this.editModal.classList.add('show');
  }

  /**
   * 编辑任务
   */
  editTask(task) {
    this.selectedTask = task;
    
    // 创建动态编辑模态框
    this.createEditModal();
    
    // 填充表单
    this.fillTaskForm(task);
    
    // 设置标题
    this.editModal.querySelector('#modalTitle').textContent = 'Edit Task';
    
    // 显示编辑模式特有的元素
    this.showEditModeElements(task);
    
    // 显示模态框
    this.editModal.classList.add('show');
  }

  /**
   * 在指定位置创建任务
   */
  createTaskAtPosition(coordinates, quadrantKey) {
    this.selectedTask = null;
    
    // 创建动态编辑模态框
    this.createEditModal();
    
    // 重置表单
    this.resetTaskForm();
    
    // 根据象限和坐标位置设置默认值
    const { defaultImportance, defaultTime } = this.calculateDefaultsFromPosition(coordinates, quadrantKey);
    
    // 设置默认重要性
    this.selectImportance(defaultImportance);
    
    // 设置默认时间 - 修复跨天日期计算
    const defaultDate = new Date();
    const hoursToAdd = defaultTime / (60 * 60 * 1000); // 转换为小时
    
    // 根据时间长度正确计算日期和时间
    if (hoursToAdd >= 24) {
      // 超过24小时，需要跨天
      const daysToAdd = Math.floor(hoursToAdd / 24);
      const remainingHours = hoursToAdd % 24;
      
      // 设置日期
      defaultDate.setDate(defaultDate.getDate() + daysToAdd);
      
      // 设置时间
      const currentHours = defaultDate.getHours();
      const newHours = currentHours + remainingHours;
      
      if (newHours >= 24) {
        // 如果时间超过24小时，再增加一天
        defaultDate.setDate(defaultDate.getDate() + 1);
        defaultDate.setHours(newHours - 24);
      } else {
        defaultDate.setHours(newHours);
      }
    } else {
      // 24小时内，精确到分钟级计算
      const totalMinutesToAdd = hoursToAdd * 60; // 转换为分钟
      const currentMinutes = defaultDate.getMinutes();
      const currentHours = defaultDate.getHours();
      
      // 计算新的分钟和小时
      const newTotalMinutes = currentMinutes + totalMinutesToAdd;
      const newHours = Math.floor(newTotalMinutes / 60);
      const newMinutes = newTotalMinutes % 60;
      
      // 检查是否会跨天
      const finalHours = currentHours + newHours;
      
      if (finalHours >= 24) {
        // 会跨天，增加一天并调整小时
        defaultDate.setDate(defaultDate.getDate() + 1);
        defaultDate.setHours(finalHours - 24);
        defaultDate.setMinutes(newMinutes);
      } else {
        // 不跨天，直接设置小时和分钟
        defaultDate.setHours(finalHours);
        defaultDate.setMinutes(newMinutes);
      }
    }
    
    // 设置日期和时间到表单
    const year = defaultDate.getFullYear();
    const month = String(defaultDate.getMonth() + 1).padStart(2, '0');
    const day = String(defaultDate.getDate()).padStart(2, '0');
    const hours = String(defaultDate.getHours()).padStart(2, '0');
    const minutes = String(defaultDate.getMinutes()).padStart(2, '0');
    
    this.editModal.querySelector('#editTaskDueDate').value = `${year}-${month}-${day}`;
    this.editModal.querySelector('#editTaskDueTime').value = `${hours}:${minutes}`;
    
    console.log(`=== 双击创建任务默认时间计算 ===`);
    console.log(`计算的时间偏移: ${hoursToAdd}小时`);
    console.log(`当前时间: ${new Date().toLocaleString()}`);
    console.log(`计算的默认时间: ${defaultDate.toLocaleString()}`);
    console.log(`设置的日期: ${year}-${month}-${day}`);
    console.log(`设置的时间: ${hours}:${minutes}`);
    console.log(`===============================`);
    
    // 存储坐标信息用于任务定位
    this.pendingCoordinates = coordinates && coordinates.x !== undefined && coordinates.y !== undefined ? coordinates : null;
    this.pendingQuadrantKey = quadrantKey;
    this.originalDefaults = { importance: defaultImportance, time: defaultTime };
    
    // 设置标题
    this.editModal.querySelector('#modalTitle').textContent = 'Add New Task';
    
    // 显示模态框
    this.editModal.classList.add('show');
    
    // 添加位置变化提示
    this.addPositionChangeWarning();
  }

  /**
   * 重置任务表单
   */
  resetTaskForm() {
    if (!this.editModal) return;
    
    const form = this.editModal.querySelector('#editTaskForm');
    if (form) {
      form.reset();
      
      // 设置默认日期和时间
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      this.editModal.querySelector('#editTaskDueDate').value = tomorrow.toISOString().split('T')[0];
      this.editModal.querySelector('#editTaskDueTime').value = '09:00';
      
      // 重置选择器
      this.selectImportance(5);
    }
  }

  /**
   * 填充任务表单
   */
  fillTaskForm(task) {
    if (!this.editModal) return;
    
    this.editModal.querySelector('#editTaskTitle').value = task.title;
    this.editModal.querySelector('#editTaskDescription').value = task.description;
    this.editModal.querySelector('#editTaskCategory').value = task.category;
    
    const dueDate = new Date(task.dueDate);
    this.editModal.querySelector('#editTaskDueDate').value = dueDate.toISOString().split('T')[0];
    this.editModal.querySelector('#editTaskDueTime').value = dueDate.toTimeString().slice(0, 5);
    
    this.selectImportance(task.importance);
  }

  /**
   * 选择重要性
   */
  selectImportance(importance) {
    if (!this.editModal) return;
    
    this.editModal.querySelectorAll('.importance-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    
    const selectedBtn = this.editModal.querySelector(`[data-importance="${importance}"]`);
    if (selectedBtn) {
      selectedBtn.classList.add('selected');
    }
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
      
      // 处理时间值：确保非负值
      let adjustedHours = hours;
      if (hours < 0) {
        // 超期任务，设置为当前时间（0小时）
        adjustedHours = 0;
        console.log(`检测到超期任务，将时间调整为: ${adjustedHours}小时`);
      }
      
      defaultTime = adjustedHours * 60 * 60 * 1000; // 转换为毫秒
      
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
      console.log(`X坐标: ${coordinates.x}`);
      console.log(`Y坐标: ${coordinates.y}`);
      console.log(`Y轴高度: ${yAxisHeight}`);
      console.log(`相对Y位置: ${relativeY.toFixed(3)}`);
      console.log(`相对重要性: ${relativeImportance.toFixed(3)}`);
      console.log(`计算的重要性: ${defaultImportance}`);
      console.log(`原始计算时间: ${hours}小时`);
      console.log(`调整后时间: ${adjustedHours}小时`);
      console.log(`时间毫秒: ${defaultTime}`);
      console.log(`象限: ${quadrantKey}`);
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
      
      console.log(`=== 象限默认值计算 ===`);
      console.log(`象限: ${quadrantKey}`);
      console.log(`默认重要性: ${defaultImportance}`);
      console.log(`默认时间: ${defaultTime / (60 * 60 * 1000)}小时`);
      console.log(`=====================`);
    }
    
    return { defaultImportance, defaultTime };
  }

  /**
   * 添加位置变化警告
   */
  addPositionChangeWarning() {
    if (!this.editModal) return;
    
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
    const form = this.editModal.querySelector('#editTaskForm');
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
    if (!this.editModal) return;
    
    // 重要性按钮变化监听
    this.editModal.querySelectorAll('.importance-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.checkPositionChange();
      });
    });
    
    // 日期时间变化监听
    this.editModal.querySelector('#editTaskDueDate').addEventListener('change', () => {
      this.checkPositionChange();
    });
    
    this.editModal.querySelector('#editTaskDueTime').addEventListener('change', () => {
      this.checkPositionChange();
    });
  }

  /**
   * 检查位置是否发生变化
   */
  checkPositionChange() {
    if (!this.originalDefaults || !this.editModal) return;
    
    const selectedBtn = this.editModal.querySelector('.importance-btn.selected');
    const currentImportance = selectedBtn ? parseInt(selectedBtn.dataset.importance) : 5;
    const currentDate = this.editModal.querySelector('#editTaskDueDate').value;
    const currentTime = this.editModal.querySelector('#editTaskDueTime').value;
    
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
      if (!formData) {
        showNotification('Failed to get form data', 'error');
        return;
      }

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
        this.closeEditModal();
        await this.loadData();
        
        // 如果是从Task Manager打开的编辑，刷新Task Manager的任务列表
        if (this.selectedTask && this.selectedTask.fromTaskManager) {
          // 清除标记
          delete this.selectedTask.fromTaskManager;
          // 刷新Task Manager的任务列表
          this.renderTaskManagerList();
        } else {
          // 如果不是从Task Manager打开的，但Task Manager模态框是打开的，也要刷新
          const taskManagerModal = document.getElementById('taskManagerModal');
          if (taskManagerModal && taskManagerModal.classList.contains('show')) {
            await this.loadTaskManagerData();
          }
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
    if (!this.editModal) return null;
    
    const title = this.editModal.querySelector('#editTaskTitle').value;
    const description = this.editModal.querySelector('#editTaskDescription').value;
    const category = this.editModal.querySelector('#editTaskCategory').value;
    const dueDate = this.editModal.querySelector('#editTaskDueDate').value;
    const dueTime = this.editModal.querySelector('#editTaskDueTime').value;
    
    const selectedBtn = this.editModal.querySelector('.importance-btn.selected');
    const importance = selectedBtn ? parseInt(selectedBtn.dataset.importance) : 5;
    
    // 修复跨天处理：使用本地时间创建日期对象
    let dueDateTime;
    if (dueDate && dueTime) {
      // 解析日期和时间
      const [year, month, day] = dueDate.split('-').map(Number);
      const [hours, minutes] = dueTime.split(':').map(Number);
      
      // 创建本地日期时间对象
      dueDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
      
      // 转换为ISO字符串
      const dueDateISO = dueDateTime.toISOString();
      
      console.log(`=== 任务时间处理 ===`);
      console.log(`输入日期: ${dueDate}`);
      console.log(`输入时间: ${dueTime}`);
      console.log(`解析的年月日: ${year}-${month}-${day}`);
      console.log(`解析的时分: ${hours}:${minutes}`);
      console.log(`创建的日期对象: ${dueDateTime.toLocaleString()}`);
      console.log(`ISO字符串: ${dueDateISO}`);
      console.log(`=====================`);
    } else {
      // 如果没有日期或时间，使用当前时间
      dueDateTime = new Date();
    }
    
    const formData = {
      title: title.trim(),
      description: description.trim(),
      importance,
      dueDate: dueDateTime.toISOString(),
      category
    };
    
    // 如果是编辑模式，包含任务状态
    if (this.selectedTask) {
      const statusValue = this.editModal.querySelector('#taskStatusValue');
      if (statusValue && statusValue.style.display !== 'none') {
        const currentStatus = this.getStatusFromDisplayText(statusValue.textContent);
        
        // 只有当状态是completed或rejected时才保存，否则保持原状态
        if (currentStatus === 'completed' || currentStatus === 'rejected') {
          formData.status = currentStatus;
        }
        // 如果是自动计算状态（new, doing, overdue），不设置status，保持原状态
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
    if (!this.editModal) return;
    
    // 显示任务状态显示
    const statusValue = this.editModal.querySelector('#taskStatusValue');
    statusValue.style.display = 'inline-block';
    
    // 根据任务状态和时间计算显示状态
    const taskStatus = this.calculateTaskStatus(task);
    statusValue.textContent = this.getStatusDisplayText(taskStatus);
    statusValue.className = `status-value status-${taskStatus}`;
    

    
    // 绑定状态值点击事件
    statusValue.addEventListener('click', () => {
      this.toggleStatusSelection(statusValue, task);
    });
    
    // 显示删除按钮
    this.editModal.querySelector('#editDeleteTaskBtn').style.display = 'block';
    
    // 绑定删除按钮事件
    const deleteBtn = this.editModal.querySelector('#editDeleteTaskBtn');
    deleteBtn.onclick = () => {
      this.deleteTaskFromEdit(task.id);
    };
  }

  /**
   * 切换状态选择
   */
  toggleStatusSelection(statusValue, task) {
    const currentStatus = this.getStatusFromDisplayText(statusValue.textContent);
    
    // 如果当前状态是completed，切换到rejected
    if (currentStatus === 'completed') {
      statusValue.textContent = this.getStatusDisplayText('rejected');
      statusValue.className = 'status-value status-rejected';
    }
    // 如果当前状态是rejected，切换回自动计算状态
    else if (currentStatus === 'rejected') {
      const autoStatus = this.calculateTaskStatus(task);
      statusValue.textContent = this.getStatusDisplayText(autoStatus);
      statusValue.className = `status-value status-${autoStatus}`;
    }
    // 如果当前是自动计算状态（new, doing, overdue），切换到completed
    else {
      statusValue.textContent = this.getStatusDisplayText('completed');
      statusValue.className = 'status-value status-completed';
    }
  }

  /**
   * 根据显示文本获取状态值
   */
  getStatusFromDisplayText(displayText) {
    const statusMap = {
      'New': 'new',
      'Doing': 'doing',
      'Overdue': 'overdue',
      'Complete': 'completed',
      'Reject': 'rejected'
    };
    return statusMap[displayText] || 'doing';
  }

  /**
   * 隐藏编辑模式特有的元素
   */
  hideEditModeElements() {
    if (!this.editModal) return;
    
    // 隐藏任务状态显示
    this.editModal.querySelector('#taskStatusValue').style.display = 'none';
    

    
    // 隐藏删除按钮
    this.editModal.querySelector('#editDeleteTaskBtn').style.display = 'none';
  }

  /**
   * 计算任务状态
   */
  calculateTaskStatus(task) {
    // 如果任务已经是completed或rejected状态，保持原状态（这些是手动设置的状态）
    if (task.status === 'completed') return 'completed';
    if (task.status === 'rejected') return 'rejected';
    
    // 对于其他状态（doing, new, overdue），根据时间重新计算
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
          this.closeEditModal();
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

    // 如果没有传递tasks参数，重新加载任务数据
    if (!tasks) {
      this.loadTaskManagerData();
      return;
    }

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
    const doing = tasks.filter(task => task.status === 'doing').length;
    const overdue = tasks.filter(task => task.isOverdue()).length;

    // 安全地更新统计信息，检查元素是否存在
    const totalTasksElement = document.getElementById('totalTasks');
    const completedTasksElement = document.getElementById('completedTasks');
    const doingTasksElement = document.getElementById('doingTasks');
    const overdueTasksElement = document.getElementById('overdueTasks');

    if (totalTasksElement) {
      totalTasksElement.textContent = total;
    }
    if (completedTasksElement) {
      completedTasksElement.textContent = completed;
    }
    if (doingTasksElement) {
      doingTasksElement.textContent = doing;
    }
    if (overdueTasksElement) {
      overdueTasksElement.textContent = overdue;
    }
  }

  /**
   * 设置任务管理过滤器
   */
  async setTaskManagerFilter(filter) {
    // 更新下拉框状态
    const taskFilter = document.getElementById('taskFilter');
    if (taskFilter) {
      taskFilter.value = filter;
      taskFilter.setAttribute('data-selected', filter);
    }

    // 获取过滤后的任务
    let tasks = await this.taskManager.getTasks();
    
    switch (filter) {
      case 'doing':
        tasks = tasks.filter(task => {
          const status = this.calculateTaskStatus(task);
          return status === 'doing';
        });
        break;
      case 'overdue':
        tasks = tasks.filter(task => {
          const status = this.calculateTaskStatus(task);
          return status === 'overdue';
        });
        break;
      case 'completed':
        tasks = tasks.filter(task => task.status === 'completed');
        break;
      case 'rejected':
        tasks = tasks.filter(task => task.status === 'rejected');
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
    const searchBox = document.querySelector('.search-box');
    const searchInput = document.getElementById('taskSearch');
    
    // 添加加载状态
    if (searchBox) {
      searchBox.classList.add('loading');
    }
    
    try {
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
    } finally {
      // 移除加载状态
      if (searchBox) {
        searchBox.classList.remove('loading');
      }
    }
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