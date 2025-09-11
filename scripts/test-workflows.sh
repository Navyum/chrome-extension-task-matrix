#!/bin/bash

# 测试 GitHub Actions 工作流配置
echo "🔍 检查 GitHub Actions 工作流配置..."

# 检查工作流文件是否存在
echo "📁 检查工作流文件:"
for file in .github/workflows/*.yml; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file 不存在"
    fi
done

# 检查 YAML 语法（基本检查）
echo -e "\n📝 检查 YAML 语法:"
for file in .github/workflows/*.yml; do
    echo "  检查 $file..."
    # 基本语法检查：确保有 name 和 on 字段
    if grep -q "name:" "$file" && grep -q "on:" "$file"; then
        echo "  ✅ $file 基本语法正确"
    else
        echo "  ❌ $file 缺少必要字段"
    fi
done

# 检查脚本文件
echo -e "\n🔧 检查脚本文件:"
if [ -f "scripts/release.sh" ] && [ -x "scripts/release.sh" ]; then
    echo "  ✅ scripts/release.sh 存在且可执行"
else
    echo "  ❌ scripts/release.sh 不存在或不可执行"
fi

# 检查 package.json 中的脚本
echo -e "\n📦 检查 package.json 脚本:"
if grep -q '"release":' package.json; then
    echo "  ✅ release 脚本已添加到 package.json"
else
    echo "  ❌ release 脚本未添加到 package.json"
fi

echo -e "\n🎉 检查完成!"
echo -e "\n📋 使用说明:"
echo "  1. 推送代码到 GitHub 仓库"
echo "  2. 创建 tag 触发发布: git tag v1.0.0 && git push origin v1.0.0"
echo "  3. 或使用脚本: npm run release 1.0.0"
echo "  4. 在 GitHub Actions 页面查看运行状态"
