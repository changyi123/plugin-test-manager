import { PlayCircleOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { Button, Form, message, Modal, Select, Typography } from 'antd';
import React, { useState } from 'react';

import { checkExecutionStatus, triggerAutomationExecution } from '@/lib/automation/api';
import {
  canExecuteAutomation,
  getAutomationStatusLabel,
  TestExecutionAutomationStatus,
} from '@/lib/automation/types';
import useI18n from '@/lib/hooks/useI18n';

import { getEnv } from '../../../../common/utils/helper';

interface ExecuteParams {
  testExecutionIds: string[];
  mavenVersion: string;
  jdkVersion: string;
}

interface AutomationExecuteModalProps {
  testExecutionIds: string[];
  visible: boolean;
  onExecute?: (params: ExecuteParams) => Promise<void>;
  onCancel: () => void;
  onSuccess?: (executionId: string) => void;
}

const AutomationExecuteModal: React.FC<AutomationExecuteModalProps> = ({
  testExecutionIds,
  visible,
  onExecute,
  onCancel,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 调试日志
  React.useEffect(() => {
    if (visible) {
      console.log('[AutomationExecuteModal] 弹窗打开，testExecutionIds:', testExecutionIds);
      console.log('[AutomationExecuteModal] testExecutionIds类型:', typeof testExecutionIds);
      console.log('[AutomationExecuteModal] testExecutionIds长度:', testExecutionIds?.length);
    }
  }, [visible, testExecutionIds]);

  // 从环境变量获取配置，如果没有配置则使用默认值
  const env = getEnv();

  // Maven版本配置，支持通过环境变量自定义
  const mavenVersions = env?.AUTOMATION_MAVEN_VERSIONS || ['3.6.3', '3.8.1', '3.9.0'];
  const mavenOptions = mavenVersions.map(version => ({
    label: `Maven ${version}`,
    value: version,
  }));

  // JDK版本配置，默认只有JDK 8
  const jdkVersions = env?.AUTOMATION_JDK_VERSIONS || ['8'];
  const jdkOptions = jdkVersions.map(version => ({
    label: `JDK ${version}`,
    value: version,
  }));

  // 检查执行状态
  const { data: statusCheck, loading: checkingStatus } = useRequest(
    async () => {
      if (!testExecutionIds.length || !visible) return null;
      return await checkExecutionStatus(testExecutionIds);
    },
    {
      refreshDeps: [testExecutionIds, visible],
    },
  );

  const handleExecute = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      const params: ExecuteParams = {
        testExecutionIds,
        mavenVersion: values.mavenVersion,
        jdkVersion: values.jdkVersion,
      };

      if (onExecute) {
        await onExecute(params);
      } else {
        // 默认执行逻辑
        const result = await triggerAutomationExecution(params);
        if (onSuccess) {
          onSuccess(result.executionId);
        }
        message.success(`自动化执行已触发，执行ID: ${result.executionId}`);
      }

      onCancel(); // 执行成功后关闭弹窗
    } catch (error) {
      console.error('自动化执行失败:', error);
      message.error(error.message || '自动化执行失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  // 检查是否有执行中的用例
  const runningExecutions = statusCheck?.runningExecutions || [];
  const canExecute = !runningExecutions.length;

  return (
    <Modal
      title="自动化执行参数配置"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={500}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Typography.Text strong>将执行 {testExecutionIds.length} 个测试用例</Typography.Text>

        {/* 显示执行状态检查结果 */}
        {checkingStatus && <Typography.Text type="secondary"> - 检查执行状态中...</Typography.Text>}

        {!canExecute && (
          <div style={{ marginTop: 8 }}>
            <Typography.Text type="warning">以下测试执行正在进行中，无法重复执行：</Typography.Text>
            <ul style={{ marginLeft: 16, color: '#faad14' }}>
              {runningExecutions.map(execId => (
                <li key={execId}>{execId}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          mavenVersion: mavenVersions[0] || '3.6.3',
          jdkVersion: jdkVersions[0] || '8',
        }}
      >
        <Form.Item
          label="Maven版本"
          name="mavenVersion"
          rules={[{ required: true, message: '请选择Maven版本' }]}
        >
          <Select options={mavenOptions} placeholder="请选择Maven版本" />
        </Form.Item>

        <Form.Item
          label="JDK版本"
          name="jdkVersion"
          rules={[{ required: true, message: '请选择JDK版本' }]}
        >
          <Select options={jdkOptions} placeholder="请选择JDK版本" />
        </Form.Item>

        <Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleCancel}>取消</Button>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              loading={loading}
              disabled={!canExecute || checkingStatus}
              onClick={handleExecute}
            >
              开始执行
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AutomationExecuteModal;
