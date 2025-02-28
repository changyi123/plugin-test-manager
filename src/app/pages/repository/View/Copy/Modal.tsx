import { useSDK } from '@projectproxima/plugin-sdk';
import { useMemoizedFn } from 'ahooks';
import { Form, Modal, ModalProps } from 'antd/lib';
import React, { useCallback, useState } from 'react';

import RepositorySelectorField from '@/components/business/RepositorySelectorField';
import WorkspaceSelector from '@/components/business/TestEntitySelectorModal/WorkspaceSelector';
import useI18n from '@/lib/hooks/useI18n';
import { CopyTestCaseV2PayloadTo } from '@/lib/types/Test';

const CopyModal: React.FC<
  ModalProps & { handleOk: (value: CopyTestCaseV2PayloadTo) => Promise<void> }
> = props => {
  const { t } = useI18n();
  const { context } = useSDK();
  const { handleOk, ...otherProps } = props;

  const [form] = Form.useForm();
  const [workspaceKey, setWorkspaceKey] = useState(context?.env?.WORKSPACE_KEY);

  const afterOpenChange = useCallback(() => {
    form.resetFields();
  }, [form]);

  const onOk = useMemoizedFn(async () => {
    return await form.validateFields().then(async value => {
      return await handleOk?.(value);
    });
  });

  return (
    <Modal {...otherProps} destroyOnClose onOk={onOk} afterOpenChange={afterOpenChange}>
      <Form form={form} layout="vertical" initialValues={{ workspaceKey }}>
        <Form.Item name="workspace" label={t('page.config.selectWorkspace')} required>
          <WorkspaceSelector
            onChange={v => {
              form.setFieldValue('workspace', v);
              setWorkspaceKey(v.key);
            }}
            showCurrent
            hiddenLabel
            onlyValue={false}
            wrapClassName="wrap"
            className="select"
          />
        </Form.Item>
        <Form.Item
          name="repository"
          label={t('components.business.repositorySelector.choiceGroup')}
        >
          <RepositorySelectorField
            workspaceKey={workspaceKey}
            onChange={v => form.setFieldValue('repository', v[0])}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CopyModal;
