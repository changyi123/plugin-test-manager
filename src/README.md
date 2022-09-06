# 测试管理插件脚本

### 如何调试？

1. `git clone git@github.com:moriahq/apps-runtime-server.git` clone 后安装依赖，`yarn start` 启动项目
1. 调整 `script/vmDebugger` 中的 DestDirectory 目录， 执行 `yarn dev-vm` 启动 webTrigger 构建
1. 使用 postman 调试接口，导入下列的 curl，修改参数

```json
curl --location --request POST 'localhost:8500/v1/apps/test_manager/production/0.0.1/functions/gitee-menus' \
--header 'Content-Type: application/json' \
--data-raw '{
    "applicationId": "osc",
    "appKey": "test_manager",
    "sessionToken": "r:cd9ea3e7cc9dd3928233de400b95d63c"
}'

```

### 结构

lib 下放共用方法（临时方案），后期需要单独抽出来，和前端共用同一个
