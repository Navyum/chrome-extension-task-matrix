/**
 * 弹窗页面主要逻辑
 */
import './popup.css';
import { StorageManager } from '../services/StorageManager.js';
import { TaskManager } from '../services/TaskManager.js';
import { MatrixManager } from '../services/MatrixManager.js';
import { MatrixRenderer } from '../renderers/MatrixRenderer.js';
import { ReportManager } from '../reports/ReportManager.js';
import { showNotification, confirmDialog, debounce } from '../utils/helpers.js';
import { i18n } from '../utils/i18n.js';
// 导入图标
import closeIcon from '../../assets/icons/close.svg';
import detailIcon from '../../assets/icons/detail.svg';
import settingIcon from '../../assets/icons/setting.svg';
import helpIcon from '../../assets/icons/help.svg';
import reportIcon from '../../assets/icons/report.svg';
// 使用 + 号符合添加任务的语义
import plusIcon from '../../assets/icons/add.svg'; // doing.svg 包含一个加号

// 浏览器API适配器
const browserAPI = (() => {
  if (typeof browser !== 'undefined') {
    return browser;
  } else if (typeof chrome !== 'undefined') {
    return chrome;
  } else {
    throw new Error('Neither browser nor chrome API is available');
  }
})();

class PopupApp {
  constructor() {
    this.storageManager = new StorageManager();
    this.taskManager = new TaskManager(this.storageManager);
    this.matrixManager = new MatrixManager(this.taskManager);
    this.matrixRenderer = null;
    
    // 初始化报告管理器
    this.reportManager = new ReportManager(this.taskManager);
    
    // 初始化排序状态
    this.sortState = { sortBy: 'dueDate', sortOrder: 'asc' };
    // 初始化当前任务筛选器状态
    this.currentTaskFilter = 'doing'; // 默认筛选为doing
    
    this.init();
  }

  /**
   * 初始化
   */
  async init() {
    try {
      // 初始化多语言
      await this.initI18n();
      
      // 初始化矩阵渲染器
      this.initMatrixRenderer();
      
      // 设置按钮图标
      this.setupIcons();
      
      // 初始化报告模态框
      await this.initReportModal();
      
      // 加载数据
      await this.loadData();
      
      // 绑定事件
      this.bindEvents();
      
      // 启动矩阵自动更新
      this.matrixManager.startAutoUpdate();
      
      // 启动时间更新
      this.startTimeUpdate();
      
      // 更新状态
      this.updateStatus(i18n.getMessage('ready'));
      
    } catch (error) {
      console.error('初始化失败:', error);
      this.updateStatus(i18n.getMessage('initializationFailed'));
    }
  }

  /**
   * 初始化多语言
   */
  async initI18n() {
    // 调用i18n的初始化方法
    await i18n.initI18n();
  }


  /**
   * 初始化报告模态框
   */
  async initReportModal() {
    const reportModal = document.getElementById('reportModal');
    if (reportModal) {
      await this.reportManager.initReportModal(reportModal);
    }
  }

  /**
   * 设置所有按钮的图标
   */
  setupIcons() {
    // 设置关闭按钮图标
    this.setupCloseIcons();
    
    // 设置导航按钮图标
    this.setupNavIcons();
  }

  /**
   * 设置导航按钮的图标
   */
  setupNavIcons() {
    // 任务管理按钮
    const taskManagerBtn = document.getElementById('taskManagerBtn');
    if (taskManagerBtn) {
      // 清空内容并设置新图标
      taskManagerBtn.innerHTML = `<img src="${detailIcon}" alt="${i18n.getMessage('taskManager')}">`;
    }
    
    // 设置按钮
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.innerHTML = `<img src="${settingIcon}" alt="${i18n.getMessage('settings')}">`;
    }
    
    // 报告按钮
    const reportBtn = document.getElementById('reportBtn');
    if (reportBtn) {
      reportBtn.innerHTML = `<img src="${reportIcon}" alt="${i18n.getMessage('report')}">`;
    }
    
    // 帮助按钮
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
      helpBtn.innerHTML = `<img src="${helpIcon}" alt="${i18n.getMessage('help')}">`;
    }
    
    // 添加任务按钮
    const addTaskFab = document.getElementById('addTaskFab');
    if (addTaskFab) {
      addTaskFab.innerHTML = `<img src="${plusIcon}" alt="${i18n.getMessage('addTask')}">`;
    }
  }

  /**
   * 设置所有关闭按钮的图标
   */
  setupCloseIcons() {
    // 获取所有关闭按钮图标
    const closeIconElements = document.querySelectorAll('.modal-close img');
    
    // 设置正确的图标路径
    closeIconElements.forEach(icon => {
      icon.src = closeIcon;
    });
  }

  /**
   * 动态创建编辑模态框
   */
  createEditModal() {
    // 检查DOM中是否存在已有的编辑模态框，如果有则移除
    const existingModal = document.getElementById('editTaskModal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // 如果已存在编辑模态框实例，先移除
    if (this.editModal && this.editModal.parentNode) {
      this.editModal.remove();
    }

    // 创建模态框HTML
    const modalHTML = `
      <div class="modal" id="editTaskModal">
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-header-content">
              <div class="modal-title-row">
                <h3 id="modalTitle">${i18n.getMessage('editTask')}</h3>
                <span class="status-value" id="taskStatusValue" style="display: none;">${i18n.getMessage('newTask')}</span>
              </div>
            </div>
            <button class="modal-close" id="closeEditModal">
              <img src="${closeIcon}" alt="${i18n.getMessage('close')}">
            </button>
          </div>
          <div class="edit-task-content" style="padding: 10px; overflow-y: auto; flex-grow: 1;">
            <form class="task-form" id="editTaskForm">
              <div class="form-group">
                <label for="editTaskTitle">${i18n.getMessage('taskTitle')}</label>
                <input type="text" id="editTaskTitle" name="title" required maxlength="50" placeholder="${i18n.getMessage('taskTitlePlaceholder')}">
              </div>
              
              <div class="form-group">
                <label for="editTaskDescription">${i18n.getMessage('taskDescription')}</label>
                <textarea id="editTaskDescription" name="description" maxlength="200" placeholder="${i18n.getMessage('taskDescriptionPlaceholder')}"></textarea>
              </div>
              
              <div class="form-group">
                <label>${i18n.getMessage('importanceLevel')}</label>
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
                  <span>${i18n.getMessage('notImportant')}</span>
                  <span>${i18n.getMessage('veryImportant')}</span>
                </div>
              </div>
              
              <div class="form-group">
                <label for="editTaskDueDate">${i18n.getMessage('dueDate')}</label>
                <div class="date-time-inputs">
                  <input type="date" id="editTaskDueDate" name="dueDate" required>
                  <input type="time" id="editTaskDueTime" name="dueTime" required>
                </div>
              </div>
              
              <div class="form-group">
                <label for="editTaskCategory">${i18n.getMessage('taskCategory')}</label>
                <select id="editTaskCategory" name="category">
                  <option value="work">${i18n.getMessage('work')}</option>
                  <option value="personal">${i18n.getMessage('personal')}</option>
                  <option value="study">${i18n.getMessage('study')}</option>
                  <option value="health">${i18n.getMessage('health')}</option>
                  <option value="other">${i18n.getMessage('other')}</option>
                </select>
              </div>


              
              <div class="form-actions">
                <div class="form-actions-left">
                  <button type="button" class="btn btn-danger" id="editDeleteTaskBtn" style="display: none;">${i18n.getMessage('deleteTask')}</button>
                </div>
                <div class="form-actions-right">
                  <button type="button" class="btn btn-secondary" id="editCancelTask">${i18n.getMessage('cancel')}</button>
                  <button type="submit" class="btn btn-primary">${i18n.getMessage('saveTask')}</button>
                </div>
              </div>
            </form>
          </div>
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

    // 日期时间变化监听
    this.editModal.querySelector('#editTaskDueDate').addEventListener('change', () => {
      this.onDateTimeChange();
    });
    
    this.editModal.querySelector('#editTaskDueTime').addEventListener('change', () => {
      this.onDateTimeChange();
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
    // 检查DOM中是否存在编辑模态框，如果有则移除
    const existingModal = document.getElementById('editTaskModal');
    if (existingModal) {
      existingModal.classList.remove('show');
    }
    
    if (this.editModal) {
      this.editModal.classList.remove('show');
      // 延迟移除DOM元素，等待动画完成
      setTimeout(() => {
        // 再次检查DOM中是否存在编辑模态框
        const modalToRemove = document.getElementById('editTaskModal');
        if (modalToRemove) {
          modalToRemove.remove();
        }
        
        // 清除实例引用
        if (this.editModal && this.editModal.parentNode) {
          this.editModal.remove();
        }
        this.editModal = null;
      }, 300);
    }
    
    // 清除重新计算的坐标信息
    this.recalculatedCoordinates = null;
    // 清除原始默认值
    this.originalDefaults = null;
    // 清除来源标记
    this.fromTaskManager = false;
  }

  /**
   * 初始化矩阵渲染器
   */
  initMatrixRenderer() {
    const container = document.getElementById('matrixContainer');
    if (container) {
      this.matrixRenderer = new MatrixRenderer(container);
      
      // 设置任务双击回调
      this.matrixRenderer.onTaskDoubleClick = (task) => {
        this.editTask(task);
      };

      // 设置背景双击回调
      this.matrixRenderer.onBackgroundDoubleClick = (coordinates, quadrantKey) => {
        this.createTaskAtPosition(coordinates, quadrantKey);
      };
      
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

    // 任务管理模态框内的浮动添加任务按钮
    const addTaskFab = document.getElementById('addTaskFab');
    if (addTaskFab) {
      addTaskFab.addEventListener('click', () => {
        this.addTaskFromManager(); // 使用新方法在不关闭任务管理模态框的情况下添加任务
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

    // 报告按钮
    const reportBtn = document.getElementById('reportBtn');
    if (reportBtn) {
      reportBtn.addEventListener('click', () => {
        this.showReportModal();
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

    // 报告模态框关闭
    const closeReportModal = document.getElementById('closeReportModal');
    if (closeReportModal) {
      closeReportModal.addEventListener('click', () => {
        this.closeReportModal();
      });
    }

    // 任务管理过滤器 (标签按钮)
    const taskFilterContainer = document.getElementById('taskFilter');
    if (taskFilterContainer) {
      taskFilterContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-button')) {
          // 移除所有按钮的 active 类
          document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
          });

          // 添加当前点击按钮的 active 类
          e.target.classList.add('active');
          this.setTaskManagerFilter(e.target.dataset.filter);
        }
      });
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
      this.updateStatus(i18n.getMessage('loading'));
      
      // 更新矩阵
      await this.matrixManager.updateMatrix();
      
      // 更新统计信息
      await this.updateStatistics();
      
      // 渲染矩阵
      await this.renderMatrix();
      
    } catch (error) {
      console.error('加载数据失败:', error);
      showNotification(i18n.getMessage('loadingDataFailed'), 'error');
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
    this.editModal.querySelector('#modalTitle').textContent = i18n.getMessage('addTask');
    
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
    
    // 设置原始默认值用于比较
    const selectedBtn = this.editModal.querySelector('.importance-btn.selected');
    const currentImportance = selectedBtn ? parseInt(selectedBtn.dataset.importance) : 5;
    const currentDate = this.editModal.querySelector('#editTaskDueDate').value;
    const currentTime = this.editModal.querySelector('#editTaskDueTime').value;
    const currentDateTime = new Date(`${currentDate}T${currentTime}`); // 本地时间
    const currentTimeStamp = currentDateTime.getTime(); // 直接获取时间戳
    
    this.originalDefaults = {
      importance: currentImportance,
      time: currentTimeStamp // 直接存储时间戳
    };
    
    console.log('=== 设置原始默认值 ===');
    console.log('任务标题:', task.title);
    console.log('当前日期:', currentDate);
    console.log('当前时间:', currentTime);
    console.log('当前日期时间对象:', currentDateTime.toLocaleString());
    console.log('当前时间差(毫秒):', currentTimeStamp.toFixed(0));
    console.log('原始默认值:', this.originalDefaults);
    console.log('========================');
    
    // 设置标题
    this.editModal.querySelector('#modalTitle').textContent = i18n.getMessage('editTask');
    
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
    const hoursToAdd = defaultTime / (60 * 60 * 1000); // defaultTime已经是毫秒，这里为了兼容现有逻辑
    
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
    console.log(`计算的时间偏移: ${(defaultTime / (60 * 60 * 1000)).toFixed(2)}小时`);
    console.log(`当前时间: ${new Date().toLocaleString()}`);
    console.log(`计算的默认时间: ${defaultDate.toLocaleString()}`);
    console.log(`设置的日期: ${year}-${month}-${day}`);
    console.log(`设置的时间: ${hours}:${minutes}`);
    console.log(`===============================`);
    
    // 存储坐标信息用于任务定位
    this.pendingCoordinates = coordinates && coordinates.x !== undefined && coordinates.y !== undefined ? coordinates : null;
    this.pendingQuadrantKey = quadrantKey;
    this.originalDefaults = { importance: defaultImportance, time: defaultTime }; // 存储毫秒
    
    // 设置标题
    this.editModal.querySelector('#modalTitle').textContent = i18n.getMessage('addTask');
    
    // 显示模态框
    this.editModal.classList.add('show');

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
      
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      
      this.editModal.querySelector('#editTaskDueDate').value = `${year}-${month}-${day}`;
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
    
    const dueDateObj = new Date(task.dueDate); // task.dueDate是时间戳，创建的是UTC Date对象
    
    // 将UTC Date对象转换为本地时间分量
    const year = dueDateObj.getFullYear();
    const month = String(dueDateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dueDateObj.getDate()).padStart(2, '0');
    const hours = String(dueDateObj.getHours()).padStart(2, '0');
    const minutes = String(dueDateObj.getMinutes()).padStart(2, '0');
    
    this.editModal.querySelector('#editTaskDueDate').value = `${year}-${month}-${day}`;
    this.editModal.querySelector('#editTaskDueTime').value = `${hours}:${minutes}`;
    
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
      const dueDate = this.matrixRenderer.getTimeFromXCoordinate(coordinates.x);
      
      // 计算从现在到截止时间的毫秒数
      const now = Date.now(); // 直接使用时间戳
      const timeDiff = dueDate - now; // 直接使用时间戳进行计算
      
      // 处理时间值：确保非负值
      let adjustedTimeDiff = Math.max(0, timeDiff);
      
      defaultTime = adjustedTimeDiff; // 直接使用毫秒数
      
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
      console.log(`计算的截止时间: ${dueDate.toLocaleString()}`);
      console.log(`时间差(毫秒): ${timeDiff.toFixed(0)}`);
      console.log(`调整后时间差: ${adjustedTimeDiff.toFixed(0)}`);
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
      this.onDateTimeChange();
    });
    
    this.editModal.querySelector('#editTaskDueTime').addEventListener('change', () => {
      this.onDateTimeChange();
    });
  }

  /**
   * 日期时间变化处理
   */
  onDateTimeChange() {
    console.log('onDateTimeChange: Entry. this.selectedTask:', this.selectedTask);
    console.log('onDateTimeChange: Entry. this.editModal:', this.editModal);
    if (!this.editModal || !this.selectedTask) {
      console.log('onDateTimeChange: Pre-check failed (editModal or selectedTask is null). Returning.');
      return;
    }
    
    const selectedBtn = this.editModal.querySelector('.importance-btn.selected');
    const currentImportance = selectedBtn ? parseInt(selectedBtn.dataset.importance) : 5;
    const currentDate = this.editModal.querySelector('#editTaskDueDate').value;
    const currentTime = this.editModal.querySelector('#editTaskDueTime').value;
    
    if (!currentDate || !currentTime) return;
    
    const currentDateTime = new Date(`${currentDate}T${currentTime}`);
    
    console.log('=== 日期时间变化处理 ===');
    console.log('任务标题:', this.selectedTask.title);
    console.log('新日期:', currentDate);
    console.log('新时间:', currentTime);
    console.log('新日期时间:', currentDateTime.toLocaleString());
    console.log('新重要性:', currentImportance);
    console.log('========================');
    
    // 直接重新计算坐标
    console.log('onDateTimeChange: Before calling recalculateTaskCoordinates.');
    console.log('onDateTimeChange: this.selectedTask =', this.selectedTask);
    console.log('onDateTimeChange: this.matrixRenderer =', this.matrixRenderer);
    this.recalculateTaskCoordinates(currentImportance, currentDateTime.getTime()); // 传递时间戳
    
    // 显示位置变化指示器
    this.showPositionChangeIndicator();
  }

  /**
   * 重新计算任务坐标
   */
  recalculateTaskCoordinates(importance, dueDateTimeTimestamp) { // 参数改为时间戳
    console.log('recalculateTaskCoordinates: Entry. this.selectedTask:', this.selectedTask);
    console.log('recalculateTaskCoordinates: Entry. this.matrixRenderer:', this.matrixRenderer);
    if (!this.selectedTask || !this.matrixRenderer) {
      console.log('recalculateTaskCoordinates: Pre-check failed (selectedTask or matrixRenderer is null). Returning.');
      return;
    }
    
    try {
      // 根据新的重要性计算Y坐标
      const margin = 30;
      const yAxisHeight = this.matrixRenderer.height - 2 * margin;
      const relativeImportance = (importance - 1) / 9; // 1-10转换为0-1
      const newY = margin + (1 - relativeImportance) * yAxisHeight;
      
      // 根据新的截止时间计算X坐标
      // 由于getXCoordinateFromTime需要Date对象，这里需要将时间戳转换为Date对象
      const dueDateObject = new Date(dueDateTimeTimestamp);
      const newX = this.matrixRenderer.getXCoordinateFromTime(dueDateObject);
      
      console.log('=== 重新计算任务坐标 ===');
      console.log('任务ID:', this.selectedTask.id);
      console.log('任务标题:', this.selectedTask.title);
      console.log('原坐标:', this.selectedTask.coordinates);
      console.log('新重要性:', importance);
      console.log('新截止时间 (时间戳):', dueDateTimeTimestamp);
      console.log('新截止时间 (Date对象):', dueDateObject.toLocaleString());
      console.log('新Y坐标:', newY.toFixed(2));
      console.log('新X坐标:', newX.toFixed(2));
      console.log('========================');
      
      // 存储新的坐标信息，在保存时使用
      this.recalculatedCoordinates = {
        x: newX,
        y: newY,
        importance: importance,
        dueDateTime: dueDateTimeTimestamp // 存储时间戳
      };
      
      // 立即更新当前任务的坐标属性，确保数据一致性
      if (this.selectedTask.coordinates) {
        this.selectedTask.coordinates.x = newX;
        this.selectedTask.coordinates.y = newY;
        console.log('已更新任务对象的坐标属性:', this.selectedTask.coordinates);
      } else {
        this.selectedTask.coordinates = { x: newX, y: newY };
        console.log('已创建任务对象的坐标属性:', this.selectedTask.coordinates);
      }
      
      console.log('recalculatedCoordinates 已设置:', this.recalculatedCoordinates);
      
    } catch (error) {
      console.error('重新计算坐标失败:', error);
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
        showNotification(i18n.getMessage('failedToGetFormData'), 'error');
        return;
      }

      if (!formData.title.trim()) {
        showNotification(i18n.getMessage('pleaseEnterTaskTitle'), 'warning');
        return;
      }

      this.updateStatus(i18n.getMessage('saving'));

      let result;
      if (this.selectedTask) {
        // 更新任务
        // 如果有重新计算的坐标信息，强制使用新坐标
        if (this.recalculatedCoordinates) {
          formData.coordinates = {
            x: this.recalculatedCoordinates.x,
            y: this.recalculatedCoordinates.y
          };
          console.log('强制使用重新计算的坐标更新任务:', formData.coordinates);
          
          // 确保任务对象本身的坐标也被更新
          if (this.selectedTask.coordinates) {
            this.selectedTask.coordinates.x = this.recalculatedCoordinates.x;
            this.selectedTask.coordinates.y = this.recalculatedCoordinates.y;
          } else {
            this.selectedTask.coordinates = {
              x: this.recalculatedCoordinates.x,
              y: this.recalculatedCoordinates.y
            };
          }
          console.log('任务对象坐标已同步更新:', this.selectedTask.coordinates);
        }
        
        console.log('--- saveTask 内部状态检查 ---');
        console.log('saveTask: this.recalculatedCoordinates =', this.recalculatedCoordinates);
        console.log('-----------------------------');
        
        console.log('=== 保存任务前的最终数据 ===');
        console.log('任务ID:', this.selectedTask.id);
        console.log('任务对象当前坐标:', this.selectedTask.coordinates);
        console.log('表单数据:', formData);
        console.log('===============================');
        
        result = await this.taskManager.updateTask(this.selectedTask.id, formData);
        if (result) {
          console.log('=== 任务更新成功 ===');
          console.log('更新后的任务:', result);
          console.log('===============================');
          showNotification(i18n.getMessage('taskUpdatedSuccessfully'), 'success');
          // 清除重新计算的坐标信息
          this.recalculatedCoordinates = null;
          // 通知background script任务已编辑
          await this.sendMessageToBackground('editTask');
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
          showNotification(i18n.getMessage('taskAddedSuccessfully'), 'success');
          // 通知background script任务已添加
          await this.sendMessageToBackground('addTask');
        }
      }

      if (result) {
        this.closeEditModal();
        await this.loadData();
        
        // 检查是否是从任务管理器打开的
        const isFromTaskManager = this.selectedTask?.fromTaskManager || this.fromTaskManager;
        
        if (isFromTaskManager) {
          // 清除标记
          if (this.selectedTask) {
            delete this.selectedTask.fromTaskManager;
          }
          this.fromTaskManager = false;
          
          // 获取当前在UI上选中的标签
          const activeTab = document.querySelector('#taskFilter .tab-button.active');
          const activeFilter = activeTab ? activeTab.dataset.filter : 'doing';
          
          // 确保使用当前UI选中的筛选条件
          this.currentTaskFilter = activeFilter;
          
          // 刷新Task Manager的任务列表，使用当前筛选器
          await this.setTaskManagerFilter(activeFilter);
        } else {
          // 如果不是从Task Manager打开的，但Task Manager模态框是打开的，也要刷新
          const taskManagerModal = document.getElementById('taskManagerModal');
          if (taskManagerModal && taskManagerModal.classList.contains('show')) {
            // 获取当前在UI上选中的标签
            const activeTab = document.querySelector('#taskFilter .tab-button.active');
            const activeFilter = activeTab ? activeTab.dataset.filter : 'doing';
            
            // 确保使用当前UI选中的筛选条件
            this.currentTaskFilter = activeFilter;
            
            await this.setTaskManagerFilter(activeFilter);
          }
        }
      } else {
        showNotification(i18n.getMessage('saveFailed'), 'error');
      }

    } catch (error) {
      console.error('Failed to save task:', error);
      showNotification(i18n.getMessage('saveFailed'), 'error');
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
    
    let dueDateTime;
    let storedTimestamp; // 声明在外部作用域，存储时间戳
    if (dueDate && dueTime) {
      // 解析日期和时间
      const [year, month, day] = dueDate.split('-').map(Number);
      const [hours, minutes] = dueTime.split(':').map(Number);
      
      // 创建一个本地日期时间对象
      dueDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
      
      // 将其转换为时间戳进行存储
      storedTimestamp = dueDateTime.getTime();

      console.log(`=== 任务时间处理 ===`);
      console.log(`输入日期: ${dueDate}`);
      console.log(`输入时间: ${dueTime}`);
      console.log(`解析的年月日: ${year}-${month}-${day}`);
      console.log(`解析的时分: ${hours}:${minutes}`);
      console.log(`创建的本地日期对象: ${dueDateTime.toLocaleString()}`);
      console.log(`存储的时间戳 (毫秒): ${storedTimestamp}`);
      console.log(`=====================`);
    } else {
      // 如果没有日期或时间，使用当前时间，并转换为时间戳
      dueDateTime = new Date();
      storedTimestamp = dueDateTime.getTime();
      console.log(`=== 任务时间处理 (无输入) ===`);
      console.log(`使用当前本地时间: ${dueDateTime.toLocaleString()}`);
      console.log(`存储的时间戳 (毫秒): ${storedTimestamp}`);
      console.log(`=====================`);
    }
    
    const formData = {
      title: title.trim(),
      description: description.trim(),
      importance,
      dueDate: storedTimestamp, // 使用时间戳
      category
    };
    
    // 如果是编辑模式，包含任务状态和坐标
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
      
      // 如果有重新计算的坐标，使用新坐标；否则使用原有坐标
      console.log('getTaskFormData: recalculatedCoordinates =', this.recalculatedCoordinates);
      if (this.recalculatedCoordinates) {
        formData.coordinates = {
          x: this.recalculatedCoordinates.x,
          y: this.recalculatedCoordinates.y
        };
        console.log('getTaskFormData: 使用重新计算的坐标:', formData.coordinates);
      } else if (this.selectedTask.coordinates) {
        formData.coordinates = this.selectedTask.coordinates;
        console.log('getTaskFormData: 使用原有坐标:', formData.coordinates);
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
        showNotification(i18n.getMessage('taskNotFound'), 'error');
      }
    } catch (error) {
      console.error('Failed to edit task:', error);
      showNotification(i18n.getMessage('failedToEditTask'), 'error');
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
      this.deleteTask(task.id);
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
      [i18n.getMessage('new')]: 'new',
      [i18n.getMessage('doing')]: 'doing',
      [i18n.getMessage('overdue')]: 'overdue',
      [i18n.getMessage('completed')]: 'completed',
      [i18n.getMessage('rejected')]: 'rejected'
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
    const now = Date.now(); // 直接使用时间戳
    const createdTime = task.createdAt; // 已经是时间戳
    const dueTime = task.dueDate; // 已经是时间戳
    
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
      'new': i18n.getMessage('new'),
      'doing': i18n.getMessage('doing'),
      'overdue': i18n.getMessage('overdue'),
      'completed': i18n.getMessage('completed'),
      'rejected': i18n.getMessage('rejected')
    };
    return statusMap[status] || i18n.getMessage('doing');
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
      const now = new Date(Date.now()); // 从时间戳创建Date对象用于本地化显示
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
      
      // 使用保存的筛选器状态而不是硬编码的'doing'
      const currentFilter = this.currentTaskFilter || 'doing'; // 默认为doing
      
      // 更新UI中的active状态
      document.querySelectorAll('#taskFilter .tab-button').forEach(button => {
        button.classList.remove('active');
      });
      const activeButton = document.querySelector(`#taskFilter .tab-button[data-filter="${currentFilter}"]`);
      if (activeButton) {
        activeButton.classList.add('active');
      }
      
      // 绑定搜索图标点击事件
      this.bindSearchEvents();
      // 使用保存的筛选器状态
      await this.setTaskManagerFilter(currentFilter);
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
      // 在加载数据时也应用当前的筛选器
      if (this.currentTaskFilter) {
        await this.setTaskManagerFilter(this.currentTaskFilter);
      } else {
        const tasks = await this.taskManager.getTasks();
        // 按截止时间排序：由近到远
        const sortedTasks = this.sortTasksByDueTime(tasks);
        this.renderTaskManagerList(sortedTasks);
      }
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
      // 根据当前筛选状态显示不同的空状态
      let emptyStateContent = '';
      
      switch (this.currentTaskFilter) {
        case 'doing':
          // Doing为空：显示添加任务的提示，使用蓝色图标
          emptyStateContent = `
            <div class="empty-state-icon empty-state-doing" role="button" title="${i18n.getMessage('addTask')}">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12H15" stroke="#007bff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 9L12 15" stroke="#007bff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3 12C3 4.5885 4.5885 3 12 3C19.4115 3 21 4.5885 21 12C21 19.4115 19.4115 21 12 21C4.5885 21 3 19.4115 3 12Z" stroke="#007bff" stroke-width="2"/>
              </svg>
            </div>
            <h3 class="empty-state-title">${i18n.getMessage('noTaskFound')}</h3>
            <p class="empty-state-message">${i18n.getMessage('clickPlusIconToAddFirstTask')}</p>
          `;
          break;
          
        case 'overdue':
          // Overdue为空：显示All is OK的提示，使用绿色图标
          emptyStateContent = `
            <div class="empty-state-icon empty-state-success">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 11.0857V12.0057C21.9988 14.1621 21.3005 16.2604 20.0093 17.9875C18.7182 19.7147 16.9033 20.9782 14.8354 21.5896C12.7674 22.201 10.5573 22.1276 8.53447 21.3803C6.51168 20.633 4.78465 19.2518 3.61096 17.4428C2.43727 15.6338 1.87979 13.4938 2.02168 11.342C2.16356 9.19029 2.99721 7.14205 4.39828 5.5028C5.79935 3.86354 7.69279 2.72111 9.79619 2.24587C11.8996 1.77063 14.1003 1.98806 16.07 2.86572" stroke="#6FCF97" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M22 4L12 14.01L9 11.01" stroke="#6FCF97" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3 class="empty-state-title">${i18n.getMessage('allCaughtUp')}</h3>
            <p class="empty-state-message">${i18n.getMessage('noOverdueTasksGreatJob')}</p>
          `;
          break;
          
        case 'completed':
          // Completed为空：显示提示用户如何标记任务为完成的信息，使用蓝色图标
          emptyStateContent = `
            <div class="empty-state-icon empty-state-info">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#56CCF2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 16V12" stroke="#56CCF2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 8H12.01" stroke="#56CCF2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3 class="empty-state-title">${i18n.getMessage('noCompletedTasks')}</h3>
            <p class="empty-state-message">${i18n.getMessage('doubleClickTaskAndClickStatus')}</p>
          `;
          break;
          
        case 'rejected':
          // Rejected为空：显示提示用户如何标记任务为拒绝的信息，使用深灰色图标
          emptyStateContent = `
            <div class="empty-state-icon empty-state-muted">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="#8A2BE2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9 9L15 15" stroke="#8A2BE2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M15 9L9 15" stroke="#8A2BE2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3 class="empty-state-title">${i18n.getMessage('noRejectedTasks')}</h3>
            <p class="empty-state-message">${i18n.getMessage('doubleClickTaskAndClickStatusTwice')}</p>
          `;
          break;
          
        default:
          // 默认情况：通用的没有找到任务提示
          emptyStateContent = `
            <div class="empty-state-icon" role="button" title="${i18n.getMessage('addTask')}">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12H15" stroke="#8E9AAF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 9L12 15" stroke="#8E9AAF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3 12C3 4.5885 4.5885 3 12 3C19.4115 3 21 4.5885 21 12C21 19.4115 19.4115 21 12 21C4.5885 21 3 19.4115 3 12Z" stroke="#8E9AAF" stroke-width="2"/>
              </svg>
            </div>
            <h3 class="empty-state-title">${i18n.getMessage('noTaskFound')}</h3>
          `;
      }
      
      taskList.innerHTML = `<div class="empty-state">${emptyStateContent}</div>`;
      
      // 为Doing状态下的SVG图标添加点击事件
      if (this.currentTaskFilter === 'doing' || this.currentTaskFilter === 'all') {
        const addTaskIcon = taskList.querySelector('.empty-state-icon');
        if (addTaskIcon) {
          addTaskIcon.addEventListener('click', () => {
            this.showAddTaskModal(); // 直接打开添加任务模态框
          });
        }
      }
      
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
    
    // 根据重要性和紧急程度添加状态类 (仅用于UI展示，不影响实际状态)
    const importance = parseInt(task.importance);
    // 紧急程度判断应基于getQuadrantKey的逻辑，但这里为简化UI，我们直接根据getTimeRemaining()判断
    const timeRemainingMs = task.getTimeRemaining(); // 毫秒
    // 假设紧急阈值为24小时 (可以通过设置获取)
    const urgentThresholdMs = 24 * 60 * 60 * 1000; // 24小时转换为毫秒
    
    const isImportant = importance >= 5.5;
    const isUrgent = timeRemainingMs <= urgentThresholdMs;

    if (task.status === 'completed') {
      statusClass += ' status-completed';
    } else if (task.status === 'rejected') {
      statusClass += ' status-rejected';
    } else if (task.isOverdue()) {
      statusClass += ' status-overdue';
    } else if (isImportant && isUrgent) {
      statusClass += ' status-doing important-urgent';
    } else if (isImportant && !isUrgent) {
      statusClass += ' status-doing important-not-urgent';
    } else if (!isImportant && isUrgent) {
      statusClass += ' status-doing not-important-urgent';
    } else { // Not Important & Not Urgent
      statusClass += ' status-doing not-important-not-urgent';
    }
    
    taskDiv.className = `task-item ${statusClass}`;
    taskDiv.dataset.taskId = task.id;

    const timeText = task.getTimeRemainingText();
    const starRatingHTML = this.createStarRating(task.importance);
    const description = task.description ? task.description.trim() : '';

    taskDiv.innerHTML = `
      <div class="task-item-content">
        <div class="task-item-title">${i18n.getMessage('task')} ${task.title}</div>
        <div class="task-item-description">${description}</div>
        <div class="task-item-meta">
          <div class="task-item-importance">
            <span>${i18n.getMessage('importance')}</span>
            <div class="star-rating">
              ${starRatingHTML}
            </div>
          </div>
          <div class="task-item-time">
            <span>${timeText}</span>
          </div>
        </div>
      </div>
    `;

    // 绑定双击事件
    taskDiv.addEventListener('dblclick', (e) => {
      // 现在没有 actions 按钮了，可以直接触发编辑
      this.editTaskFromManager(task.id);
    });
    
    // 移除操作按钮事件绑定，因为这些按钮已从HTML中移除
    // const editBtn = taskDiv.querySelector('.edit-task-btn');
    // if (editBtn) { editBtn.removeEventListener('click', ...); }
    // const completeBtn = taskDiv.querySelector('.complete-task-btn');
    // if (completeBtn) { completeBtn.removeEventListener('click', ...); }
    // const deleteBtn = taskDiv.querySelector('.delete-task-btn');
    // if (deleteBtn) { deleteBtn.removeEventListener('click', ...); }

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
    this.currentTaskFilter = filter; // 更新当前筛选器状态

    // 更新UI中的active状态
    document.querySelectorAll('#taskFilter .tab-button').forEach(button => {
      button.classList.remove('active');
    });
    const activeButton = document.querySelector(`#taskFilter .tab-button[data-filter="${filter}"]`);
    if (activeButton) {
      activeButton.classList.add('active');
    }

    // 获取过滤后的任务
    let tasks = await this.taskManager.getTasks();
    
    switch (filter) {
      case 'doing':
        tasks = tasks.filter(task => {
          // 仅筛选状态为 'doing' 且未过期的任务
          return task.status === 'doing' && !task.isOverdue();
        });
        break;
      case 'overdue':
        tasks = tasks.filter(task => {
          // 仅筛选状态为 'doing' 且已过期的任务
          return task.status === 'doing' && task.isOverdue();
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

    // 根据用户选择的排序类型和顺序对任务进行排序
    const sortedTasks = [...tasks].sort((a, b) => {
      let aValue, bValue;

      switch (this.sortState.sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'importance':
          aValue = a.importance;
          bValue = b.importance;
          break;
        case 'dueDate':
          aValue = a.dueDate; // 已经是时间戳，直接比较
          bValue = b.dueDate; // 已经是时间戳，直接比较
          break;
        case 'createdAt':
          aValue = a.createdAt; // 已经是时间戳，直接比较
          bValue = b.createdAt; // 已经是时间戳，直接比较
          break;
        case 'updatedAt':
          aValue = a.updatedAt; // 已经是时间戳，直接比较
          bValue = b.updatedAt; // 已经是时间戳，直接比较
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a[this.sortState.sortBy];
          bValue = b[this.sortState.sortBy];
      }

      if (this.sortState.sortOrder === 'desc') {
        [aValue, bValue] = [bValue, aValue];
      }

      if (aValue < bValue) return -1;
      if (aValue > bValue) return 1;
      return 0;
    });

    // 更新UI
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

      const lowerCaseQuery = query.toLowerCase();
      const tasks = await this.taskManager.getTasks();
      const filteredTasks = tasks.filter(task => 
        task.title.toLowerCase().includes(lowerCaseQuery) ||
        task.description.toLowerCase().includes(lowerCaseQuery) ||
        task.getTimeRemainingText().toLowerCase().includes(lowerCaseQuery) // 添加对过期时间的搜索
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
      showNotification(i18n.getMessage('taskCompletedSuccessfully'), 'success');
    } catch (error) {
      console.error('完成任务失败:', error);
      showNotification(i18n.getMessage('failedToCompleteTask'), 'error');
    }
  }

  /**
  * 从编辑模态框删除任务
  */
  async deleteTask(taskId) {
    try {
      const confirmed = await confirmDialog(i18n.getMessage('areYouSureDeleteTask'), i18n.getMessage('deleteTask'));
      if (confirmed) {
        const success = await this.taskManager.deleteTask(taskId);
        if (success) {
          showNotification(i18n.getMessage('taskDeletedSuccessfully'), 'success');
          await this.loadTaskManagerData();
          await this.loadData();
          this.closeEditModal();
          // 通知background script任务已删除
          await this.sendMessageToBackground('deleteTask');
        } else {
          showNotification(i18n.getMessage('failedToDeleteTask'), 'error');
        }
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      showNotification(i18n.getMessage('failedToDeleteTask'), 'error');
    }
  }

  /**
   * 加载设置
   */
  async loadSettings() {
    try {
      const settings = await this.storageManager.getSettings();
      
      // 紧急任务提醒配置
      const enableUrgentReminderEl = document.getElementById('enableUrgentReminder');
      if (enableUrgentReminderEl) {
        enableUrgentReminderEl.checked = settings.enableUrgentReminder !== false;
      }
      
      const urgentReminderThresholdEl = document.getElementById('urgentReminderThreshold');
      if (urgentReminderThresholdEl) {
        urgentReminderThresholdEl.value = settings.urgentReminderThreshold || 30;
      }
      
      const urgentReminderIntervalEl = document.getElementById('urgentReminderInterval');
      if (urgentReminderIntervalEl) {
        urgentReminderIntervalEl.value = settings.urgentReminderInterval || 10;
      }
      
      // 图标提醒配置
      const enableIconBadgeEl = document.getElementById('enableIconBadge');
      if (enableIconBadgeEl) {
        enableIconBadgeEl.checked = settings.enableIconBadge !== false;
      }
      
      const enableIconTitleEl = document.getElementById('enableIconTitle');
      if (enableIconTitleEl) {
        enableIconTitleEl.checked = settings.enableIconTitle !== false;
      }
      
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
        // 紧急任务提醒配置
        enableUrgentReminder: formData.get('enableUrgentReminder') === 'on',
        urgentReminderThreshold: parseInt(formData.get('urgentReminderThreshold')) || 30,
        urgentReminderInterval: parseInt(formData.get('urgentReminderInterval')) || 10,
        
        // 图标提醒配置
        enableIconBadge: formData.get('enableIconBadge') === 'on',
        enableIconTitle: formData.get('enableIconTitle') === 'on',
        
        // 保留其他设置的默认值
        enableNotifications: true,
        notificationSound: true,
        theme: 'light',
        language: 'en-US'
      };

      await this.storageManager.saveSettings(settings);
      this.closeSettingsModal();
      showNotification(i18n.getMessage('settingsSavedSuccessfully'), 'success');
      
      // 通知background script设置已更新
      if (browserAPI.runtime?.id) {
        try {
          await browserAPI.runtime.sendMessage({ 
            type: 'settingsUpdated', 
            settings: settings 
          });
        } catch (error) {
          console.log('无法通知background script设置更新:', error);
        }
      }
      
    } catch (error) {
      console.error('保存设置失败:', error);
      showNotification(i18n.getMessage('failedToSaveSettings'), 'error');
    }
  }

  /**
   * 销毁应用
   */
  destroy() {
    this.matrixManager.destroy();
    this.matrixRenderer = null;
  }

  /**
   * 绑定搜索相关事件
   */
  bindSearchEvents() {
    const searchIcon = document.getElementById('searchIcon');
    const searchContainer = searchIcon ? searchIcon.closest('.search-container') : null;
    const searchInput = document.getElementById('taskSearch');
    
    // 移除可能存在的旧事件监听器
    if (searchIcon) {
      const newSearchIcon = searchIcon.cloneNode(true);
      if (searchIcon.parentNode) {
        searchIcon.parentNode.replaceChild(newSearchIcon, searchIcon);
      }
      
      // 绑定新的点击事件
      newSearchIcon.addEventListener('click', (e) => {
        console.log('Search icon clicked'); // 调试日志
        if (searchContainer) {
          searchContainer.classList.toggle('active');
          if (searchContainer.classList.contains('active')) {
            searchInput.classList.remove('collapsed');
            searchInput.focus(); // 自动聚焦输入框
          } else {
            searchInput.classList.add('collapsed');
            searchInput.value = ''; // 折叠时清空搜索内容
            this.searchTasks(''); // 重置搜索，显示所有任务
          }
        }
        e.stopPropagation(); // 阻止事件冒泡
      });
    }
    
    // 重新绑定搜索输入事件
    if (searchInput) {
      // 移除可能存在的旧事件监听器
      const newSearchInput = searchInput.cloneNode(true);
      if (searchInput.parentNode) {
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);
      }
      
      // 绑定输入事件
      newSearchInput.addEventListener('input', debounce((e) => {
        this.searchTasks(e.target.value);
      }, 300));
      
      // 添加键盘事件，按ESC关闭搜索框
      newSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (searchContainer) {
            searchContainer.classList.remove('active');
            newSearchInput.classList.add('collapsed');
            newSearchInput.value = '';
            this.searchTasks(''); // 重置搜索结果
          }
          e.preventDefault();
          e.stopPropagation();
        }
      });
    }
    
    // 点击其他区域关闭搜索框
    const handleClickOutside = (e) => {
      if (searchContainer && !searchContainer.contains(e.target) && searchContainer.classList.contains('active')) {
        searchContainer.classList.remove('active');
        if (searchInput) {
          searchInput.classList.add('collapsed');
          // 如果搜索框为空，重置搜索
          if (!searchInput.value.trim()) {
            this.searchTasks('');
          }
        }
      }
    };
    
    // 移除旧的事件监听器，避免重复绑定
    document.removeEventListener('click', handleClickOutside);
    document.addEventListener('click', handleClickOutside);
  }

  /**
   * 从任务管理器添加任务
   */
  /**
   * 发送消息到background script
   */
  async sendMessageToBackground(messageType) {
    try {
      const response = await browserAPI.runtime.sendMessage({ type: messageType });
      console.log(`Message ${messageType} sent to background:`, response);
    } catch (error) {
      console.error(`Failed to send ${messageType} message to background:`, error);
    }
  }

  addTaskFromManager() {
    // 不关闭Task Manager模态框，让添加任务模态框在Task Manager之上显示
    this.selectedTask = null;
    
    // 创建动态编辑模态框
    this.createEditModal();
    
    // 重置表单
    this.resetTaskForm();
    
    // 设置标题
    this.editModal.querySelector('#modalTitle').textContent = i18n.getMessage('addTask');
    
    // 隐藏编辑模式特有的元素
    this.hideEditModeElements();
    
    // 标记来源为Task Manager
    this.fromTaskManager = true;
    
    // 显示模态框
    this.editModal.classList.add('show');
  }

  /**
   * 显示报告模态框
   */
  async showReportModal() {
    await this.reportManager.showReport();
  }

  /**
   * 关闭报告模态框
   */
  closeReportModal() {
    const modal = document.getElementById('reportModal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  /**
   * 格式化日期
   */
  formatDate(date, period) {
    if (period === 'week') {
      // 格式化为 "MM/DD" 格式
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${month}/${day}`;
    } else {
      // 格式化为 "YYYY-MM" 格式
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    }
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