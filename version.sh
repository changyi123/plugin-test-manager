#!/bin/bash

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

MANIFEST_FILE="manifest.tmpl.yml"

# 打印带颜色的消息
print_msg() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 获取当前版本号
get_current_version() {
    grep "version:" $MANIFEST_FILE | head -1 | sed 's/.*version: "\(.*\)"/\1/'
}

# 增加版本号
increment_version() {
    local version=$1
    local increment_type=${2:-"patch"}  # 默认增加 patch 版本
    
    # 检查是否是 release 版本格式 (如: 4.38.671-release.306)
    if [[ $version == *"-release."* ]]; then
        # 提取基础版本和 release 号
        local base_version=$(echo "$version" | cut -d'-' -f1)
        local release_num=$(echo "$version" | cut -d'.' -f4)
        
        case $increment_type in
            major)
                # 主版本号增加 (例: 4.38.671-release.306 -> 5.0.0-release.1)
                IFS='.' read -ra PARTS <<< "$base_version"
                echo "$((PARTS[0] + 1)).0.0-release.1"
                ;;
            minor)
                # 次版本号增加 (例: 4.38.671-release.306 -> 4.39.0-release.1)
                IFS='.' read -ra PARTS <<< "$base_version"
                echo "${PARTS[0]}.$((PARTS[1] + 1)).0-release.1"
                ;;
            patch)
                # 补丁版本号增加 (例: 4.38.671-release.306 -> 4.38.672-release.1)
                IFS='.' read -ra PARTS <<< "$base_version"
                echo "${PARTS[0]}.${PARTS[1]}.$((PARTS[2] + 1))-release.1"
                ;;
            release|*)
                # release 号增加 (例: 4.38.671-release.306 -> 4.38.671-release.307)
                echo "${base_version}-release.$((release_num + 1))"
                ;;
        esac
    else
        # 普通版本号格式 (如: 4.38.201)
        IFS='.' read -ra PARTS <<< "$version"
        
        case $increment_type in
            major)
                echo "$((PARTS[0] + 1)).0.0"
                ;;
            minor)
                echo "${PARTS[0]}.$((PARTS[1] + 1)).0"
                ;;
            patch|*)
                echo "${PARTS[0]}.${PARTS[1]}.$((PARTS[2] + 1))"
                ;;
        esac
    fi
}

# 更新版本号到文件
update_version() {
    local old_version=$1
    local new_version=$2
    
    print_msg "更新版本号: $old_version -> $new_version"
    
    # 使用 sed 替换版本号
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/version: \"$old_version\"/version: \"$new_version\"/g" $MANIFEST_FILE
    else
        # Linux
        sed -i "s/version: \"$old_version\"/version: \"$new_version\"/g" $MANIFEST_FILE
    fi
    
    print_msg "版本号已更新"
}

# 显示帮助信息
show_help() {
    echo "版本管理工具"
    echo ""
    echo "用法: ./version.sh [命令] [参数]"
    echo ""
    echo "命令:"
    echo "  current           显示当前版本号"
    echo "  next [type]       显示下一个版本号 (type: major|minor|patch|release，默认: release)"
    echo "  update [version]  更新到指定版本号，如果不提供则自动递增"
    echo "  increment [type]  递增版本号 (type: major|minor|patch|release，默认: release)"
    echo "  help             显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  ./version.sh current                    # 显示当前版本"
    echo "  ./version.sh next                       # 显示下一个 release 版本"
    echo "  ./version.sh next minor                 # 显示下一个次版本"
    echo "  ./version.sh update 4.38.671-release.307 # 更新到指定版本"
    echo "  ./version.sh increment                  # 自动递增 release 版本"
    echo "  ./version.sh increment patch            # 递增补丁版本"
}

# 主程序
main() {
    local command=${1:-"help"}
    
    case $command in
        current)
            version=$(get_current_version)
            print_msg "当前版本: $version"
            ;;
        next)
            current=$(get_current_version)
            increment_type=${2:-"release"}
            next_version=$(increment_version "$current" "$increment_type")
            print_msg "当前版本: $current"
            print_msg "下一个${increment_type}版本: $next_version"
            ;;
        update)
            current=$(get_current_version)
            if [ -n "$2" ]; then
                new_version="$2"
            else
                new_version=$(increment_version "$current" "release")
            fi
            update_version "$current" "$new_version"
            ;;
        increment)
            current=$(get_current_version)
            increment_type=${2:-"release"}
            new_version=$(increment_version "$current" "$increment_type")
            update_version "$current" "$new_version"
            print_msg "${increment_type}版本递增完成"
            ;;
        help|*)
            show_help
            ;;
    esac
}

# 运行主程序
main "$@"