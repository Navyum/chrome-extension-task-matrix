/**
 * 构建脚本
 * 验证项目结构并生成构建报告
 */

const fs = require('fs');
const path = require('path');

class BuildValidator {
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
   * 验证项目结构
   */
  validate() {
    console.log('🔍 验证 TaskMatrix Pro 项目结构...\n');

    // 检查必需文件
    this.checkRequiredFiles();
    
    // 检查目录结构
    this.checkDirectoryStructure();
    
    // 检查配置文件
    this.checkConfigFiles();
    
    // 检查源代码文件
    this.checkSourceFiles();
    
    // 生成报告
    this.generateReport();
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
      'src/options',
      'src/content',
      'src/models',
      'src/services',
      'src/renderers',
      'src/utils',
      'src/components',
      'assets',
      'assets/icons',
      'tests',
      'dist'
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
   * 检查配置文件
   */
  checkConfigFiles() {
    console.log('\n⚙️  检查配置文件:');
    
    // 检查 manifest.json
    try {
      const manifestPath = path.join(this.projectRoot, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      if (manifest.manifest_version === 3) {
        console.log('✅ manifest.json (Manifest V3)');
      } else {
        console.log('⚠️  manifest.json (建议升级到 Manifest V3)');
        this.report.warnings.push('建议使用 Manifest V3');
      }
    } catch (error) {
      console.log('❌ manifest.json (解析失败)');
      this.report.errors.push('manifest.json 解析失败');
    }

    // 检查 package.json
    try {
      const packagePath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      if (packageJson.name && packageJson.version) {
        console.log(`✅ package.json (${packageJson.name} v${packageJson.version})`);
      } else {
        console.log('❌ package.json (缺少必要字段)');
        this.report.errors.push('package.json 缺少必要字段');
      }
    } catch (error) {
      console.log('❌ package.json (解析失败)');
      this.report.errors.push('package.json 解析失败');
    }

    // 检查 webpack.config.js
    const webpackPath = path.join(this.projectRoot, 'webpack.config.js');
    if (fs.existsSync(webpackPath)) {
      console.log('✅ webpack.config.js');
    } else {
      console.log('❌ webpack.config.js (缺失)');
      this.report.errors.push('缺少 webpack.config.js');
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
      'src/options/options.html',
      'src/options/options.css',
      'src/options/options.js',
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
   * 检查图标文件
   */
  checkIconFiles() {
    console.log('\n🎨 检查图标文件:');
    
    const iconSizes = [16, 32, 48, 128];
    iconSizes.forEach(size => {
      const iconPath = path.join(this.projectRoot, `assets/icons/icon${size}.png`);
      if (fs.existsSync(iconPath)) {
        console.log(`✅ icon${size}.png`);
      } else {
        console.log(`⚠️  icon${size}.png (缺失)`);
        this.report.warnings.push(`缺少图标文件: icon${size}.png`);
      }
    });
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('\n📊 构建验证报告:');
    console.log('='.repeat(50));
    
    if (this.report.errors.length === 0) {
      console.log('🎉 项目结构验证通过！');
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
    const reportPath = path.join(this.projectRoot, 'build-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    console.log(`\n📄 详细报告已保存到: ${reportPath}`);
    
    return this.report.success;
  }

  /**
   * 生成项目概览
   */
  generateOverview() {
    console.log('\n📋 项目概览:');
    console.log('='.repeat(50));
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8'));
      const manifest = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'manifest.json'), 'utf8'));
      
      console.log(`项目名称: ${packageJson.name}`);
      console.log(`版本: ${packageJson.version}`);
      console.log(`描述: ${packageJson.description}`);
      console.log(`Manifest 版本: ${manifest.manifest_version}`);
      console.log(`权限: ${manifest.permissions?.join(', ') || '无'}`);
      
      // 统计文件数量
      const countFiles = (dir) => {
        if (!fs.existsSync(dir)) return 0;
        const files = fs.readdirSync(dir, { recursive: true });
        return files.filter(file => typeof file === 'string' && file.includes('.')).length;
      };
      
      console.log(`\n文件统计:`);
      console.log(`  • 源代码文件: ${countFiles(path.join(this.projectRoot, 'src'))} 个`);
      console.log(`  • 测试文件: ${countFiles(path.join(this.projectRoot, 'tests'))} 个`);
      console.log(`  • 资源文件: ${countFiles(path.join(this.projectRoot, 'assets'))} 个`);
      
    } catch (error) {
      console.log('无法生成项目概览:', error.message);
    }
  }
}

// 运行验证
if (require.main === module) {
  const validator = new BuildValidator();
  const success = validator.validate();
  validator.generateOverview();
  
  if (!success) {
    console.log('\n❌ 构建验证失败，请修复上述错误后重试。');
    process.exit(1);
  } else {
    console.log('\n✅ 构建验证成功！项目已准备就绪。');
    console.log('\n🚀 下一步:');
    console.log('  1. 运行 npm install 安装依赖');
    console.log('  2. 运行 npm run build 构建项目');
    console.log('  3. 在 Chrome 中加载 dist 目录作为扩展');
  }
}

module.exports = BuildValidator; 