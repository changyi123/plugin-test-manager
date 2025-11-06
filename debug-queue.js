#!/usr/bin/env node

/**
 * 调试队列处理器 - 用于测试定时任务功能
 */

// 模拟触发器环境
async function debugQueueProcessor() {
  console.log('🔍 调试自动化队列处理器...');
  console.log('环境信息:');
  console.log('- 服务器: sit.gitee.work');
  console.log('- 租户: osc');
  console.log('');

  // 检查webhook记录
  console.log('📝 检查webhook队列记录...');

  // 手动创建一个测试记录
  const testData = {
    webhookUuid: `test_${Date.now()}`,
    repositoryId: '123456', // 测试仓库ID
    repositoryName: 'test-repo',
    branchName: 'master',
    commitIds: JSON.stringify(['test_commit_123']),
    workspaceKey: 'test_workspace',
    status: 'pending',
    retryCount: 0,
    createdAt: new Date(),
  };

  console.log('测试数据:', JSON.stringify(testData, null, 2));

  // 提示需要部署
  console.log('\n⚠️  请确保已经执行以下步骤:');
  console.log('1. 部署应用到SIT环境: npm run deploy');
  console.log('2. 配置webhook: 在Git仓库中添加webhook URL');
  console.log('3. 推送代码触发webhook');
  console.log('');
  console.log('📌 定时任务配置:');
  console.log('- Key: automation-queue-processor');
  console.log('- Cron: */5 * * * * * (每5秒执行)');
  console.log('- Handler: modules/automation/queueProcessor.processAutomationQueue');
  console.log('');
  console.log('🔧 如果定时任务未执行，请检查:');
  console.log('1. 应用是否成功部署');
  console.log('2. 定时任务是否被启用');
  console.log('3. 数据库连接是否正常');
  console.log('4. 查看服务器日志是否有错误');
}

debugQueueProcessor().catch(error => {
  console.error('❌ 调试失败:', error);
  process.exit(1);
});
