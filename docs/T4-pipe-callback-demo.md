# T4 - Pipe自动化执行回调接口Demo

## 接口概述

T4实现了Pipe执行完成后的回调接口，用于接收Pipe平台的执行结果并更新测试管理平台的相关记录。

## 接口信息

- **接口地址**: `http://gitee-apps-server:8467/apps/api/v1/{tenant}/apps/test_manager/environments/{environment}/webtriggers/pipeAutomationCallback`
- **请求方式**: POST
- **Content-Type**: application/json

## 鉴权方式

使用以下请求头进行鉴权：
- `X-Parse-Application-Id`: `{tenant}` (租户key，如：osc)  
- `X-Parse-Session-Token`: `a:ug9yu2qzh84rl102az3usdex` (写死即可，pipe专用)

## 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| buildId | string | 是 | 执行唯一ID（触发时由pipe平台生成） |
| status | string | 是 | 执行状态：completed/failed |
| pipeJmpUrl | string | 否 | 流水线构建跳转地址URL |
| pipeLogFile | string | 否 | 流水线执行任务日志文件URL |
| reportFile | string | 否 | 测试报告文件URL（Excel格式） |
| reportLogFile | string | 否 | 报告执行日志URL |
| startTime | string | 否 | 执行开始时间 |
| endTime | string | 否 | 执行结束时间 |
| logFile | string | 否 | 日志文件URL（兼容字段） |
| jumpUrl | string | 否 | 跳转URL（兼容字段） |

## 请求示例

```bash
curl --location 'http://test-manager-server:8467/apps/api/v1/osc/apps/test_manager/environments/development/webtriggers/pipeAutomationCallback' \
--header 'X-Parse-Application-Id: osc' \
--header 'X-Parse-Session-Token: a:ug9yu2qzh84rl102az3usdex' \
--header 'Content-Type: application/json' \
--header 'Accept-Encoding: gzip' \
--data '{
  "buildId": "exec_20240115_143052_8f3a",
  "status": "completed",
  "pipeJmpUrl": "https://gitee.rd.cfca.work/osc/pipe/pipeId/pipebuildId",
  "pipeLogFile": "https://storage.example.com/logs/exec_20240115_143052_8f3a.txt",
  "reportFile": "https://storage.example.com/reports/exec_20240115_143052_8f3a.xlsx",
  "reportLogFile": "https://storage.example.com/report-logs/exec_20240115_143052_8f3a.txt"
}'
```

## 响应格式

### 成功响应
```json
{
  "success": true,
  "code": 200,
  "data": {
    "executionId": "exec_20240115_143052_8f3a",
    "buildId": "exec_20240115_143052_8f3a",
    "status": "completed",
    "updatedTestExecutions": 5,
    "message": "自动化执行回调处理完成，executionId: exec_20240115_143052_8f3a"
  }
}
```

### 失败响应
```json
{
  "success": false,
  "code": 404,
  "error": "Execution record not found for buildId: exec_20240115_143052_8f3a"
}
```

## 接口功能

1. **参数验证**: 验证必需参数buildId和status
2. **记录查找**: 根据buildId查找对应的AutomationExecutionRecord记录  
3. **状态更新**: 更新执行记录的状态和相关信息
4. **测试执行同步**: 批量更新关联的测试执行的automation_status字段
5. **错误处理**: 完整的错误处理和回滚机制

## 处理逻辑

1. 接收Pipe平台发送的回调请求
2. 验证必需参数（buildId, status）
3. 根据buildId查找AutomationExecutionRecord记录
4. 更新执行记录：
   - status: completed/failed
   - completeTime: 完成时间
   - pipeJumpUrl: 流水线跳转URL
   - pipeLogUrl: 日志文件URL
   - reportUrl: 报告文件URL
   - 统计信息：successCount, failedCount等
5. 批量更新测试执行状态：
   - completed → success
   - failed → failed
6. 返回处理结果

## 注意事项

1. **Session Token**: 使用固定token `a:ug9yu2qzh84rl102az3usdex`，专门为pipe回调设计
2. **重试机制**: 建议Pipe平台实现重试机制，回调失败时最多重试3次，每次间隔30秒
3. **日志记录**: 所有操作都有详细的日志记录，使用`[pipeAutomationCallback]`前缀便于排查
4. **幂等性**: 接口支持重复调用，不会产生副作用

## 错误码说明

- **400**: 参数错误（缺少buildId或status无效）
- **404**: 未找到对应的执行记录
- **500**: 服务器内部错误

## 开发状态

✅ **T4 - Pipe回调接口Demo已完成**

- ✅ T4.1: pipeAutomationCallback接口函数实现
- ✅ T4.2: manifest.yml注册回调接口
- ✅ T4.3: buildId查找和更新AutomationExecutionRecord逻辑  
- ✅ T4.4: 测试执行状态同步更新逻辑

接口现已就绪，可以提供给Pipe团队进行联调测试。