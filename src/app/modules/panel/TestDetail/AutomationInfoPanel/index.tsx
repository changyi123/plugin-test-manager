import React from 'react';
import { Empty } from 'antd';

import { useTestConfig } from '@/lib/hooks/useContext';
import css from './index.less';

const AutomationInfoPanel: React.FC = () => {
  const { testEntity } = useTestConfig();

  // 全面调试：查看testEntity的所有字段
  console.log('[AutomationInfoPanel] testEntity完整数据:', testEntity);
  console.log('[AutomationInfoPanel] testEntity.values:', testEntity?.values);
  
  // 检查所有可能的自动化字段
  if (testEntity) {
    console.log('[AutomationInfoPanel] 检查所有字段:');
    Object.keys(testEntity).forEach(key => {
      if (key.includes('atm') || key.includes('automation')) {
        console.log(`[AutomationInfoPanel] 根字段 ${key}:`, testEntity[key]);
      }
    });
    
    if (testEntity?.values) {
      console.log('[AutomationInfoPanel] 检查values字段:');
      Object.keys(testEntity.values).forEach(key => {
        if (key.includes('atm') || key.includes('automation')) {
          console.log(`[AutomationInfoPanel] values.${key}:`, testEntity.values[key]);
        }
      });
    }
  }

  // 获取自动化相关字段 - 检查多种可能的字段名
  const getFieldValue = (fieldName: string) => {
    // 优先使用带前缀的字段名，这是API返回的格式
    return (
      testEntity?.values?.[`r_test_manager_${fieldName}`] ||
      testEntity?.values?.[fieldName] ||
      testEntity?.[`r_test_manager_${fieldName}`] ||
      testEntity?.[fieldName]
    );
  };

  const automationInfo = {
    testId: getFieldValue('atm_test_id'),
    className: getFieldValue('atm_class_name'),
    methodName: getFieldValue('atm_method_name'),
    filePath: getFieldValue('atm_file_path'),
    modulePath: getFieldValue('atm_module_path'),
    framework: getFieldValue('atm_framework'),
    frameworkVersion: getFieldValue('atm_framework_version'),
    startLine: getFieldValue('atm_start_line'),
    endLine: getFieldValue('atm_end_line'),
    commitId: getFieldValue('atm_commit_id'),
    lastSync: getFieldValue('atm_last_sync'),
    gitCloneUrl: getFieldValue('atm_git_clone_url'),
    gitBranch: getFieldValue('atm_git_branch'),
    gitPath: getFieldValue('atm_git_path'),
    repository: getFieldValue('repository') || testEntity?.values?.r_test_manager_repository,
  };

  console.log('[AutomationInfoPanel] 解析后的automationInfo:', automationInfo);

  // 检查是否有自动化信息 - 主要检查核心字段
  const hasAutomationInfo = !!(
    automationInfo.testId ||
    (automationInfo.className && automationInfo.methodName)
  );

  if (!hasAutomationInfo) {
    return (
      <div className={css('automation-panel-empty')}>
        <Empty description="该用例暂无单测信息" />
      </div>
    );
  }

  return (
    <div className={css('automation-panel')}>
      <div style={{ background: '#fff', borderRadius: 4, border: '1px solid #d9d9d9' }}>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0', fontWeight: 500 }}>
          单元测试信息
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <strong>测试ID：</strong>
            <span
              style={{
                fontFamily: 'monospace',
                backgroundColor: '#f5f5f5',
                padding: '2px 4px',
                borderRadius: 2,
              }}
            >
              {automationInfo.testId || '-'}
            </span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>类名：</strong>
            {automationInfo.className || '-'}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>方法名：</strong>
            {automationInfo.methodName || '-'}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>文件路径：</strong>
            <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
              {automationInfo.filePath || '-'}
            </span>
          </div>
          {automationInfo.modulePath && (
            <div style={{ marginBottom: 8 }}>
              <strong>模块路径：</strong>
              <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                {automationInfo.modulePath}
              </span>
            </div>
          )}
          <div style={{ marginBottom: 8 }}>
            <strong>测试框架：</strong>
            {automationInfo.framework || '-'}
            {automationInfo.frameworkVersion && ` (${automationInfo.frameworkVersion})`}
          </div>
          {(automationInfo.startLine || automationInfo.endLine) && (
            <div style={{ marginBottom: 8 }}>
              <strong>代码行号：</strong>
              {automationInfo.startLine || '?'} - {automationInfo.endLine || '?'}
            </div>
          )}
          <div style={{ marginBottom: 8 }}>
            <strong>Git分支：</strong>
            {automationInfo.gitBranch || '-'}
          </div>
          {automationInfo.gitCloneUrl && (
            <div style={{ marginBottom: 8 }}>
              <strong>Git仓库：</strong>
              <span style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
                {automationInfo.gitCloneUrl}
              </span>
            </div>
          )}
          {automationInfo.gitPath && (
            <div style={{ marginBottom: 8 }}>
              <strong>Git路径：</strong>
              {automationInfo.gitPath}
            </div>
          )}
          {/* <div style={{ marginBottom: 8 }}>
            <strong>仓库：</strong>
            {automationInfo.repository || '-'}
          </div> */}
          {automationInfo.lastSync && (
            <div style={{ marginBottom: 8 }}>
              <strong>最后同步：</strong>
              <span style={{ fontSize: '12px', color: '#666' }}>
                {automationInfo.lastSync}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutomationInfoPanel;