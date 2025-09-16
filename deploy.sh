#!/bin/bash

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
# 配置
MANIFEST_FILE="manifest.tmpl.yml"
DOMAIN="http://cfca.dev.gitee.work/"
USERNAME="osc-admin"
PASSWORD="qq123456"
TENANT="osc"
APP_KEY="test_manager"
ENVIRONMENT="development"


# 获取当前版本号
get_current_version() {
    grep "version:" $MANIFEST_FILE | head -1 | sed 's/.*version: "\(.*\)"/\1/'
}

# 增加版本号
increment_version() {
    local version=$1
    # 分割版本号 4.38.201 -> 4 38 201
    IFS='.' read -ra ADDR <<< "$version"
    # 最后一位+1
    ADDR[2]=$((ADDR[2] + 1))
    # 重新组合
    echo "${ADDR[0]}.${ADDR[1]}.${ADDR[2]}"
}

# 更新版本号到文件
update_version_in_file() {
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
}

# 构建应用
build_app() {
    print_step "开始构建应用..."
    yarn build-app
    
    # 检查构建结果
    if [ ! -f "test_manager_${NEW_VERSION}_DEV.zip" ]; then
        print_error "构建失败，未找到 test_manager_${NEW_VERSION}_DEV.zip 文件"
        exit 1
    fi
    
    print_msg "构建成功: test_manager_${NEW_VERSION}_DEV.zip"
}

# 登录 giteeteam-apps
login_giteeteam() {
    print_step "登录 giteeteam-apps..."
    
    # 使用 expect 来自动化交互式登录
    expect << 'EOF'
set timeout 30
spawn giteeteam-apps login
expect "Please enter the domain address"
send "http://cfca.dev.gitee.work/\r"
expect "Please enter username"
send "osc-admin\r"
expect "Please enter password"
send "qq123456\r"
expect {
    "Login successful" {
        exit 0
    }
    "登录成功" {
        exit 0
    }
    timeout {
        puts "登录超时"
        exit 1
    }
    eof {
        exit 0
    }
}
EOF
    
    if [ $? -eq 0 ]; then
        print_msg "登录成功"
    else
        print_error "登录失败"
        exit 1
    fi
}

# 部署应用
deploy_app() {
    local zip_file="test_manager_${NEW_VERSION}_DEV.zip"
    
    print_step "部署应用: $zip_file"
    giteeteam-apps deploy $zip_file
    
    print_msg "部署成功"
}

# 订阅插件
subscribe_plugin() {
    print_step "订阅插件..."
    
    local response=$(curl -s 'http://cfca.dev.gitee.work/apps/api/v1/apps/install/batch' \
        -H 'accept: application/json, text/plain, */*' \
        -H 'accept-language: zh-CN,zh;q=0.9,en;q=0.8' \
        -H 'cache-control: no-cache' \
        -H 'content-type: application/json' \
        -b '_ga_LTZ10XBX1X=GS1.1.1732172258.1.0.1732172258.0.0.0; _ga=GA1.2.1108511466.1732172258; lang=zh-CN; metabase.DEVICE=02395401-03f7-403c-8014-bcba40582f45; USER_REALM_KEY=eyJyZWFsbVV1aWQiOiJvc2MiLCJjbGllbnRJZCI6Im9uZS1zc28iLCJyZWRpcmVjdFVyaSI6bnVsbH0=; KEYCLOAK_LOCALE=zh-CN; JSESSIONID=DF42CA2D54F8336174420A45D6A3350E; PRE-GW-SESSION=COOKIE:SWITCH_TENANT:4195ca93d4724f0496455810b4fdb5c1; PRE-GW-LOAD=eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEiLCJ1U05DcmVhdGVkIjoiMSIsImRpc3BsYXlOYW1lIjoi6LaF566hIiwic0FNQWNjb3VudE5hbWUiOiJvc2MtYWRtaW4iLCJjb21wYW55IjoiRENFMyIsImNvbXBhbnlJZGVudGl0eSI6IkNPTVBBTllfT1dORVIiLCJ1c2VyUHJpbmNpcGFsTmFtZSI6ImFkbWluQGFkbWluLmNvbSIsImNvbXBhbnlQYXRoIjoiRENFMyIsImp0aSI6IkNPT0tJRTpTV0lUQ0hfVEVOQU5UOjQxOTVjYTkzZDQ3MjRmMDQ5NjQ1NTgxMGI0ZmRiNWMxIiwiaWF0IjoxNzU2OTY4MzgxLCJzdWIiOiIxIiwiZXhwIjoxNzU3NTM4MDAwfQ.YokH1fys5rCpsMZVrA7i2oKyIu0A9FWE4a2E_qfxdB0' \
        -H 'origin: http://cfca.dev.gitee.work' \
        -H 'pragma: no-cache' \
        -H 'priority: u=1, i' \
        -H 'referer: http://cfca.dev.gitee.work/apps/page/SCM2/application/developer' \
        -H 'sec-ch-ua: "Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"' \
        -H 'sec-ch-ua-mobile: ?0' \
        -H 'sec-ch-ua-platform: "macOS"' \
        -H 'sec-fetch-dest: empty' \
        -H 'sec-fetch-mode: cors' \
        -H 'sec-fetch-site: same-origin' \
        -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36' \
        --data-raw "{\"tenants\":[\"$TENANT\"],\"environmentKey\":\"$ENVIRONMENT\",\"appKey\":\"$APP_KEY\",\"versionKey\":\"$NEW_VERSION\",\"subscriptionSource\":\"manual\"}")
    
    # 解析响应获取 objectId (注意：data是数组)
    local object_id=$(echo $response | jq -r '.data[0].installationLogId // empty')
    
    if [ -z "$object_id" ]; then
        print_error "订阅失败，未获取到 objectId"
        echo "响应: $response"
        exit 1
    fi
    
    print_msg "订阅请求已发送，任务ID: $object_id"
    
    # 开始轮询状态
    poll_installation_status $object_id
}

# 轮询安装状态
poll_installation_status() {
    local object_id=$1
    local max_attempts=60  # 最多等待10分钟 (60 * 10秒)
    local attempt=0
    
    print_step "开始轮询安装状态..."
    
    while [ $attempt -lt $max_attempts ]; do
        sleep 10  # 等待10秒
        attempt=$((attempt + 1))
        
        local response=$(curl -s "http://cfca.dev.gitee.work/apps/api/v1/installation/logs/search?ids[]=$object_id&page=1&size=999" \
            -H 'accept: application/json, text/plain, */*' \
            -H 'accept-language: zh-CN,zh;q=0.9,en;q=0.8' \
            -H 'cache-control: no-cache' \
            -b '_ga_LTZ10XBX1X=GS1.1.1732172258.1.0.1732172258.0.0.0; _ga=GA1.2.1108511466.1732172258; lang=zh-CN; metabase.DEVICE=02395401-03f7-403c-8014-bcba40582f45; USER_REALM_KEY=eyJyZWFsbVV1aWQiOiJvc2MiLCJjbGllbnRJZCI6Im9uZS1zc28iLCJyZWRpcmVjdFVyaSI6bnVsbH0=; KEYCLOAK_LOCALE=zh-CN; JSESSIONID=DF42CA2D54F8336174420A45D6A3350E; PRE-GW-SESSION=COOKIE:SWITCH_TENANT:4195ca93d4724f0496455810b4fdb5c1; PRE-GW-LOAD=eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEiLCJ1U05DcmVhdGVkIjoiMSIsImRpc3BsYXlOYW1lIjoi6LaF566hIiwic0FNQWNjb3VudE5hbWUiOiJvc2MtYWRtaW4iLCJjb21wYW55IjoiRENFMyIsImNvbXBhbnlJZGVudGl0eSI6IkNPTVBBTllfT1dORVIiLCJ1c2VyUHJpbmNpcGFsTmFtZSI6ImFkbWluQGFkbWluLmNvbSIsImNvbXBhbnlQYXRoIjoiRENFMyIsImp0aSI6IkNPT0tJRTpTV0lUQ0hfVEVOQU5UOjQxOTVjYTkzZDQ3MjRmMDQ5NjQ1NTgxMGI0ZmRiNWMxIiwiaWF0IjoxNzU2OTY4MzgxLCJzdWIiOiIxIiwiZXhwIjoxNzU3NTM4MDAwfQ.YokH1fys5rCpsMZVrA7i2oKyIu0A9FWE4a2E_qfxdB0' \
            -H 'pragma: no-cache' \
            -H 'priority: u=1, i' \
            -H 'referer: http://cfca.dev.gitee.work/apps/page/SCM2/application/developer' \
            -H 'sec-ch-ua: "Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"' \
            -H 'sec-ch-ua-mobile: ?0' \
            -H 'sec-ch-ua-platform: "macOS"' \
            -H 'sec-fetch-dest: empty' \
            -H 'sec-fetch-mode: cors' \
            -H 'sec-fetch-site: same-origin' \
            -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36')
        
        # 解析状态
        local status=$(echo $response | jq -r '.data.list[0].status // empty')
        
        if [ "$status" = "2" ]; then
            print_msg "✅ 安装成功! (尝试 $attempt/$max_attempts)"
            echo "安装日志: $response" | jq '.'
            return 0
        elif [ "$status" = "3" ]; then
            print_error "❌ 安装失败!"
            echo "错误日志: $response" | jq '.'
            exit 1
        else
            print_warn "⏳ 安装中... 状态: $status (尝试 $attempt/$max_attempts)"
        fi
    done
    
    print_error "❌ 安装超时，请手动检查状态"
    exit 1
}

# 主流程
main() {
    print_step "🚀 开始自动化部署流程"
    
    # 检查必要的命令
    command -v yarn >/dev/null 2>&1 || { print_error "需要安装 yarn"; exit 1; }
    command -v giteeteam-apps >/dev/null 2>&1 || { print_error "需要安装 giteeteam-apps"; exit 1; }
    command -v jq >/dev/null 2>&1 || { print_error "需要安装 jq"; exit 1; }
    command -v expect >/dev/null 2>&1 || { print_error "需要安装 expect"; exit 1; }
    
    # 获取当前版本
    CURRENT_VERSION=$(get_current_version)
    print_msg "当前版本: $CURRENT_VERSION"
    
    # 计算新版本
    NEW_VERSION=$(increment_version $CURRENT_VERSION)
    print_msg "新版本: $NEW_VERSION"
    
    # 询问用户确认
    read -p "确认要部署版本 $NEW_VERSION 吗? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warn "用户取消部署"
        exit 0
    fi
    
    # 1. 更新版本号
    update_version_in_file $CURRENT_VERSION $NEW_VERSION
    
    # 2. 构建应用
    build_app
    
    # 3. 登录
    login_giteeteam
    
    # 4. 部署
    deploy_app
    
    # 5. 订阅
    subscribe_plugin
    
    print_msg "🎉 部署完成! 版本: $NEW_VERSION"
}

# 错误处理
trap 'print_error "脚本执行失败，请检查错误信息"' ERR

# 运行主流程
main "$@"