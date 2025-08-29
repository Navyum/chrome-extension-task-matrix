/**
 * 任务管理页面逻辑
 */
import './task-manager.css';
import { StorageManager } from '../services/StorageManager.js';
import { TaskManager } from '../services/TaskManager.js';
import { showNotification, confirmDialog } from '../utils/helpers.js';

class TaskManagerApp {
  constructor() {
    this.storageManager = new StorageManager();
    this.taskManager = new TaskManager();
    this.currentFilter = 'all';
    this.selectedTaskId = null;
    this.isEditing = false;
    
    this.init();
  }

  async init() {
    await this.loadData();
    this.bindEvents();
    this.loadTaskList();
    this.updateStatistics();
    this.updateStatus('就绪');
  }

  bindEvents() {
    // 返回按钮
    document.getElementById('backBtn').addEventListener('click', () => {
      window.close();
    });

    // 设置按钮
    document.getElementById('settingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // 添加任务按钮
    document.getElementById('addTaskBtn').addEventListener('click', () => {
      this.showAddTaskModal();
    });

    // 筛选按钮
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setFilter(e.target.dataset.filter);
      });
    });

    // 导出按钮
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportData();
    });

    // 导入按钮
    document.getElementById('importBtn').addEventListener('click', () => {
      this.importData();
    });

    // 帮助按钮
    document.getElementById('helpBtn').addEventListener('click', () => {
      this.showHelpModal();
    });

    // 任务表单事件
    document.getElementById('taskForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTask();
    });

    // 取消按钮
    document.getElementById('cancelTask').addEventListener('click', () => {
      this.closeModal();
    });

    // 关闭弹窗
    document.getElementById('closeModal').addEventListener('click', () => {
      this.closeModal();
    });

    // 关闭帮助弹窗
    document.getElementById('closeHelpModal').addEventListener('click', () => {
      this.closeHelpModal();
    });

    // 重要性选择器
    document.querySelectorAll('.importance-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectImportance(e.target.dataset.importance);
      });
    });

    // 颜色选择器
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectColor(e.target.dataset.color);
      });
    });

    // 键盘事件
    document.addEventListener('keydown', (e) => {
      this.handleKeyboard(e);
    });

    // 任务管理器事件
    this.taskManager.addEventListener('taskAdded', () => {
      this.loadTaskList();
      this.updateStatistics();
    });

    this.taskManager.addEventListener('taskUpdated', () => {
      this.loadTaskList();
      this.updateStatistics();
    });

    this.taskManager.addEventListener('taskDeleted', () => {
      this.loadTaskList();
      this.updateStatistics();
    });
  }

  async loadData() {
    try {
      const tasks = await this.storageManager.getTasks();
      this.taskManager.loadTasks(tasks);
      this.updateStatus('数据加载完成');
    } catch (error) {
      console.error('加载数据失败:', error);
      this.updateStatus('数据加载失败');
    }
  }

  loadTaskList() {
    const taskList = document.getElementById('taskList');
    const tasks = this.taskManager.getTasks();
    const filteredTasks = this.filterTasks(tasks);

    taskList.innerHTML = '';

    if (filteredTasks.length === 0) {
      taskList.innerHTML = '<div class="empty-state">暂无任务</div>';
      return;
    }

    filteredTasks.forEach(task => {
      const taskItem = this.createTaskItem(task);
      taskList.appendChild(taskItem);
    });
  }

  createTaskItem(task) {
    const taskItem = document.createElement('div');
    taskItem.className = `task-item ${task.status} ${task.id === this.selectedTaskId ? 'selected' : ''}`;
    taskItem.dataset.taskId = task.id;

    const importanceStars = '★'.repeat(task.importance);
    const timeRemaining = this.formatTimeRemaining(task.dueDate);

    taskItem.innerHTML = `
      <div class="task-title">${task.title}</div>
      <div class="task-meta">
        <div class="task-importance">${importanceStars}</div>
        <div>${timeRemaining}</div>
      </div>
    `;

    taskItem.addEventListener('click', () => {
      this.selectTask(task.id);
    });

    taskItem.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showTaskContextMenu(e, task);
    });

    return taskItem;
  }

  selectTask(taskId) {
    // 移除之前的选中状态
    document.querySelectorAll('.task-item').forEach(item => {
      item.classList.remove('selected');
    });

    // 添加新的选中状态
    const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskItem) {
      taskItem.classList.add('selected');
    }

    this.selectedTaskId = taskId;
    this.showTaskDetails(taskId);
  }

  showTaskDetails(taskId) {
    const task = this.taskManager.getTaskById(taskId);
    const taskDetails = document.getElementById('taskDetails');

    if (!task) {
      taskDetails.innerHTML = `
        <div class="empty-state">
          <h3>任务不存在</h3>
          <p>该任务可能已被删除</p>
        </div>
      `;
      return;
    }

    const importanceStars = '★'.repeat(task.importance);
    const timeRemaining = this.formatTimeRemaining(task.dueDate);
    const statusText = this.getStatusText(task.status);

    taskDetails.innerHTML = `
      <div class="task-detail-content">
        <div class="task-detail-header">
          <h3>${task.title}</h3>
          <div class="task-detail-actions">
            <button class="btn btn-secondary" onclick="taskManagerApp.editTask('${task.id}')">编辑</button>
            <button class="btn btn-secondary" onclick="taskManagerApp.deleteTask('${task.id}')">删除</button>
          </div>
        </div>
        <div class="task-detail-info">
          <div class="info-item">
            <label>描述:</label>
            <p>${task.description || '无描述'}</p>
          </div>
          <div class="info-item">
            <label>重要性:</label>
            <span class="importance-stars">${importanceStars}</span>
          </div>
          <div class="info-item">
            <label>完成时间:</label>
            <span>${new Date(task.dueDate).toLocaleString()}</span>
          </div>
          <div class="info-item">
            <label>剩余时间:</label>
            <span>${timeRemaining}</span>
          </div>
          <div class="info-item">
            <label>分类:</label>
            <span>${this.getCategoryText(task.category)}</span>
          </div>
          <div class="info-item">
            <label>状态:</label>
            <span class="status-badge ${task.status}">${statusText}</span>
          </div>
        </div>
      </div>
    `;
  }

  filterTasks(tasks) {
    switch (this.currentFilter) {
      case 'pending':
        return tasks.filter(task => task.status === 'pending');
      case 'completed':
        return tasks.filter(task => task.status === 'completed');
      case 'overdue':
        return tasks.filter(task => task.isOverdue());
      default:
        return tasks;
    }
  }

  setFilter(filter) {
    this.currentFilter = filter;
    
    // 更新筛选按钮状态
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    
    this.loadTaskList();
  }

  updateStatistics() {
    const tasks = this.taskManager.getTasks();
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('completedTasks').textContent = completedTasks;
    document.getElementById('completionRate').textContent = `${completionRate}%`;
  }

  showAddTaskModal() {
    this.isEditing = false;
    this.resetTaskForm();
    this.setDefaultDate();
    document.getElementById('modalTitle').textContent = '添加新任务';
    document.getElementById('taskModal').classList.add('show');
  }

  editTask(taskId) {
    const task = this.taskManager.getTaskById(taskId);
    if (!task) return;

    this.isEditing = true;
    this.fillTaskForm(task);
    document.getElementById('modalTitle').textContent = '编辑任务';
    document.getElementById('taskModal').classList.add('show');
  }

  resetTaskForm() {
    document.getElementById('taskForm').reset();
    document.querySelectorAll('.importance-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    
    // 设置默认值
    document.querySelector('[data-importance="5"]').classList.add('selected');
    document.querySelector('[data-color="#3B82F6"]').classList.add('selected');
  }

  fillTaskForm(task) {
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskCategory').value = task.category;
    
    // 设置重要性
    document.querySelectorAll('.importance-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    document.querySelector(`[data-importance="${task.importance}"]`).classList.add('selected');
    
    // 设置颜色
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    document.querySelector(`[data-color="${task.color}"]`).classList.add('selected');
    
    // 设置日期和时间
    const dueDate = new Date(task.dueDate);
    document.getElementById('taskDueDate').value = dueDate.toISOString().split('T')[0];
    document.getElementById('taskDueTime').value = dueDate.toTimeString().slice(0, 5);
  }

  selectImportance(importance) {
    document.querySelectorAll('.importance-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    document.querySelector(`[data-importance="${importance}"]`).classList.add('selected');
  }

  selectColor(color) {
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    document.querySelector(`[data-color="${color}"]`).classList.add('selected');
  }

  setDefaultDate() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    document.getElementById('taskDueDate').value = tomorrow.toISOString().split('T')[0];
    document.getElementById('taskDueTime').value = '09:00';
  }

  async saveTask() {
    const formData = this.getTaskFormData();
    
    if (!formData.title.trim()) {
      showNotification('请输入任务标题', 'error');
      return;
    }

    try {
      if (this.isEditing) {
        // 编辑现有任务
        const task = this.taskManager.getTaskById(this.selectedTaskId);
        if (task) {
          Object.assign(task, formData);
          await this.taskManager.updateTask(task);
          showNotification('任务更新成功', 'success');
        }
      } else {
        // 添加新任务
        await this.taskManager.addTask(formData);
        showNotification('任务添加成功', 'success');
      }
      
      this.closeModal();
    } catch (error) {
      console.error('保存任务失败:', error);
      showNotification('保存任务失败', 'error');
    }
  }

  getTaskFormData() {
    const selectedImportance = document.querySelector('.importance-btn.selected');
    const selectedColor = document.querySelector('.color-btn.selected');
    
    const dueDate = document.getElementById('taskDueDate').value;
    const dueTime = document.getElementById('taskDueTime').value;
    const dueDateTime = new Date(`${dueDate}T${dueTime}`);

    return {
      title: document.getElementById('taskTitle').value.trim(),
      description: document.getElementById('taskDescription').value.trim(),
      importance: parseInt(selectedImportance?.dataset.importance || '5'),
      dueDate: dueDateTime.toISOString(),
      category: document.getElementById('taskCategory').value,
      color: selectedColor?.dataset.color || '#3B82F6'
    };
  }

  async deleteTask(taskId) {
    const confirmed = await confirmDialog('确定要删除这个任务吗？', '删除任务');
    if (!confirmed) return;

    try {
      await this.taskManager.deleteTask(taskId);
      showNotification('任务删除成功', 'success');
      
      if (this.selectedTaskId === taskId) {
        this.selectedTaskId = null;
        document.getElementById('taskDetails').innerHTML = `
          <div class="empty-state">
            <h3>选择任务查看详情</h3>
            <p>从左侧任务列表中选择一个任务来查看详细信息</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('删除任务失败:', error);
      showNotification('删除任务失败', 'error');
    }
  }

  showTaskContextMenu(event, task) {
    // 这里可以实现右键菜单功能
    console.log('右键菜单:', task);
  }

  async exportData() {
    try {
      const data = await this.storageManager.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `taskmatrix-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      showNotification('数据导出成功', 'success');
    } catch (error) {
      console.error('导出数据失败:', error);
      showNotification('导出数据失败', 'error');
    }
  }

  async importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        await this.storageManager.importData(data);
        await this.loadData();
        
        showNotification('数据导入成功', 'success');
      } catch (error) {
        console.error('导入数据失败:', error);
        showNotification('导入数据失败', 'error');
      }
    };
    
    input.click();
  }

  showHelpModal() {
    document.getElementById('helpModal').classList.add('show');
  }

  closeModal() {
    document.getElementById('taskModal').classList.remove('show');
  }

  closeHelpModal() {
    document.getElementById('helpModal').classList.remove('show');
  }

  handleKeyboard(event) {
    if (event.key === 'Escape') {
      this.closeModal();
      this.closeHelpModal();
    }
  }

  updateStatus(message) {
    document.getElementById('statusText').textContent = message;
  }

  formatTimeRemaining(dueDate) {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due - now;
    
    if (diff < 0) {
      return '已超期';
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}天${hours}小时`;
    } else if (hours > 0) {
      return `${hours}小时`;
    } else {
      return '即将到期';
    }
  }

  getStatusText(status) {
    const statusMap = {
      pending: '未完成',
      completed: '已完成',
      cancelled: '已取消'
    };
    return statusMap[status] || status;
  }

  getCategoryText(category) {
    const categoryMap = {
      work: '工作',
      personal: '个人',
      study: '学习',
      health: '健康',
      other: '其他'
    };
    return categoryMap[category] || category;
  }
}

// 初始化应用
const taskManagerApp = new TaskManagerApp(); 