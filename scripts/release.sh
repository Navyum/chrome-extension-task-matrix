#!/bin/bash

# 发布脚本
# 使用方法: ./scripts/release.sh <version>
# 例如: ./scripts/release.sh 1.0.0

set -e

if [ $# -eq 0 ]; then
    echo "使用方法: $0 <version>"
    echo "例如: $0 1.0.0"
    exit 1
fi

VERSION=$1
TAG="v$VERSION"

echo "准备发布版本: $TAG"

# 检查是否在 main 分支
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "警告: 当前不在 main 分支 (当前分支: $CURRENT_BRANCH)"
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 检查工作目录是否干净
if [ -n "$(git status --porcelain)" ]; then
    echo "错误: 工作目录不干净，请先提交或暂存更改"
    exit 1
fi

# 更新 package.json 中的版本号
echo "更新 package.json 版本号..."
npm version $VERSION --no-git-tag-version

# 提交版本更新
git add package.json
git commit -m "chore: bump version to $VERSION"

# 创建并推送 tag
echo "创建 tag: $TAG"
git tag $TAG
git push origin main
git push origin $TAG

echo "✅ 发布流程已启动!"
echo "📦 版本: $TAG"
echo "🔗 查看发布状态: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/')/actions"
echo "📋 发布完成后，可在 Releases 页面下载扩展包"
