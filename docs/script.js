// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 初始化主题和语言
    initializeTheme();
    initializeLanguage();
    initializeNavbar();
    
    // 移动端导航菜单切换
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // 点击菜单项时关闭移动端菜单
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // 平滑滚动到锚点
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 80; // 考虑固定导航栏高度
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 导航栏滚动效果
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // 使用CSS类而不是直接设置内联样式
        if (scrollTop > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 功能卡片动画观察器
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // 观察所有功能卡片和FAQ项目
    const animatedElements = document.querySelectorAll('.feature-card, .faq-item');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // 矩阵演示动画
    const matrixDemo = document.querySelector('.matrix-demo');
    if (matrixDemo) {
        const taskItems = matrixDemo.querySelectorAll('.task-item');
        
        // 为任务项添加随机动画延迟
        taskItems.forEach((item, index) => {
            item.style.animationDelay = `${index * 0.2}s`;
            item.style.animation = 'fadeInUp 0.6s ease forwards';
        });
    }

    // 按钮悬停效果增强
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.02)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });


    // 页面加载完成后的初始化动画
    window.addEventListener('load', function() {
        // 为hero区域添加淡入动画
        const heroContent = document.querySelector('.hero-content');
        const heroVisual = document.querySelector('.hero-visual');
        
        if (heroContent) {
            heroContent.style.opacity = '0';
            heroContent.style.transform = 'translateY(30px)';
            heroContent.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            
            setTimeout(() => {
                heroContent.style.opacity = '1';
                heroContent.style.transform = 'translateY(0)';
            }, 200);
        }
        
        if (heroVisual) {
            heroVisual.style.opacity = '0';
            heroVisual.style.transform = 'translateY(30px)';
            heroVisual.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            
            setTimeout(() => {
                heroVisual.style.opacity = '1';
                heroVisual.style.transform = 'translateY(0)';
            }, 400);
        }
    });

    // 键盘导航支持
    document.addEventListener('keydown', function(e) {
        // ESC键关闭模态框
        if (e.key === 'Escape') {
            const modal = document.querySelector('.install-modal');
            if (modal) {
                modal.querySelector('.modal-close').click();
            }
        }
    });

    // 性能优化：防抖滚动事件
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 应用防抖到滚动事件
    const debouncedScrollHandler = debounce(function() {
        // 这里可以添加其他滚动相关的逻辑
    }, 10);

    window.addEventListener('scroll', debouncedScrollHandler);

    // 添加页面可见性API支持
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // 页面隐藏时暂停动画
            document.body.style.animationPlayState = 'paused';
        } else {
            // 页面显示时恢复动画
            document.body.style.animationPlayState = 'running';
        }
    });

    // 主题切换功能
    function initializeTheme() {
        const themeToggle = document.getElementById('theme-toggle');
        const savedTheme = localStorage.getItem('theme') || 'light';
        
        // 应用保存的主题
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        if (themeToggle) {
            themeToggle.addEventListener('click', function() {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
                // 清除选中状态，防止主题切换时的异常
                if (window.getSelection) {
                    window.getSelection().removeAllRanges();
                }
                
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                
                // 强制重新渲染所有元素
                document.body.style.display = 'none';
                document.body.offsetHeight; // 触发重排
                document.body.style.display = '';
                
                // 确保navbar滚动状态正确更新
                const navbar = document.querySelector('.navbar');
                if (navbar) {
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    if (scrollTop > 50) {
                        navbar.classList.add('scrolled');
                    } else {
                        navbar.classList.remove('scrolled');
                    }
                }
                
                // 添加切换动画效果
                document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
                setTimeout(() => {
                    document.body.style.transition = '';
                }, 300);
            });
        }
    }

    // 语言切换功能
    function initializeLanguage() {
        const langBtn = document.getElementById('lang-btn');
        const langDropdown = document.getElementById('lang-dropdown');
        const langOptions = document.querySelectorAll('.lang-option');
        const savedLang = localStorage.getItem('language') || 'en';
        
        // 应用保存的语言
        setLanguage(savedLang);
        
        // 初始化语言按钮状态
        initializeLanguageButton(savedLang);
        
        if (langBtn && langDropdown) {
            // 切换语言下拉菜单
            langBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                langDropdown.classList.toggle('active');
            });
            
            // 点击外部关闭下拉菜单
            document.addEventListener('click', function() {
                langDropdown.classList.remove('active');
            });
            
            // 语言选项点击事件
            langOptions.forEach(option => {
                option.addEventListener('click', function() {
                    const selectedLang = this.getAttribute('data-lang');
                    setLanguage(selectedLang);
                    langDropdown.classList.remove('active');
                });
            });
        }
    }

    // 设置语言
    function setLanguage(lang) {
        const elements = document.querySelectorAll('[data-en][data-zh]');
        const langBtn = document.getElementById('lang-btn');
        const langText = langBtn?.querySelector('.lang-text');
        const langFlag = langBtn?.querySelector('.lang-flag');
        
        elements.forEach(element => {
            const text = element.getAttribute(`data-${lang}`);
            if (text) {
                // 处理包含HTML的内容
                if (text.includes('<br>')) {
                    element.innerHTML = text;
                } else {
                    element.textContent = text;
                }
            }
        });
        
        // 更新语言按钮
        if (langText && langFlag) {
            // 使用淡出效果隐藏国旗图标
            langFlag.style.opacity = '0';
            langFlag.style.transform = 'scale(0.8)';
            
            // 延迟更新文字，确保动画效果
            setTimeout(() => {
                langText.textContent = lang.toUpperCase();
                langFlag.style.display = 'none';
            }, 150);
        }
        
        // 保存语言设置
        localStorage.setItem('language', lang);
        
        // 更新HTML lang属性
        document.documentElement.lang = lang;
    }

    // 初始化语言按钮状态
    function initializeLanguageButton(lang) {
        const langBtn = document.getElementById('lang-btn');
        const langText = langBtn?.querySelector('.lang-text');
        const langFlag = langBtn?.querySelector('.lang-flag');
        
        if (langText && langFlag) {
            // 设置初始状态
            langText.textContent = lang.toUpperCase();
            langFlag.style.display = 'none';
            langFlag.style.opacity = '0';
        }
    }

    // 初始化navbar状态
    function initializeNavbar() {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    }
});
