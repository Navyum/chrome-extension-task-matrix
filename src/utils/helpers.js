/**
 * 通用工具函数
 */

/**
 * 防抖函数
 */
export function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
}

/**
 * 节流函数
 */
export function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 格式化日期
 */
export function formatDate(date) {
  const d = new Date(date); // date可以是时间戳，所以这里是正确的
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化时间
 */
export function formatTime(date) {
  const d = new Date(date); // date可以是时间戳，所以这里是正确的
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 计算两个日期之间的小时差
 */
export function getHoursDifference(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = Math.abs(d1.getTime() - d2.getTime());
  return diff / (1000 * 60 * 60);
}

/**
 * 获取今天和明天的日期字符串
 */
export function getTodayAndTomorrowDates() {
  const today = Date.now();
  const tomorrow = today + (24 * 60 * 60 * 1000); // 直接使用时间戳计算

  return {
    today: formatDate(today),
    tomorrow: formatDate(tomorrow)
  };
}

/**
 * 检查两个日期是否是同一天
 */
export function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(date) {
  const now = Date.now(); // 直接使用时间戳
  const target = new Date(date); // date可以是时间戳
  const diffMs = now - target.getTime(); // 直接使用时间戳进行计算
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}天前`;
  } else if (diffHours > 0) {
    return `${diffHours}小时前`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}分钟前`;
  } else {
    return '刚刚';
  }
}

/**
 * 计算两个日期之间的天数
 */
export function daysBetween(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  const first = new Date(date1);
  const second = new Date(date2);
  return Math.round(Math.abs((first.getTime() - second.getTime()) / oneDay)); // 直接使用时间戳进行计算
}

/**
 * 获取日期范围
 */
export function getDateRange(type) {
  const now = Date.now(); // 直接使用时间戳
  const start = new Date(now); // 从当前时间戳创建Date对象进行操作
  
  switch (type) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(new Date(now).getDate() - new Date(now).getDay()); // 使用新的now
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setDate(new Date(now).getDate() - 7); // 使用新的now
      start.setHours(0, 0, 0, 0);
  }
  
  return { start: start.getTime(), end: now }; // 返回时间戳
}

/**
 * 生成随机颜色
 */
export function generateRandomColor() {
  const colors = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
    '#8B5CF6', '#EC4899', '#6B7280', '#84CC16'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * 生成渐变颜色
 */
export function generateGradientColor(importance) {
  const colors = {
    0: '#9CA3AF', // 灰色
    1: '#D1D5DB', // 浅灰
    2: '#FCD34D', // 黄色
    3: '#F59E0B', // 橙色
    4: '#EF4444', // 红色
    5: '#DC2626'  // 深红
  };
  return colors[importance] || colors[0];
}

/**
 * 深拷贝对象
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (Array.isArray(obj)) {
    const copy = [];
    for (const item of obj) {
      copy.push(deepClone(item));
    }
    return copy;
  }
  
  const copy = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      copy[key] = deepClone(obj[key]);
    }
  }
  return copy;
}

/**
 * 合并对象
 */
export function mergeObjects(target, ...sources) {
  sources.forEach(source => {
    if (source) {
      Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = mergeObjects(target[key] || {}, source[key]);
        } else {
          target[key] = source[key];
        }
      });
    }
  });
  return target;
}

/**
 * 验证邮箱格式
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证URL格式
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 截断文本
 */
export function truncateText(text, maxLength, suffix = '...') {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 首字母大写
 */
export function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 转换为驼峰命名
 */
export function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * 转换为短横线命名
 */
export function toKebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * 生成UUID
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 生成短ID
 */
export function generateShortId() {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化数字
 */
export function formatNumber(num, decimals = 0) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
}

/**
 * 格式化百分比
 */
export function formatPercentage(value, total, decimals = 1) {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return percentage.toFixed(decimals) + '%';
}

/**
 * 数组去重
 */
export function uniqueArray(arr, key = null) {
  if (key) {
    const seen = new Set();
    return arr.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }
  return [...new Set(arr)];
}

/**
 * 数组分组
 */
export function groupArray(arr, key) {
  return arr.reduce((groups, item) => {
    const group = item[key];
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
    return groups;
  }, {});
}

/**
 * 数组排序
 */
export function sortArray(arr, key, order = 'asc') {
  return [...arr].sort((a, b) => {
    let aVal = a[key];
    let bVal = b[key];
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (order === 'desc') {
      [aVal, bVal] = [bVal, aVal];
    }
    
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  });
}

/**
 * 本地存储工具
 */
export const storage = {
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('存储数据失败:', error);
      return false;
    }
  },
  
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('读取数据失败:', error);
      return defaultValue;
    }
  },
  
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('删除数据失败:', error);
      return false;
    }
  },
  
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('清空数据失败:', error);
      return false;
    }
  }
};

/**
 * 下载文件
 */
export function downloadFile(data, filename, type = 'application/json') {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('复制失败:', error);
    return false;
  }
}

/**
 * 显示通知
 */
export function showNotification(message, type = 'info', duration = 3000) {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // 添加样式
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-size: 14px;
    z-index: 10000;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
  `;
  
  // 设置背景色
  const colors = {
    info: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444'
  };
  notification.style.backgroundColor = colors[type] || colors.info;
  
  // 添加到页面
  document.body.appendChild(notification);
  
  // 显示动画
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // 自动隐藏
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, duration);
}

/**
 * 确认对话框
 */
export function confirmDialog(message, title = '确认') {
  return new Promise((resolve) => {
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog-overlay';
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.className = 'confirm-dialog-content';
    content.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    `;
    
    content.innerHTML = `
      <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">${title}</h3>
      <p style="margin: 0 0 24px 0; color: #6B7280; line-height: 1.5;">${message}</p>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button class="btn-cancel" style="
          padding: 8px 16px;
          border: 1px solid #D1D5DB;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">Cancel</button>
        <button class="btn-confirm" style="
          padding: 8px 16px;
          border: none;
          background: #EF4444;
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">Confirm</button>
      </div>
    `;
    
    dialog.appendChild(content);
    document.body.appendChild(dialog);
    
    const cancelBtn = content.querySelector('.btn-cancel');
    const confirmBtn = content.querySelector('.btn-confirm');
    
    const closeDialog = (result) => {
      document.body.removeChild(dialog);
      resolve(result);
    };
    
    cancelBtn.addEventListener('click', () => closeDialog(false));
    confirmBtn.addEventListener('click', () => closeDialog(true));
    
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        closeDialog(false);
      }
    });
  });
} 