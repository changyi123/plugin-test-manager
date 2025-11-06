# 自动化队列监控功能 - TODO技术方案

> **版本**: v1.0  
> **创建时间**: 2025-01-17  
> **说明**: 本文档详细描述每个TODO的技术实现方案  

---

## 🔧 TODO-1：基础页面框架搭建

### 技术实现方案

#### 1.1 目录结构创建
```
src/app/pages/config/MoreConfig/AutomationQueueMonitor/
├── index.tsx                     # 主组件 - Tab容器
├── WebhookQueue.tsx             # Webhook队列组件（空白页面）
├── ExecutionMonitor.tsx         # 执行监控组件（空白页面）  
├── index.less                   # 样式文件
└── components/
    └── .gitkeep                 # 占位文件
```

#### 1.2 主组件实现
```typescript
// index.tsx - 主组件
import React, { useState } from 'react';
import { Tabs } from 'antd';
import useI18n from '@/lib/hooks/useI18n';
import WebhookQueue from './WebhookQueue';
import ExecutionMonitor from './ExecutionMonitor';
import cx from './index.less';

const { TabPane } = Tabs;

const AutomationQueueMonitor: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('webhook');
  
  return (
    <div className={cx('automation-queue-monitor')}>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab={t('automationQueueMonitor.tab.webhook')} key="webhook">
          <WebhookQueue />
        </TabPane>
        <TabPane tab={t('automationQueueMonitor.tab.execution')} key="execution">
          <ExecutionMonitor />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default AutomationQueueMonitor;
```

#### 1.3 空白组件实现
```typescript
// WebhookQueue.tsx - 占位组件
import React from 'react';
import { Empty } from 'antd';
import useI18n from '@/lib/hooks/useI18n';

const WebhookQueue: React.FC = () => {
  const { t } = useI18n();
  
  return (
    <div style={{ padding: 24 }}>
      <Empty 
        description={t('automationQueueMonitor.webhook.placeholder')}
      />
    </div>
  );
};

export default WebhookQueue;

// ExecutionMonitor.tsx - 占位组件（类似结构）
```

#### 1.4 设置页面集成
```typescript
// src/app/pages/config/index.tsx - 修改点
import AutomationQueueMonitor from './MoreConfig/AutomationQueueMonitor';

const MoreConfigPages = [
  // 现有配置项...
  {
    key: 'AutomationQueueMonitor',
    title: 'automationQueueMonitor',
    component: AutomationQueueMonitor,
    description: 'automationQueueMonitor',
    isGlobalConfig: true,
  },
];
```

#### 1.5 国际化配置
```json
// locales/zh/index.json - 新增内容
{
  "page.config.automationQueueMonitor.title": "自动化队列监控",
  "page.config.automationQueueMonitor.description": "监控自动化测试集成的队列状态和执行进度",
  "automationQueueMonitor.tab.webhook": "Webhook队列",
  "automationQueueMonitor.tab.execution": "执行监控",
  "automationQueueMonitor.webhook.placeholder": "Webhook队列数据加载中...",
  "automationQueueMonitor.execution.placeholder": "执行监控数据加载中..."
}

// locales/en/index.json - 新增内容  
{
  "page.config.automationQueueMonitor.title": "Automation Queue Monitor",
  "page.config.automationQueueMonitor.description": "Monitor automation test integration queue status and execution progress",
  "automationQueueMonitor.tab.webhook": "Webhook Queue",
  "automationQueueMonitor.tab.execution": "Execution Monitor",
  "automationQueueMonitor.webhook.placeholder": "Loading webhook queue data...",
  "automationQueueMonitor.execution.placeholder": "Loading execution monitor data..."
}
```

#### 1.6 样式文件
```less
// index.less
.automation-queue-monitor {
  .ant-tabs-content-holder {
    padding: 0;
  }
  
  .ant-tabs-tab {
    font-weight: 500;
  }
}
```

#### 1.7 测试验证方法
1. **页面访问测试**: 浏览器访问路径，验证页面正常显示
2. **Tab切换测试**: 点击Tab验证切换功能
3. **国际化测试**: 切换语言验证文案显示
4. **兼容性测试**: Chrome、Firefox、Safari浏览器测试

---

## 🔧 TODO-2：Webhook队列后端API

### 技术实现方案

#### 2.1 manifest.yml配置
```yaml
webtrigger:
  # 现有配置...
  
  # Webhook队列查询
  - key: api-automation-webhook-queue
    function: automation-webhook-queue-function
    
  # Webhook重试
  - key: api-automation-webhook-retry
    function: automation-webhook-retry-function

function:
  # 现有配置...
  
  - key: automation-webhook-queue-function
    handler: api.getAutomationWebhookQueue
    timeout: 30000
    
  - key: automation-webhook-retry-function
    handler: api.retryAutomationWebhook
    timeout: 30000
```

#### 2.2 Webhook队列查询API
```typescript
// src/trigger/api.ts - 新增函数

/**
 * 获取Webhook队列数据
 * GET /api/automation/webhook-queue?page=1&pageSize=20&status=pending
 */
export async function getAutomationWebhookQueue(params: {
  page: number;
  pageSize: number;
  status?: string;
  repositoryId?: string;
  startTime?: string;
  endTime?: string;
}) {
  try {
    console.log('[getAutomationWebhookQueue] 查询参数:', params);
    
    const query = storage.entity('AutomationWebhookQueue').query();
    
    // 状态筛选
    if (params.status) {
      query.equalTo('status', params.status);
    }
    
    // 仓库筛选
    if (params.repositoryId) {
      query.equalTo('repositoryId', params.repositoryId);
    }
    
    // 时间范围筛选
    if (params.startTime) {
      query.greaterThanOrEqualTo('createdAt', new Date(params.startTime));
    }
    if (params.endTime) {
      query.lessThanOrEqualTo('createdAt', new Date(params.endTime));
    }
    
    // 排序和分页
    query.descending('createdAt');
    query.limit(params.pageSize || 20);
    query.skip(((params.page || 1) - 1) * (params.pageSize || 20));
    
    // 并行查询数据和总数
    const [items, total] = await Promise.all([
      query.find(),
      query.count()
    ]);
    
    // 数据格式化
    const formattedItems = items.map(item => ({
      objectId: item.objectId,
      webhookUuid: item.webhookUuid,
      repositoryId: item.repositoryId,
      repositoryName: item.repositoryName,
      branchName: item.branchName,
      commitIds: item.commitIds ? JSON.parse(item.commitIds) : [],
      status: item.status,
      retryCount: item.retryCount || 0,
      createdAt: item.createdAt,
      processedTime: item.processedTime,
      errorMessage: item.errorMessage,
    }));
    
    console.log(`[getAutomationWebhookQueue] 查询成功，返回${items.length}条记录，总计${total}条`);
    
    return {
      code: 0,
      message: 'Success',
      data: {
        items: formattedItems,
        total,
        page: params.page || 1,
        pageSize: params.pageSize || 20,
      }
    };
    
  } catch (error) {
    console.error('[getAutomationWebhookQueue] 查询失败:', error);
    return {
      code: -1,
      message: `查询失败: ${error.message}`,
      data: null
    };
  }
}
```

#### 2.3 Webhook重试API
```typescript
/**
 * 重试Webhook
 * POST /api/automation/webhook-retry
 * Body: { "webhookId": "xxx" }
 */
export async function retryAutomationWebhook(params: {
  webhookId: string;
}) {
  try {
    console.log('[retryAutomationWebhook] 重试Webhook:', params.webhookId);
    
    // 查询Webhook记录
    const webhook = await storage
      .entity('AutomationWebhookQueue')
      .get(params.webhookId);
    
    if (!webhook) {
      throw new Error('Webhook记录不存在');
    }
    
    // 检查状态
    if (webhook.status === 'completed') {
      throw new Error('已完成的Webhook不能重试');
    }
    
    // 更新状态为pending，增加重试次数
    await storage.entity('AutomationWebhookQueue').set(params.webhookId, {
      status: 'pending',
      retryCount: (webhook.retryCount || 0) + 1,
      processedTime: null,
      errorMessage: null,
    });
    
    console.log('[retryAutomationWebhook] Webhook重试设置成功');
    
    return {
      code: 0,
      message: 'Webhook已重新加入队列',
    };
    
  } catch (error) {
    console.error('[retryAutomationWebhook] 重试失败:', error);
    return {
      code: -1,
      message: `重试失败: ${error.message}`,
    };
  }
}
```

#### 2.4 数据库索引优化
```typescript
// src/trigger/modules/trigger/initialScript.ts - 新增函数

export async function addWebhookQueueIndexes() {
  try {
    // 为AutomationWebhookQueue表添加索引
    await storage.entity('AutomationWebhookQueue').addIndex(['status', 'createdAt']);
    await storage.entity('AutomationWebhookQueue').addIndex(['repositoryId', 'createdAt']);
    await storage.entity('AutomationWebhookQueue').addIndex(['createdAt']);
    
    console.log('[初始化] Webhook队列索引创建完成');
  } catch (error) {
    console.error('[初始化] 索引创建失败:', error);
  }
}

// 在现有初始化函数中调用
export async function testManagerInitialScript() {
  // 现有初始化逻辑...
  
  // 添加Webhook队列索引
  await addWebhookQueueIndexes();
}
```

#### 2.5 Postman测试用例
```bash
# 测试用例1: 基础查询
GET {{baseUrl}}/api/automation/webhook-queue?page=1&pageSize=20

# 测试用例2: 状态筛选
GET {{baseUrl}}/api/automation/webhook-queue?status=pending

# 测试用例3: 时间筛选
GET {{baseUrl}}/api/automation/webhook-queue?startTime=2025-01-01T00:00:00.000Z&endTime=2025-01-31T23:59:59.999Z

# 测试用例4: 复合筛选
GET {{baseUrl}}/api/automation/webhook-queue?page=1&pageSize=10&status=failed

# 测试用例5: 重试Webhook
POST {{baseUrl}}/api/automation/webhook-retry
Content-Type: application/json
{
  "webhookId": "实际的webhookId"
}

# 期望响应格式
{
  "code": 0,
  "message": "Success",
  "data": {
    "items": [
      {
        "objectId": "xxx",
        "webhookUuid": "uuid-xxx",
        "repositoryName": "test-project",
        "branchName": "main",
        "commitIds": ["abc123", "def456"],
        "status": "pending",
        "retryCount": 0,
        "createdAt": "2025-01-17T10:00:00.000Z",
        "errorMessage": null
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20
  }
}
```

---

## 🔧 TODO-3：执行监控后端API

### 技术实现方案

#### 3.1 manifest.yml配置
```yaml
webtrigger:
  # 现有配置...
  
  # 执行监控查询
  - key: api-automation-execution-monitor
    function: automation-execution-monitor-function
    
  # 执行详情查询
  - key: api-automation-execution-detail
    function: automation-execution-detail-function

function:
  # 现有配置...
  
  - key: automation-execution-monitor-function
    handler: api.getAutomationExecutionMonitor
    timeout: 30000
    
  - key: automation-execution-detail-function
    handler: api.getAutomationExecutionDetail
    timeout: 30000
```

#### 3.2 执行监控查询API（关联查询）
```typescript
// src/trigger/api.ts - 新增函数

/**
 * 获取执行监控数据（关联回调状态）
 * GET /api/automation/execution-monitor?page=1&pageSize=20&status=running
 */
export async function getAutomationExecutionMonitor(params: {
  page: number;
  pageSize: number;
  status?: string;
  triggerUser?: string;
  startTime?: string;
  endTime?: string;
}) {
  try {
    console.log('[getAutomationExecutionMonitor] 查询参数:', params);
    
    // 1. 查询执行记录
    const executionQuery = storage.entity('AutomationExecutionRecord').query();
    
    // 应用筛选条件
    if (params.status) {
      executionQuery.equalTo('status', params.status);
    }
    
    if (params.triggerUser) {
      executionQuery.equalTo('triggerUser', params.triggerUser);
    }
    
    if (params.startTime) {
      executionQuery.greaterThanOrEqualTo('triggerTime', new Date(params.startTime));
    }
    if (params.endTime) {
      executionQuery.lessThanOrEqualTo('triggerTime', new Date(params.endTime));
    }
    
    // 排序和分页
    executionQuery.descending('triggerTime');
    executionQuery.limit(params.pageSize || 20);
    executionQuery.skip(((params.page || 1) - 1) * (params.pageSize || 20));
    
    // 并行查询数据和总数
    const [executions, total] = await Promise.all([
      executionQuery.find(),
      executionQuery.count()
    ]);
    
    console.log(`[getAutomationExecutionMonitor] 查询到${executions.length}条执行记录`);
    
    // 2. 批量查询回调状态（避免N+1查询）
    const buildIds = executions
      .map(exec => exec.buildId)
      .filter(buildId => buildId); // 过滤空值
    
    let callbackMap = new Map();
    if (buildIds.length > 0) {
      // 批量查询回调记录
      const callbacks = await storage
        .entity('PipeCallbackQueue')
        .query()
        .containedIn('buildId', buildIds)
        .find();
      
      // 构建buildId到回调状态的映射
      callbacks.forEach(callback => {
        callbackMap.set(callback.buildId, {
          status: callback.status,
          createdAt: callback.createdAt,
          processedTime: callback.processedTime,
        });
      });
    }
    
    console.log(`[getAutomationExecutionMonitor] 查询到${callbackMap.size}条回调记录`);
    
    // 3. 合并数据和格式化
    const formattedItems = executions.map(exec => {
      const callback = callbackMap.get(exec.buildId);
      
      return {
        objectId: exec.objectId,
        executionId: exec.executionId,
        workspaceKey: exec.workspaceKey,
        buildId: exec.buildId,
        status: exec.status,
        callbackStatus: callback?.status || null,
        testExecutionIds: exec.testExecutionIds ? JSON.parse(exec.testExecutionIds) : [],
        triggerUser: exec.triggerUser,
        triggerTime: exec.triggerTime,
        completeTime: exec.completeTime,
        totalCount: exec.totalCount || 0,
        successCount: exec.successCount || 0,
        failedCount: exec.failedCount || 0,
        skippedCount: exec.skippedCount || 0,
        mavenVersion: exec.mavenVersion,
        jdkVersion: exec.jdkVersion,
        pipeJumpUrl: exec.pipeJumpUrl,
        reportUrl: exec.reportUrl,
        errorMessage: exec.errorMessage,
        // 计算耗时
        duration: exec.completeTime 
          ? Math.floor((new Date(exec.completeTime).getTime() - new Date(exec.triggerTime).getTime()) / 1000)
          : null,
        // 回调信息
        callbackInfo: callback ? {
          createdAt: callback.createdAt,
          processedTime: callback.processedTime,
        } : null,
      };
    });
    
    console.log(`[getAutomationExecutionMonitor] 数据处理完成，返回${formattedItems.length}条记录`);
    
    return {
      code: 0,
      message: 'Success',
      data: {
        items: formattedItems,
        total,
        page: params.page || 1,
        pageSize: params.pageSize || 20,
      }
    };
    
  } catch (error) {
    console.error('[getAutomationExecutionMonitor] 查询失败:', error);
    return {
      code: -1,
      message: `查询失败: ${error.message}`,
      data: null
    };
  }
}
```

#### 3.3 执行详情API
```typescript
/**
 * 获取执行详情
 * GET /api/automation/execution-detail?executionId=xxx
 */
export async function getAutomationExecutionDetail(params: {
  executionId: string;
}) {
  try {
    console.log('[getAutomationExecutionDetail] 查询执行详情:', params.executionId);
    
    // 查询执行记录
    const execution = await storage
      .entity('AutomationExecutionRecord')
      .query()
      .equalTo('executionId', params.executionId)
      .first();
    
    if (!execution) {
      throw new Error('执行记录不存在');
    }
    
    // 查询回调记录
    let callback = null;
    if (execution.buildId) {
      callback = await storage
        .entity('PipeCallbackQueue')
        .query()
        .equalTo('buildId', execution.buildId)
        .first();
    }
    
    // 解析测试用例映射
    let testCaseMapping = null;
    if (execution.testCaseMapping) {
      try {
        testCaseMapping = JSON.parse(execution.testCaseMapping);
      } catch (e) {
        console.warn('[getAutomationExecutionDetail] 解析testCaseMapping失败:', e);
      }
    }
    
    const result = {
      execution: {
        ...execution,
        testExecutionIds: execution.testExecutionIds ? JSON.parse(execution.testExecutionIds) : [],
        testCaseMapping,
      },
      callback: callback ? {
        ...callback,
        callbackData: callback.callbackData ? JSON.parse(callback.callbackData) : null,
      } : null,
    };
    
    return {
      code: 0,
      message: 'Success',
      data: result
    };
    
  } catch (error) {
    console.error('[getAutomationExecutionDetail] 查询失败:', error);
    return {
      code: -1,
      message: `查询失败: ${error.message}`,
    };
  }
}
```

#### 3.4 数据库索引优化
```typescript
// src/trigger/modules/trigger/initialScript.ts - 新增函数

export async function addExecutionRecordIndexes() {
  try {
    // AutomationExecutionRecord索引
    await storage.entity('AutomationExecutionRecord').addIndex(['status', 'triggerTime']);
    await storage.entity('AutomationExecutionRecord').addIndex(['triggerUser', 'triggerTime']);
    await storage.entity('AutomationExecutionRecord').addIndex(['workspaceKey', 'triggerTime']);
    await storage.entity('AutomationExecutionRecord').addIndex(['triggerTime']);
    
    // PipeCallbackQueue索引
    await storage.entity('PipeCallbackQueue').addIndex(['buildId']);
    await storage.entity('PipeCallbackQueue').addIndex(['status', 'createdAt']);
    
    console.log('[初始化] 执行记录索引创建完成');
  } catch (error) {
    console.error('[初始化] 索引创建失败:', error);
  }
}

// 在TODO-2的初始化函数中调用
export async function testManagerInitialScript() {
  // 现有初始化逻辑...
  
  // 添加索引
  await addWebhookQueueIndexes();
  await addExecutionRecordIndexes();
}
```

#### 3.5 Postman测试用例
```bash
# 测试用例1: 基础查询
GET {{baseUrl}}/api/automation/execution-monitor?page=1&pageSize=20

# 测试用例2: 状态筛选
GET {{baseUrl}}/api/automation/execution-monitor?status=running

# 测试用例3: 用户筛选
GET {{baseUrl}}/api/automation/execution-monitor?triggerUser=testuser

# 测试用例4: 复合筛选
GET {{baseUrl}}/api/automation/execution-monitor?page=1&pageSize=10&status=completed&triggerUser=admin

# 测试用例5: 执行详情
GET {{baseUrl}}/api/automation/execution-detail?executionId=实际的executionId

# 期望响应格式
{
  "code": 0,
  "message": "Success", 
  "data": {
    "items": [
      {
        "executionId": "exec_xxx",
        "workspaceKey": "test-workspace",
        "buildId": "build_xxx",
        "status": "running",
        "callbackStatus": "pending",
        "testExecutionIds": ["test_001", "test_002"],
        "triggerUser": "testuser",
        "triggerTime": "2025-01-17T10:00:00.000Z",
        "totalCount": 10,
        "successCount": 7,
        "failedCount": 1,
        "duration": 120
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20
  }
}
```

---

## 🔧 TODO-4：Webhook队列前端页面

### 技术实现方案

#### 4.1 API调用层实现
```typescript
// src/app/lib/api/automation.ts - 新建文件

export const automationAPI = {
  async getWebhookQueue(params: {
    page: number;
    pageSize: number;
    status?: string;
    startTime?: string;
    endTime?: string;
  }) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
    
    const response = await fetch(`/api/automation/webhook-queue?${query}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.code !== 0) {
      throw new Error(result.message || '查询失败');
    }
    
    return result;
  },
  
  async retryWebhook(webhookId: string) {
    const response = await fetch('/api/automation/webhook-retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookId }),
    });
    
    const result = await response.json();
    
    if (result.code !== 0) {
      throw new Error(result.message || '重试失败');
    }
    
    return result;
  },
};
```

#### 4.2 React Query Hooks
```typescript
// src/app/lib/hooks/useWebhookQueue.ts - 新建文件

import { useQuery, useMutation, useQueryClient } from 'react-query';
import { message } from 'antd';
import { automationAPI } from '@/lib/api/automation';

export function useWebhookQueue(params: {
  page: number;
  pageSize: number;
  status?: string;
  startTime?: string;
  endTime?: string;
}) {
  return useQuery(
    ['automationWebhookQueue', params],
    () => automationAPI.getWebhookQueue(params),
    {
      keepPreviousData: true,
      staleTime: 30000,
      retry: 2,
    }
  );
}

export function useRetryWebhook() {
  const queryClient = useQueryClient();
  
  return useMutation(
    (webhookId: string) => automationAPI.retryWebhook(webhookId),
    {
      onSuccess: () => {
        message.success('Webhook已重新加入队列');
        queryClient.invalidateQueries(['automationWebhookQueue']);
      },
      onError: (error: any) => {
        message.error(error.message);
      },
    }
  );
}
```

#### 4.3 状态标签组件
```typescript
// src/app/pages/config/MoreConfig/AutomationQueueMonitor/components/StatusBadge.tsx

import React from 'react';
import { Badge } from 'antd';

interface StatusBadgeProps {
  status: string;
  type: 'webhook' | 'execution' | 'callback';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type }) => {
  const getStatusConfig = (status: string, type: string) => {
    const configs = {
      webhook: {
        pending: { color: 'orange', text: '待处理' },
        processing: { color: 'blue', text: '处理中' },
        completed: { color: 'green', text: '已完成' },
        failed: { color: 'red', text: '失败' },
      },
      execution: {
        pending: { color: 'orange', text: '待执行' },
        running: { color: 'blue', text: '执行中' },
        parsing: { color: 'cyan', text: '解析中' },
        completed: { color: 'green', text: '已完成' },
        failed: { color: 'red', text: '失败' },
      },
      callback: {
        pending: { color: 'orange', text: '待处理' },
        processing: { color: 'blue', text: '处理中' },
        completed: { color: 'green', text: '已完成' },
        failed: { color: 'red', text: '失败' },
      },
    };
    
    return configs[type]?.[status] || { color: 'default', text: status };
  };
  
  const config = getStatusConfig(status, type);
  
  return <Badge color={config.color} text={config.text} />;
};

export default StatusBadge;
```

#### 4.4 Webhook队列主组件
```typescript
// src/app/pages/config/MoreConfig/AutomationQueueMonitor/WebhookQueue.tsx - 替换占位组件

import React, { useState } from 'react';
import { Table, Select, DatePicker, Button, Tooltip, Tag, Popconfirm } from 'antd';
import { ReloadOutlined, RetryOutlined } from '@ant-design/icons';
import { useWebhookQueue, useRetryWebhook } from '@/lib/hooks/useWebhookQueue';
import StatusBadge from './components/StatusBadge';

const { RangePicker } = DatePicker;
const { Option } = Select;

const WebhookQueue: React.FC = () => {
  // 状态管理
  const [filters, setFilters] = useState({
    status: undefined,
    dateRange: undefined,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
  });
  
  // 数据查询
  const { data, isLoading, refetch } = useWebhookQueue({
    page: pagination.current,
    pageSize: pagination.pageSize,
    status: filters.status,
    startTime: filters.dateRange?.[0]?.format('YYYY-MM-DD HH:mm:ss'),
    endTime: filters.dateRange?.[1]?.format('YYYY-MM-DD HH:mm:ss'),
  });
  
  const retryMutation = useRetryWebhook();
  
  // 表格列定义
  const columns = [
    {
      title: '仓库名称',
      dataIndex: 'repositoryName',
      key: 'repositoryName',
      width: 200,
      render: (text: string, record: any) => (
        <Tooltip title={record.repositoryId}>
          {text}
        </Tooltip>
      ),
    },
    {
      title: '分支',
      dataIndex: 'branchName',
      key: 'branchName',
      width: 120,
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '提交数量',
      dataIndex: 'commitIds',
      key: 'commitIds',
      width: 80,
      align: 'center' as const,
      render: (commitIds: string[]) => commitIds?.length || 0,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <StatusBadge status={status} type="webhook" />,
    },
    {
      title: '重试次数',
      dataIndex: 'retryCount',
      key: 'retryCount',
      width: 80,
      align: 'center' as const,
      render: (count: number) => (
        <span style={{ color: count > 0 ? '#ff4d4f' : undefined }}>
          {count}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (time: string) => formatRelativeTime(time),
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      width: 200,
      render: (error: string) => (
        error ? (
          <Tooltip title={error}>
            <span style={{ color: '#ff4d4f', cursor: 'pointer' }}>
              {error.length > 50 ? `${error.substring(0, 50)}...` : error}
            </span>
          </Tooltip>
        ) : '-'
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record: any) => (
        record.status === 'failed' && (
          <Popconfirm
            title="确定要重试此Webhook吗？"
            onConfirm={() => retryMutation.mutate(record.objectId)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              icon={<RetryOutlined />}
              loading={retryMutation.isLoading}
            >
              重试
            </Button>
          </Popconfirm>
        )
      ),
    },
  ];
  
  // 事件处理函数
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };
  
  const handleTableChange = (paginationInfo: any) => {
    setPagination({
      current: paginationInfo.current,
      pageSize: paginationInfo.pageSize,
    });
  };
  
  const formatRelativeTime = (time: string) => {
    const now = new Date();
    const target = new Date(time);
    const diff = Math.floor((now.getTime() - target.getTime()) / 1000);
    
    if (diff < 60) return `${diff}秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return `${Math.floor(diff / 86400)}天前`;
  };
  
  return (
    <div className="webhook-queue">
      {/* 筛选器 */}
      <div style={{ marginBottom: 16 }}>
        <Select
          placeholder="筛选状态"
          style={{ width: 120, marginRight: 8 }}
          allowClear
          value={filters.status}
          onChange={(value) => handleFilterChange('status', value)}
        >
          <Option value="pending">待处理</Option>
          <Option value="processing">处理中</Option>
          <Option value="completed">已完成</Option>
          <Option value="failed">失败</Option>
        </Select>
        
        <RangePicker
          style={{ marginRight: 8 }}
          showTime
          value={filters.dateRange}
          onChange={(dates) => handleFilterChange('dateRange', dates)}
        />
        
        <Button
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
          loading={isLoading}
        >
          刷新
        </Button>
      </div>
      
      {/* 数据表格 */}
      <Table
        columns={columns}
        dataSource={data?.data?.items || []}
        loading={isLoading}
        rowKey="objectId"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: data?.data?.total || 0,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} / ${total} 条`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1000 }}
      />
    </div>
  );
};

export default WebhookQueue;
```

#### 4.5 国际化文案补充
```json
// locales/zh/index.json - 补充
{
  "automationQueueMonitor.webhook.repository": "仓库名称",
  "automationQueueMonitor.webhook.branch": "分支",
  "automationQueueMonitor.webhook.commits": "提交数量",
  "automationQueueMonitor.webhook.status": "状态",
  "automationQueueMonitor.webhook.retryCount": "重试次数",
  "automationQueueMonitor.webhook.createdAt": "创建时间",
  "automationQueueMonitor.webhook.error": "错误信息",
  "automationQueueMonitor.action.refresh": "刷新",
  "automationQueueMonitor.action.retry": "重试",
  "automationQueueMonitor.confirm.retry": "确定要重试此Webhook吗？",
  "common.confirm": "确定",
  "common.cancel": "取消"
}
```

---

## 🔧 TODO-5：执行监控前端页面

### 技术实现方案

#### 5.1 执行监控API扩展
```typescript
// src/app/lib/api/automation.ts - 扩展

export const automationAPI = {
  // 现有Webhook API...
  
  async getExecutionMonitor(params: {
    page: number;
    pageSize: number;
    status?: string;
    triggerUser?: string;
    startTime?: string;
    endTime?: string;
  }) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
    
    const response = await fetch(`/api/automation/execution-monitor?${query}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.code !== 0) {
      throw new Error(result.message || '查询失败');
    }
    
    return result;
  },
  
  async getExecutionDetail(executionId: string) {
    const response = await fetch(`/api/automation/execution-detail?executionId=${executionId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.code !== 0) {
      throw new Error(result.message || '查询失败');
    }
    
    return result;
  },
};
```

#### 5.2 执行监控Hooks
```typescript
// src/app/lib/hooks/useExecutionMonitor.ts - 新建文件

import { useQuery } from 'react-query';
import { automationAPI } from '@/lib/api/automation';

export function useExecutionMonitor(params: {
  page: number;
  pageSize: number;
  status?: string;
  triggerUser?: string;
  startTime?: string;
  endTime?: string;
}) {
  return useQuery(
    ['automationExecutionMonitor', params],
    () => automationAPI.getExecutionMonitor(params),
    {
      keepPreviousData: true,
      staleTime: 30000,
      // 如果有执行中的任务，30秒自动刷新
      refetchInterval: (data) => {
        const hasRunningTasks = data?.data?.items?.some(
          (item: any) => ['pending', 'running', 'parsing'].includes(item.status)
        );
        return hasRunningTasks ? 30000 : false;
      },
      retry: 2,
    }
  );
}

export function useExecutionDetail(executionId: string, enabled = true) {
  return useQuery(
    ['automationExecutionDetail', executionId],
    () => automationAPI.getExecutionDetail(executionId),
    {
      enabled: enabled && !!executionId,
      staleTime: 60000,
      retry: 2,
    }
  );
}
```

#### 5.3 执行监控主组件
```typescript
// src/app/pages/config/MoreConfig/AutomationQueueMonitor/ExecutionMonitor.tsx - 替换占位组件

import React, { useState } from 'react';
import { Table, Select, Button, Progress, Tag, Tooltip, Space } from 'antd';
import { ReloadOutlined, EyeOutlined, LinkOutlined } from '@ant-design/icons';
import { useExecutionMonitor } from '@/lib/hooks/useExecutionMonitor';
import StatusBadge from './components/StatusBadge';

const { Option } = Select;

const ExecutionMonitor: React.FC = () => {
  const [filters, setFilters] = useState({
    status: undefined,
    triggerUser: undefined,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
  });
  
  const { data, isLoading, refetch } = useExecutionMonitor({
    page: pagination.current,
    pageSize: pagination.pageSize,
    status: filters.status,
    triggerUser: filters.triggerUser,
  });
  
  const columns = [
    {
      title: '执行ID',
      dataIndex: 'executionId',
      key: 'executionId',
      width: 120,
      render: (text: string) => (
        <Tooltip title={text}>
          <code>{text.substring(0, 8)}</code>
        </Tooltip>
      ),
    },
    {
      title: '工作空间',
      dataIndex: 'workspaceKey',
      key: 'workspaceKey',
      width: 120,
      render: (text: string) => <Tag color="purple">{text}</Tag>,
    },
    {
      title: '构建ID',
      dataIndex: 'buildId',
      key: 'buildId',
      width: 120,
      render: (text: string) => (
        text ? (
          <Tooltip title={text}>
            <code>{text.substring(0, 8)}</code>
          </Tooltip>
        ) : '-'
      ),
    },
    {
      title: '执行状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <StatusBadge status={status} type="execution" />,
    },
    {
      title: '回调状态',
      dataIndex: 'callbackStatus',
      key: 'callbackStatus',
      width: 100,
      render: (status: string) => (
        status ? <StatusBadge status={status} type="callback" /> : '-'
      ),
    },
    {
      title: '测试数量',
      dataIndex: 'testExecutionIds',
      key: 'testCount',
      width: 80,
      align: 'center' as const,
      render: (ids: string[]) => ids?.length || 0,
    },
    {
      title: '结果统计',
      key: 'result',
      width: 150,
      render: (_, record: any) => {
        const { totalCount, successCount, failedCount } = record;
        if (totalCount === 0) return '-';
        
        const successRate = Math.round((successCount / totalCount) * 100);
        
        return (
          <div>
            <Progress
              percent={successRate}
              size="small"
              format={() => `${successCount}/${totalCount}`}
              status={failedCount > 0 ? 'exception' : 'success'}
            />
            {failedCount > 0 && (
              <div style={{ fontSize: '12px', color: '#ff4d4f' }}>
                失败: {failedCount}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '触发用户',
      dataIndex: 'triggerUser',
      key: 'triggerUser',
      width: 100,
    },
    {
      title: '触发时间',
      dataIndex: 'triggerTime',
      key: 'triggerTime',
      width: 160,
      render: (time: string) => formatRelativeTime(time),
    },
    {
      title: '耗时',
      key: 'duration',
      width: 80,
      render: (_, record: any) => {
        if (!record.duration) return '-';
        return formatDuration(record.duration);
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record: any) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          
          {record.pipeJumpUrl && (
            <Button
              type="link"
              size="small"
              icon={<LinkOutlined />}
              onClick={() => window.open(record.pipeJumpUrl, '_blank')}
            >
              Pipe
            </Button>
          )}
          
          {record.reportUrl && (
            <Button
              type="link"
              size="small"
              icon={<LinkOutlined />}
              onClick={() => window.open(record.reportUrl, '_blank')}
            >
              报告
            </Button>
          )}
        </Space>
      ),
    },
  ];
  
  // 事件处理
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };
  
  const handleTableChange = (paginationInfo: any) => {
    setPagination({
      current: paginationInfo.current,
      pageSize: paginationInfo.pageSize,
    });
  };
  
  const handleViewDetail = (record: any) => {
    console.log('查看详情:', record);
    // 在TODO-6中实现详情弹窗
  };
  
  const formatRelativeTime = (time: string) => {
    const now = new Date();
    const target = new Date(time);
    const diff = Math.floor((now.getTime() - target.getTime()) / 1000);
    
    if (diff < 60) return `${diff}秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return `${Math.floor(diff / 86400)}天前`;
  };
  
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };
  
  // 获取唯一的触发用户列表
  const triggerUsers = [...new Set(data?.data?.items?.map(item => item.triggerUser).filter(Boolean))];
  
  return (
    <div className="execution-monitor">
      {/* 筛选器 */}
      <div style={{ marginBottom: 16 }}>
        <Select
          placeholder="筛选执行状态"
          style={{ width: 120, marginRight: 8 }}
          allowClear
          value={filters.status}
          onChange={(value) => handleFilterChange('status', value)}
        >
          <Option value="pending">待执行</Option>
          <Option value="running">执行中</Option>
          <Option value="parsing">解析中</Option>
          <Option value="completed">已完成</Option>
          <Option value="failed">失败</Option>
        </Select>
        
        <Select
          placeholder="筛选触发用户"
          style={{ width: 120, marginRight: 8 }}
          allowClear
          value={filters.triggerUser}
          onChange={(value) => handleFilterChange('triggerUser', value)}
        >
          {triggerUsers.map(user => (
            <Option key={user} value={user}>{user}</Option>
          ))}
        </Select>
        
        <Button
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
          loading={isLoading}
        >
          刷新
        </Button>
      </div>
      
      {/* 数据表格 */}
      <Table
        columns={columns}
        dataSource={data?.data?.items || []}
        loading={isLoading}
        rowKey="objectId"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: data?.data?.total || 0,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} / ${total} 条`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1400 }}
      />
    </div>
  );
};

export default ExecutionMonitor;
```

---

## 🔧 TODO-6：功能完善和优化

### 技术实现方案

#### 6.1 详情弹窗组件
```typescript
// src/app/pages/config/MoreConfig/AutomationQueueMonitor/components/DetailModal.tsx

import React from 'react';
import { Modal, Descriptions, Tag, Typography, Divider, Space } from 'antd';
import StatusBadge from './StatusBadge';

const { Text, Paragraph } = Typography;

interface DetailModalProps {
  visible: boolean;
  item: any;
  onClose: () => void;
  type: 'webhook' | 'execution';
}

const DetailModal: React.FC<DetailModalProps> = ({ 
  visible, 
  item, 
  onClose, 
  type 
}) => {
  if (!item) return null;
  
  const renderWebhookDetail = (item: any) => (
    <>
      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label="仓库名称">
          {item.repositoryName}
        </Descriptions.Item>
        <Descriptions.Item label="Repository ID">
          <Text code>{item.repositoryId}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="分支">
          <Tag color="blue">{item.branchName}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <StatusBadge status={item.status} type="webhook" />
        </Descriptions.Item>
        <Descriptions.Item label="重试次数">
          {item.retryCount}
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {new Date(item.createdAt).toLocaleString()}
        </Descriptions.Item>
      </Descriptions>
      
      <Divider>Commit IDs</Divider>
      <Space wrap>
        {item.commitIds?.map((commitId: string, index: number) => (
          <Tag key={index}>
            <Text code>{commitId.substring(0, 8)}</Text>
          </Tag>
        ))}
      </Space>
      
      {item.errorMessage && (
        <>
          <Divider>错误信息</Divider>
          <Paragraph>
            <Text type="danger">{item.errorMessage}</Text>
          </Paragraph>
        </>
      )}
    </>
  );
  
  const renderExecutionDetail = (item: any) => (
    <>
      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label="执行ID">
          <Text code>{item.executionId}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="工作空间">
          <Tag color="purple">{item.workspaceKey}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="构建ID">
          {item.buildId ? <Text code>{item.buildId}</Text> : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="执行状态">
          <StatusBadge status={item.status} type="execution" />
        </Descriptions.Item>
        <Descriptions.Item label="回调状态">
          {item.callbackStatus ? 
            <StatusBadge status={item.callbackStatus} type="callback" /> : '-'
          }
        </Descriptions.Item>
        <Descriptions.Item label="触发用户">
          {item.triggerUser}
        </Descriptions.Item>
        <Descriptions.Item label="触发时间">
          {new Date(item.triggerTime).toLocaleString()}
        </Descriptions.Item>
        <Descriptions.Item label="Maven/JDK版本">
          {item.mavenVersion} / {item.jdkVersion}
        </Descriptions.Item>
      </Descriptions>
      
      <Divider>执行结果统计</Divider>
      <Descriptions column={4} bordered size="small">
        <Descriptions.Item label="总数">{item.totalCount}</Descriptions.Item>
        <Descriptions.Item label="成功">{item.successCount}</Descriptions.Item>
        <Descriptions.Item label="失败">{item.failedCount}</Descriptions.Item>
        <Descriptions.Item label="跳过">{item.skippedCount}</Descriptions.Item>
      </Descriptions>
      
      {item.testExecutionIds && item.testExecutionIds.length > 0 && (
        <>
          <Divider>测试执行ID</Divider>
          <Space wrap>
            {item.testExecutionIds.slice(0, 10).map((id: string, index: number) => (
              <Tag key={index}>
                <Text code>{id}</Text>
              </Tag>
            ))}
            {item.testExecutionIds.length > 10 && (
              <Text type="secondary">... 还有{item.testExecutionIds.length - 10}个</Text>
            )}
          </Space>
        </>
      )}
      
      {(item.pipeJumpUrl || item.reportUrl) && (
        <>
          <Divider>外部链接</Divider>
          <Space>
            {item.pipeJumpUrl && (
              <a href={item.pipeJumpUrl} target="_blank" rel="noopener noreferrer">
                Pipe平台
              </a>
            )}
            {item.reportUrl && (
              <a href={item.reportUrl} target="_blank" rel="noopener noreferrer">
                测试报告
              </a>
            )}
          </Space>
        </>
      )}
      
      {item.errorMessage && (
        <>
          <Divider>错误信息</Divider>
          <Paragraph>
            <Text type="danger">{item.errorMessage}</Text>
          </Paragraph>
        </>
      )}
    </>
  );
  
  return (
    <Modal
      title={type === 'webhook' ? 'Webhook详情' : '执行详情'}
      visible={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      {type === 'webhook' ? renderWebhookDetail(item) : renderExecutionDetail(item)}
    </Modal>
  );
};

export default DetailModal;
```

#### 6.2 组件集成详情功能
```typescript
// WebhookQueue.tsx - 添加详情功能
import DetailModal from './components/DetailModal';

const WebhookQueue: React.FC = () => {
  // 现有状态...
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  
  // 在操作列中添加详情按钮
  const columns = [
    // 现有列...
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record: any) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          
          {record.status === 'failed' && (
            <Popconfirm
              title="确定要重试此Webhook吗？"
              onConfirm={() => retryMutation.mutate(record.objectId)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                icon={<RetryOutlined />}
                loading={retryMutation.isLoading}
              >
                重试
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];
  
  const handleViewDetail = (record: any) => {
    setSelectedItem(record);
    setDetailVisible(true);
  };
  
  return (
    <div className="webhook-queue">
      {/* 现有内容... */}
      
      {/* 详情弹窗 */}
      <DetailModal
        visible={detailVisible}
        item={selectedItem}
        onClose={() => setDetailVisible(false)}
        type="webhook"
      />
    </div>
  );
};

// ExecutionMonitor.tsx - 类似修改
```

#### 6.3 错误处理优化
```typescript
// src/app/lib/api/automation.ts - 改进版

class AutomationAPI {
  private async handleResponse(response: Response) {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.code !== 0) {
      throw new Error(result.message || '操作失败');
    }
    
    return result;
  }
  
  private async request(url: string, options?: RequestInit) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error(`API请求失败 [${url}]:`, error);
      
      // 网络错误处理
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('网络连接失败，请检查网络后重试');
      }
      
      throw error;
    }
  }
  
  async getWebhookQueue(params: any) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
    
    return await this.request(`/api/automation/webhook-queue?${query}`);
  }
  
  async retryWebhook(webhookId: string) {
    return await this.request('/api/automation/webhook-retry', {
      method: 'POST',
      body: JSON.stringify({ webhookId }),
    });
  }
  
  async getExecutionMonitor(params: any) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
    
    return await this.request(`/api/automation/execution-monitor?${query}`);
  }
}

export const automationAPI = new AutomationAPI();
```

#### 6.4 性能优化 - React Query配置
```typescript
// src/app/pages/config/MoreConfig/AutomationQueueMonitor/index.tsx - 优化版

import { QueryClient, QueryClientProvider } from 'react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // 4xx错误不重试
        if (error?.message?.includes('HTTP 4')) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 30000, // 30秒内数据认为是新鲜的
      cacheTime: 5 * 60 * 1000, // 缓存5分钟
    },
  },
});

const AutomationQueueMonitor: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('webhook');
  
  return (
    <QueryClientProvider client={queryClient}>
      <div className={cx('automation-queue-monitor')}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={t('automationQueueMonitor.tab.webhook')} key="webhook">
            <WebhookQueue />
          </TabPane>
          <TabPane tab={t('automationQueueMonitor.tab.execution')} key="execution">
            <ExecutionMonitor />
          </TabPane>
        </Tabs>
      </div>
    </QueryClientProvider>
  );
};
```

#### 6.5 国际化文案完善
```json
// locales/zh/index.json - 最终完整版
{
  "page.config.automationQueueMonitor.title": "自动化队列监控",
  "page.config.automationQueueMonitor.description": "监控自动化测试集成的队列状态和执行进度",
  
  "automationQueueMonitor.tab.webhook": "Webhook队列",
  "automationQueueMonitor.tab.execution": "执行监控",
  
  "automationQueueMonitor.webhook.repository": "仓库名称",
  "automationQueueMonitor.webhook.branch": "分支",
  "automationQueueMonitor.webhook.commits": "提交数量",
  "automationQueueMonitor.webhook.status": "状态",
  "automationQueueMonitor.webhook.retryCount": "重试次数",
  "automationQueueMonitor.webhook.createdAt": "创建时间",
  "automationQueueMonitor.webhook.error": "错误信息",
  
  "automationQueueMonitor.execution.executionId": "执行ID",
  "automationQueueMonitor.execution.workspace": "工作空间",
  "automationQueueMonitor.execution.buildId": "构建ID",
  "automationQueueMonitor.execution.status": "执行状态",
  "automationQueueMonitor.execution.callbackStatus": "回调状态",
  "automationQueueMonitor.execution.testCount": "测试数量",
  "automationQueueMonitor.execution.result": "结果统计",
  "automationQueueMonitor.execution.triggerUser": "触发用户",
  "automationQueueMonitor.execution.triggerTime": "触发时间",
  "automationQueueMonitor.execution.duration": "耗时",
  
  "automationQueueMonitor.status.pending": "待处理",
  "automationQueueMonitor.status.processing": "处理中",
  "automationQueueMonitor.status.running": "执行中",
  "automationQueueMonitor.status.parsing": "解析中",
  "automationQueueMonitor.status.completed": "已完成",
  "automationQueueMonitor.status.failed": "失败",
  
  "automationQueueMonitor.action.refresh": "刷新",
  "automationQueueMonitor.action.retry": "重试",
  "automationQueueMonitor.action.detail": "详情",
  "automationQueueMonitor.action.filter": "筛选",
  
  "automationQueueMonitor.confirm.retry": "确定要重试此项目吗？",
  "automationQueueMonitor.message.retrySuccess": "重试设置成功",
  "automationQueueMonitor.message.retryFailed": "重试失败",
  "automationQueueMonitor.message.loadFailed": "数据加载失败",
  
  "common.confirm": "确定",
  "common.cancel": "取消",
  "common.items": "条",
  "common.report": "报告"
}

// locales/en/index.json - 对应英文版本
```

#### 6.6 综合测试方案
```typescript
// 测试清单
const testCases = {
  // 功能完整性测试
  functionalTests: [
    '页面访问正常',
    'Tab切换正常',
    'Webhook队列数据展示正确',
    '执行监控数据展示正确',
    '筛选功能正常',
    '分页功能正常',
    '重试功能正常',
    '详情查看正常',
    '外部链接跳转正常',
    '自动刷新功能正常',
  ],
  
  // 性能测试
  performanceTests: [
    '页面加载时间 < 3秒',
    'API响应时间 < 2秒',
    '大数据量分页正常',
    '内存使用合理',
  ],
  
  // 错误处理测试
  errorHandlingTests: [
    '网络异常处理',
    'API错误处理',
    '数据为空处理',
    '权限异常处理',
  ],
  
  // 兼容性测试
  compatibilityTests: [
    'Chrome浏览器',
    'Firefox浏览器',
    'Safari浏览器',
    '不同分辨率适配',
    '中英文切换',
  ],
};
```

---

**文档版本**: v1.0  
**最后更新**: 2025-01-17  
**总页数**: 约100页（包含所有技术细节）