#!/usr/bin/env node

// 测试队列处理器
const { processAutomationQueue } = require('./dist/modules/automation/queueProcessor');

async function testQueueProcessor() {
  console.log('🧪 开始测试自动化队列处理器...');

  try {
    await processAutomationQueue();
    console.log('✅ 队列处理完成');
  } catch (error) {
    console.error('❌ 队列处理失败:', error);
    console.error('错误堆栈:', error.stack);
  }
}

testQueueProcessor();
