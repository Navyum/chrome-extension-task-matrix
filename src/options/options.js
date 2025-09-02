/**
 * 设置页面逻辑
 */
import './options.css';
import { StorageManager } from '../services/StorageManager.js';
import { showNotification, confirmDialog, formatDate } from '../utils/helpers.js'; // 导入formatDate

class OptionsPage {
  constructor() {
    this.storageManager = new StorageManager();
    this.settings = {};
    
    this.init();
  }

  /**
   * 初始化设置页面
   */
  async init() {
    try {
      // 加载设置
      await this.loadSettings();
      
      // 绑定事件
      this.bindEvents();
      
      // 更新存储使用情况
      await this.updateStorageUsage();
      
      // 更新版本信息
      this.updateVersionInfo();
      
    } catch (error) {
      console.error('初始化设置页面失败:', error);
      showNotification('加载设置失败', 'error');
    }
  }

  /**
   * 加载设置
   */
  async loadSettings() {
    try {
      this.settings = await this.storageManager.getSettings();
      this.populateForm();
    } catch (error) {
      console.error('加载设置失败:', error);
      this.settings = this.storageManager.getDefaultSettings();
      this.populateForm();
    }
  }

  /**
   * 填充表单
   */
  populateForm() {
    // 基本设置
    document.getElementById('theme').value = this.settings.theme || 'light';
    document.getElementById('language').value = this.settings.language || 'zh-CN';
    document.getElementById('defaultImportance').value = this.settings.defaultImportance || 3;
    document.getElementById('defaultCategory').value = this.settings.defaultCategory || 'default';
    
    // 通知设置
    document.getElementById('notifications').checked = this.settings.notifications !== false;
    document.getElementById('dailyReminder').checked = this.settings.dailyReminder !== false;
    document.getElementById('overdueAlert').checked = this.settings.overdueAlert !== false;
    document.getElementById('reminderTime').value = this.settings.reminderTime || '09:00';
    
    // 矩阵设置
    document.getElementById('autoRefresh').checked = this.settings.autoRefresh !== false;
    document.getElementById('refreshInterval').value = this.settings.refreshInterval || 5;
    document.getElementById('urgentThreshold').value = this.settings.urgentThreshold || 24;
    document.getElementById('showCompleted').checked = this.settings.showCompleted || false;
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 保存设置
    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveSettings();
    });

    // 重置设置
    document.getElementById('resetSettings').addEventListener('click', () => {
      this.resetSettings();
    });

    // 导出数据
    document.getElementById('exportData').addEventListener('click', () => {
      this.exportData();
    });

    // 导入数据
    document.getElementById('importData').addEventListener('click', () => {
      this.importData();
    });

    // 清空数据
    document.getElementById('clearData').addEventListener('click', () => {
      this.clearData();
    });

    // 检查更新
    document.getElementById('checkUpdate').addEventListener('click', () => {
      this.checkUpdate();
    });

    // 打开帮助
    document.getElementById('openHelp').addEventListener('click', () => {
      this.openHelp();
    });

    // 确认对话框
    document.getElementById('cancelConfirm').addEventListener('click', () => {
      this.hideConfirmModal();
    });

    document.getElementById('confirmAction').addEventListener('click', () => {
      this.executeConfirmedAction();
    });
  }

  /**
   * 保存设置
   */
  async saveSettings() {
    try {
      const newSettings = this.collectFormData();
      
      const success = await this.storageManager.saveSettings(newSettings);
      
      if (success) {
        this.settings = newSettings;
        showNotification('设置保存成功', 'success');
      } else {
        showNotification('保存设置失败', 'error');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      showNotification('保存设置失败', 'error');
    }
  }

  /**
   * 收集表单数据
   */
  collectFormData() {
    return {
      // 基本设置
      theme: document.getElementById('theme').value,
      language: document.getElementById('language').value,
      defaultImportance: parseInt(document.getElementById('defaultImportance').value),
      defaultCategory: document.getElementById('defaultCategory').value,
      
      // 通知设置
      notifications: document.getElementById('notifications').checked,
      dailyReminder: document.getElementById('dailyReminder').checked,
      overdueAlert: document.getElementById('overdueAlert').checked,
      reminderTime: document.getElementById('reminderTime').value,
      
      // 矩阵设置
      autoRefresh: document.getElementById('autoRefresh').checked,
      refreshInterval: parseInt(document.getElementById('refreshInterval').value),
      urgentThreshold: parseInt(document.getElementById('urgentThreshold').value),
      showCompleted: document.getElementById('showCompleted').checked
    };
  }

  /**
   * 重置设置
   */
  async resetSettings() {
    try {
      const confirmed = await confirmDialog(
        '确定要重置所有设置吗？这将恢复默认设置。',
        '重置设置'
      );
      
      if (confirmed) {
        this.settings = this.storageManager.getDefaultSettings();
        this.populateForm();
        
        const success = await this.storageManager.saveSettings(this.settings);
        
        if (success) {
          showNotification('设置已重置', 'success');
        } else {
          showNotification('重置设置失败', 'error');
        }
      }
    } catch (error) {
      console.error('重置设置失败:', error);
      showNotification('重置设置失败', 'error');
    }
  }

  /**
   * 导出数据
   */
  async exportData() {
    try {
      const data = await this.storageManager.getSettings();
      if (data) {
        const filename = `taskmatrix-settings-${formatDate(Date.now())}.json`; // 使用formatDate辅助函数
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showNotification('Settings exported successfully', 'success');
      } else {
        showNotification('No settings to export', 'warning');
      }
    } catch (error) {
      console.error('导出数据失败:', error);
      showNotification('导出失败', 'error');
    }
  }

  /**
   * 导入数据
   */
  async importData() {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = JSON.parse(e.target.result);
            const success = await this.storageManager.importData(data);
            
            if (success) {
              showNotification('数据导入成功', 'success');
              // 重新加载设置
              await this.loadSettings();
              await this.updateStorageUsage();
            } else {
              showNotification('导入失败', 'error');
            }
          } catch (error) {
            console.error('解析文件失败:', error);
            showNotification('文件格式错误', 'error');
          }
        };
        reader.readAsText(file);
      };
      
      input.click();
    } catch (error) {
      console.error('导入数据失败:', error);
      showNotification('导入失败', 'error');
    }
  }

  /**
   * 清空数据
   */
  async clearData() {
    try {
      this.showConfirmModal(
        '清空所有数据',
        '确定要清空所有任务和设置数据吗？此操作不可恢复！',
        'clearData'
      );
    } catch (error) {
      console.error('清空数据失败:', error);
      showNotification('操作失败', 'error');
    }
  }

  /**
   * 执行确认的操作
   */
  async executeConfirmedAction() {
    const action = this.confirmModalAction;
    
    try {
      switch (action) {
        case 'clearData':
          { // 块级作用域
            const success = await this.storageManager.clearTasks();
            if (success) {
              showNotification('数据已清空', 'success');
            } else {
              showNotification('清空数据失败', 'error');
            }
          }
          break;
      }
    } catch (error) {
      console.error('执行操作失败:', error);
      showNotification('操作失败', 'error');
    }
    
    this.hideConfirmModal();
  }

  /**
   * 显示确认对话框
   */
  showConfirmModal(title, message, action) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    this.confirmModalAction = action;
    
    const modal = document.getElementById('confirmModal');
    modal.classList.add('show');
  }

  /**
   * 隐藏确认对话框
   */
  hideConfirmModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.remove('show');
    this.confirmModalAction = null;
  }

  /**
   * 检查更新
   */
  async checkUpdate() {
    try {
      // 这里可以添加检查更新的逻辑
      showNotification('当前已是最新版本', 'info');
    } catch (error) {
      console.error('检查更新失败:', error);
      showNotification('检查更新失败', 'error');
    }
  }

  /**
   * 打开帮助
   */
  openHelp() {
    // 打开帮助页面或显示帮助信息
    window.open('https://github.com/your-username/taskmatrix-pro/wiki', '_blank');
  }

  /**
   * 更新存储使用情况
   */
  async updateStorageUsage() {
    try {
      const usage = await this.storageManager.getStorageUsage();
      
      if (usage) {
        const usageText = `
          总大小: ${usage.totalKB} KB (${usage.totalMB} MB)
          字节数: ${usage.totalBytes}
        `;
        document.getElementById('storageUsage').textContent = usageText;
      } else {
        document.getElementById('storageUsage').textContent = '无法获取存储信息';
      }
    } catch (error) {
      console.error('获取存储使用情况失败:', error);
      document.getElementById('storageUsage').textContent = '获取存储信息失败';
    }
  }

  /**
   * 更新版本信息
   */
  updateVersionInfo() {
    try {
      const manifest = chrome.runtime.getManifest();
      document.getElementById('version').textContent = manifest.version;
    } catch (error) {
      console.error('获取版本信息失败:', error);
      document.getElementById('version').textContent = '1.0.0';
    }
  }

  /**
   * 应用主题
   */
  applyTheme(theme) {
    const body = document.body;
    
    // 移除现有主题类
    body.classList.remove('theme-light', 'theme-dark');
    
    // 添加新主题类
    if (theme === 'dark') {
      body.classList.add('theme-dark');
    } else {
      body.classList.add('theme-light');
    }
  }

  /**
   * 监听设置变化
   */
  setupSettingsListener() {
    // 监听主题变化
    document.getElementById('theme').addEventListener('change', (e) => {
      this.applyTheme(e.target.value);
    });
    
    // 监听语言变化
    document.getElementById('language').addEventListener('change', (e) => {
      // 这里可以添加语言切换逻辑
      console.log('语言切换为:', e.target.value);
    });
  }
}

// 初始化设置页面
document.addEventListener('DOMContentLoaded', () => {
  window.optionsPage = new OptionsPage();
}); 