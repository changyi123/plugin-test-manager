import { useSDK } from '@giteeteam/plugin-sdk';
import { useMemoizedFn } from 'ahooks';
import { Form, Input, Modal, ModalProps } from 'antd/lib';
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { RepositorySelectorField } from '@/components/business/RepositorySelectorField';
import useI18n from '@/lib/hooks/useI18n';
import EventBus from '@/lib/utils/eventBus';

let timer = null;
let PreviousMessageData = null;
let PreviousButtonClicked = false;
const reset = () => {
  PreviousMessageData = null;
  PreviousButtonClicked = false;
};

const ChangeFolderEventType = 'ChangeFolder';
export enum CHANGE_TYPE {
  MOVE,
  COPY,
}

interface ChangeFolderRef {
  open: (title: CHANGE_TYPE, props: any) => any;
}

const ChangeFolder: React.ForwardRefRenderFunction<ChangeFolderRef, ModalProps & { validate }> = (
  props,
  ref,
) => {
  const { t } = useI18n();
  const { context } = useSDK();
  const { validate, ...otherProps } = props;
  const eventBusRef = React.useRef<any>(new EventBus());

  const [visible, setVisible] = useState(false);
  const [type, setType] = useState(CHANGE_TYPE.MOVE);
  const [node, setNode] = useState(null);
  const actionRef = useRef(null);

  const [form] = Form.useForm();

  const close = useCallback(() => {
    setVisible(false);
    setType(undefined);
    form.resetFields();
  }, [form]);

  const onOk = useMemoizedFn(async () => {
    if (PreviousButtonClicked || actionRef.current?.loading) return;
    PreviousButtonClicked = true;
    const folderTreeData = actionRef.current?.folderTreeData;
    const flattenedTreeData = folderTreeData?.flattenedTreeData ?? [];
    const getValidateNodes = nodes =>
      type === CHANGE_TYPE.MOVE ? nodes.filter(n => n.key !== node?.key) : nodes;
    return await form
      .validateFields()
      .then(async value => {
        const targetNode = value.parentKey
          ? flattenedTreeData.find(node => node.key === value.parentKey)
          : null;
        const nodes = targetNode ? targetNode.children || [] : folderTreeData;
        validate(value.name, getValidateNodes(nodes), node, targetNode);
        eventBusRef.current.dispatch(ChangeFolderEventType, value);
        close();
      })
      .finally(reset);
  });

  const title = useMemo(() => {
    switch (type) {
      case CHANGE_TYPE.MOVE:
        return t('page.repository.folderTree.moveFolder');
      case CHANGE_TYPE.COPY:
        return t('page.repository.folderTree.copyFolder');
    }
  }, [t, type]);

  useImperativeHandle(ref, () => ({
    async open(type, node) {
      eventBusRef.current.disposer();
      setVisible(true);
      setType(type);
      setNode(node);

      form.setFieldsValue({
        ...node,
        parentKey: node.parentKey === 'root' ? null : node.parentKey,
      });

      return new Promise(resolve => {
        eventBusRef.current.disposer = eventBusRef.current.register(
          ChangeFolderEventType,
          value => {
            const messageData = JSON.stringify(value);
            if (PreviousMessageData === messageData) return;
            PreviousMessageData = messageData;
            resolve(value);
            // 下一轮事件循环取消锁
            if (timer) clearTimeout(timer);
            timer = setTimeout(reset);
          },
        );
      });
    },
  }));

  return (
    <Modal
      {...otherProps}
      title={title}
      open={visible}
      destroyOnClose
      onOk={onOk}
      onCancel={() => {
        reset();
        close();
      }}
    >
      <Form form={form} preserve={false} labelCol={{ span: 4 }}>
        <Form.Item name="name" label={t('page.repository.folderTree.repositoryName')} required>
          <Input />
        </Form.Item>
        <Form.Item name="parentKey" label={t('components.business.repositorySelector.choiceGroup')}>
          <RepositorySelectorField
            actionRef={actionRef}
            hiddenKey={node?.key}
            workspaceKey={context?.env?.WORKSPACE_KEY}
            onChange={v => form.setFieldValue('parentKey', v[0])}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default forwardRef(ChangeFolder);
