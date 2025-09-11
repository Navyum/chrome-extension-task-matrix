/**
 * Firefox扩展构建脚本
 * 验证项目结构并生成Firefox扩展包
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class FirefoxBuildValidator {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.report = {
      success: true,
      errors: [],
      warnings: [],
      files: {
        required: [],
        optional: [],
        missing: []
      }
    };
  }

  /**
   * 验证Firefox扩展结构
   */
  validate() {
    console.log('🦊 验证 TaskMatrix Pro Firefox扩展结构...\n');

    // 检查必需文件
    this.checkRequiredFiles();
    
    // 检查目录结构
    this.checkDirectoryStructure();
    
    // 检查Firefox特定的配置文件
    this.checkFirefoxConfig();
    
    // 检查源代码文件
    this.checkSourceFiles();
    
    // 生成报告
    this.generateReport();
    return this.report.success;
  }

  /**
   * 检查必需文件
   */
  checkRequiredFiles() {
    const requiredFiles = [
      'manifest.json',
      'package.json',
      'webpack.config.js',
      'README.md'
    ];

    requiredFiles.forEach(file => {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        this.report.files.required.push(file);
        console.log(`✅ ${file}`);
      } else {
        this.report.files.missing.push(file);
        this.report.errors.push(`缺少必需文件: ${file}`);
        console.log(`❌ ${file} (缺失)`);
      }
    });
  }

  /**
   * 检查目录结构
   */
  checkDirectoryStructure() {
    const requiredDirs = [
      'src',
      'src/background',
      'src/popup',
      'src/content',
      'src/models',
      'src/services',
      'src/renderers',
      'src/utils',
      'src/components',
      'assets',
      'assets/icons'
    ];

    console.log('\n📁 检查目录结构:');
    requiredDirs.forEach(dir => {
      const dirPath = path.join(this.projectRoot, dir);
      if (fs.existsSync(dirPath)) {
        console.log(`✅ ${dir}/`);
      } else {
        console.log(`❌ ${dir}/ (缺失)`);
        this.report.warnings.push(`目录不存在: ${dir}`);
      }
    });
  }

  /**
   * 检查Firefox特定的配置
   */
  checkFirefoxConfig() {
    console.log('\n🦊 检查Firefox扩展配置:');
    
    // 检查 manifest.json
    try {
      const manifestPath = path.join(this.projectRoot, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      if (manifest.manifest_version === 2) {
        console.log('✅ manifest.json (Manifest V2 - Firefox兼容)');
      } else {
        console.log('❌ manifest.json (Firefox需要Manifest V2)');
        this.report.errors.push('Firefox扩展必须使用Manifest V2');
      }

      // 检查Firefox特定的字段
      if (manifest.applications && manifest.applications.gecko) {
        console.log('✅ Firefox Gecko配置');
      } else {
        console.log('⚠️  缺少Firefox Gecko配置');
        this.report.warnings.push('建议添加Firefox Gecko配置');
      }

      // 检查browser_action
      if (manifest.browser_action) {
        console.log('✅ browser_action配置');
      } else {
        console.log('❌ 缺少browser_action配置');
        this.report.errors.push('Firefox扩展需要browser_action配置');
      }

      // 检查background scripts
      if (manifest.background && manifest.background.scripts) {
        console.log('✅ background scripts配置');
      } else {
        console.log('❌ 缺少background scripts配置');
        this.report.errors.push('Firefox扩展需要background scripts配置');
      }

    } catch (error) {
      console.log('❌ manifest.json (解析失败)');
      this.report.errors.push('manifest.json 解析失败');
    }

    // 检查 package.json
    try {
      const packagePath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      if (packageJson.name && packageJson.name.includes('firefox')) {
        console.log('✅ package.json (Firefox专用)');
      } else {
        console.log('⚠️  package.json (建议名称包含firefox)');
        this.report.warnings.push('建议package.json名称包含firefox');
      }

      if (packageJson.scripts && packageJson.scripts['package:firefox']) {
        console.log('✅ Firefox打包脚本');
      } else {
        console.log('⚠️  缺少Firefox打包脚本');
        this.report.warnings.push('建议添加Firefox打包脚本');
      }

    } catch (error) {
      console.log('❌ package.json (解析失败)');
      this.report.errors.push('package.json 解析失败');
    }
  }

  /**
   * 检查源代码文件
   */
  checkSourceFiles() {
    console.log('\n📝 检查源代码文件:');
    
    const sourceFiles = [
      'src/background/background.js',
      'src/popup/popup.html',
      'src/popup/popup.css',
      'src/popup/popup.js',
      'src/content/content.js',
      'src/models/Task.js',
      'src/models/Matrix.js',
      'src/services/StorageManager.js',
      'src/services/TaskManager.js',
      'src/services/MatrixManager.js',
      'src/renderers/MatrixRenderer.js',
      'src/utils/helpers.js'
    ];

    sourceFiles.forEach(file => {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const size = (stats.size / 1024).toFixed(1);
        console.log(`✅ ${file} (${size}KB)`);
        this.report.files.required.push(file);
      } else {
        console.log(`❌ ${file} (缺失)`);
        this.report.files.missing.push(file);
        this.report.errors.push(`缺少源代码文件: ${file}`);
      }
    });
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('\n📊 Firefox扩展构建验证报告:');
    console.log('='.repeat(50));
    
    if (this.report.errors.length === 0) {
      console.log('🎉 Firefox扩展结构验证通过！');
    } else {
      console.log('❌ 发现以下错误:');
      this.report.errors.forEach(error => {
        console.log(`  • ${error}`);
      });
      this.report.success = false;
    }
    
    if (this.report.warnings.length > 0) {
      console.log('\n⚠️  警告:');
      this.report.warnings.forEach(warning => {
        console.log(`  • ${warning}`);
      });
    }
    
    console.log('\n📈 统计信息:');
    console.log(`  • 必需文件: ${this.report.files.required.length} 个`);
    console.log(`  • 缺失文件: ${this.report.files.missing.length} 个`);
    console.log(`  • 错误: ${this.report.errors.length} 个`);
    console.log(`  • 警告: ${this.report.warnings.length} 个`);
    
    // 保存报告到文件
    const reportPath = path.join(this.projectRoot, 'firefox-build-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    console.log(`\n📄 详细报告已保存到: ${reportPath}`);
    
    return this.report.success; // 返回验证结果
  }

  /**
   * 生成项目概览
   */
  generateOverview() {
    console.log('\n📋 Firefox扩展项目概览:');
    console.log('='.repeat(50));
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8'));
      const manifest = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'manifest.json'), 'utf8'));
      
      console.log(`项目名称: ${packageJson.name}`);
      console.log(`版本: ${packageJson.version}`);
      console.log(`描述: ${packageJson.description}`);
      console.log(`Manifest 版本: ${manifest.manifest_version}`);
      console.log(`Firefox ID: ${manifest.applications?.gecko?.id || '未设置'}`);
      console.log(`最低Firefox版本: ${manifest.applications?.gecko?.strict_min_version || '未设置'}`);
      console.log(`权限: ${manifest.permissions?.join(', ') || '无'}`);
      
    } catch (error) {
      console.log('无法生成项目概览:', error.message);
    }
  }
}

// 运行验证
if (require.main === module) {
  const validator = new FirefoxBuildValidator();
  const success = validator.validate();
  validator.generateOverview();
  
  if (!success) {
    console.log('\n❌ Firefox扩展验证失败，请修复上述错误后重试。');
    process.exit(1);
  } else {
    console.log('\n✅ Firefox扩展验证成功！');
    console.log('\n🚀 下一步:');
    console.log('  1. 运行 npm install 安装依赖');
    console.log('  2. 运行 npm run build:firefox 构建Firefox扩展');
    console.log('  3. 在Firefox中安装 taskmatrix-pro-firefox.xpi');
  }
}

module.exports = FirefoxBuildValidator;
