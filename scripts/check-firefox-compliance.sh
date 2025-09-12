#!/bin/bash

# Firefox 扩展合规性检查脚本

echo "🦊 Firefox 扩展合规性检查"
echo "=========================="

# 检查必要的 manifest 属性
echo -e "\n📋 检查 manifest.json 属性："

MANIFEST_FILE="manifests/firefox.json"

if [ ! -f "$MANIFEST_FILE" ]; then
    echo "❌ Firefox manifest 文件不存在"
    exit 1
fi

# 检查 data_collection_permissions
if jq -e '.data_collection_permissions' "$MANIFEST_FILE" > /dev/null; then
    echo "✅ data_collection_permissions 已配置"
    
    # 检查是否为数组格式
    if jq -e '.data_collection_permissions | type == "array"' "$MANIFEST_FILE" > /dev/null; then
        echo "  ✅ 格式正确（数组格式）"
        
        # 检查数组内容
        PERMISSIONS_COUNT=$(jq '.data_collection_permissions | length' "$MANIFEST_FILE")
        echo "  ✅ 包含 $PERMISSIONS_COUNT 个数据收集声明"
        
        # 显示具体内容
        echo "  📝 数据收集声明："
        jq -r '.data_collection_permissions[]' "$MANIFEST_FILE" | while read -r perm; do
            echo "    - $perm"
        done
    else
        echo "  ❌ 格式错误（应为数组格式）"
    fi
else
    echo "❌ data_collection_permissions 缺失"
fi

# 检查其他必要属性
echo -e "\n🔍 检查其他必要属性："

if jq -e '.manifest_version' "$MANIFEST_FILE" > /dev/null; then
    echo "✅ manifest_version 已配置"
else
    echo "❌ manifest_version 缺失"
fi

if jq -e '.name' "$MANIFEST_FILE" > /dev/null; then
    echo "✅ name 已配置"
else
    echo "❌ name 缺失"
fi

if jq -e '.version' "$MANIFEST_FILE" > /dev/null; then
    echo "✅ version 已配置"
else
    echo "❌ version 缺失"
fi

if jq -e '.applications.gecko.id' "$MANIFEST_FILE" > /dev/null; then
    echo "✅ gecko.id 已配置"
else
    echo "❌ gecko.id 缺失"
fi

# 检查权限
echo -e "\n🔐 检查权限配置："
PERMISSIONS=$(jq -r '.permissions[]' "$MANIFEST_FILE" 2>/dev/null)
if [ -n "$PERMISSIONS" ]; then
    echo "✅ 权限已配置:"
    echo "$PERMISSIONS" | while read -r perm; do
        echo "  - $perm"
    done
else
    echo "❌ 权限未配置"
fi

# 测试构建
echo -e "\n🔨 测试构建："
if npm run build:firefox > /dev/null 2>&1; then
    echo "✅ Firefox 扩展构建成功"
    
    # 检查构建产物
    if [ -f "dist/firefox/manifest.json" ]; then
        echo "✅ 构建产物存在"
        
        # 验证构建后的 manifest
        if jq -e '.data_collection_permissions' "dist/firefox/manifest.json" > /dev/null; then
            echo "✅ 构建后的 manifest 包含 data_collection_permissions"
            
            # 验证格式
            if jq -e '.data_collection_permissions | type == "array"' "dist/firefox/manifest.json" > /dev/null; then
                echo "✅ 构建后的 manifest 格式正确"
            else
                echo "❌ 构建后的 manifest 格式错误"
            fi
        else
            echo "❌ 构建后的 manifest 缺少 data_collection_permissions"
        fi
    else
        echo "❌ 构建产物不存在"
    fi
else
    echo "❌ Firefox 扩展构建失败"
fi

echo -e "\n🎉 检查完成！"
echo -e "\n📝 注意事项："
echo "- data_collection_permissions 应为字符串数组格式"
echo "- 确保数据收集声明准确描述数据使用情况"
echo "- 定期更新隐私政策以符合 Firefox 要求"
echo "- 在 AMO 提交前进行完整测试"
