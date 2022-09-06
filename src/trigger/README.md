# 测试管理插件脚本

### 如何调试？

1. `git clone git@github.com:moriahq/apps-runtime-server.git`
   安装依赖，调整 env 文件如下

```yml
PORT=8500
SANDBOX_MEMORY_LIMIT=128

# 本地插件包代码目录
APPS_DIR=D:\Code\minio
# 插件数据表前缀
PLUGIN_CLASS_PREFIX=

LRU_TTL=1
# 日志
DEBUG=runtime*

PARSE_PUBLIC_SERVER_URL=http://192.168.48.34/parse
PARSE_SERVER_MASTER_KEY=6ae45d846abc1a646d42c560b6c9ccb9
PROXIMA_CORE_URL=http://192.168.48.34

PGSQL_CLIENT_HOST=192.168.48.34
PGSQL_CLIENT_PORT=5432
PGSQL_CLIENT_USER=proxima
PGSQL_CLIENT_PASSWORD=proxima
```

`APPS_DIR` 设置为本地文件夹的相对路径
`yarn start` 启动项目

2. 调整 `script/vmDebugger` 中的 `DestDirectory` 路径和 `APPS_DIR` 保持一致， 执行 `yarn dev-vm` 启动 webTrigger 构建
3. 使用 postman 调试接口，导入下列的 curl，修改参数

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
