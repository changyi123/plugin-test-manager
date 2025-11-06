# 自动化测试同步系统部署指南

## SIT环境部署步骤

### 1. 环境配置
当前环境信息：
- **服务器**: `sit.gitee.work`  
- **租户**: `osc`
- **API基础URL**: `http://sit.gitee.work`

### 2. 登录和部署

```bash
# 1. 登录到应用平台
npm run login-app
# 输入域名: sit.gitee.work
# 输入用户名和密码

# 2. 构建触发器代码
npm run build-package

# 3. 部署到SIT环境
npm run deploy
# 选择环境: sit
# 确认部署
```

### 3. 定时任务配置

定时任务已在 `manifest.tmpl.yml` 中配置：
```yaml
scheduledTrigger:
  - key: automation-queue-processor
    function: automation-queue-processor-function
    cronTime: "*/5 * * * * *"  # 每5秒执行一次
```

### 4. Webhook配置

在Git仓库中配置webhook：
1. 进入仓库设置 -> Webhooks
2. 添加新的webhook
3. URL: `http://sit.gitee.work/apps/test_manager/triggers/automation-webhook`
4. 选择触发事件: Push
5. 保存配置

### 5. 验证部署

#### 检查定时任务是否运行：
1. 查看应用日志
2. 检查数据库中的 `AutomationWebhookQueue` 表
3. 推送代码触发webhook

#### 手动测试：
```bash
# 运行调试脚本
node debug-queue.js
```

### 6. 常见问题排查

#### 定时任务不执行：
- 检查应用是否成功部署
- 确认manifest中的定时任务配置正确
- 查看服务器日志是否有错误

#### Webhook不触发：
- 确认webhook URL正确
- 检查网络连接
- 查看webhook日志

#### 数据库连接问题：
- 确认storage配置正确
- 检查网络权限

### 7. 日志查看

查看应用日志：
```bash
# 通过平台查看日志
# 或使用CLI工具（如果支持）
```

## 注意事项

1. **环境隔离**: SIT环境的数据与生产环境隔离
2. **权限**: 确保有部署权限
3. **配置文件**: `automation-test-map.json` 需要在测试仓库中配置
4. **测试用例格式**: 确保Java测试文件符合规范（包含@TestId注解）