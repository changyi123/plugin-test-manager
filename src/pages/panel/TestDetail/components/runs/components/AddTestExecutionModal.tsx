import React from 'react';
import { Modal, Form, Input, Spin, Button, Space, Select, notification } from '@osui/ui';
import { useRequest } from 'ahooks';
import { GetWorkspaceList, CreateTestExecutionWithTestRun } from '@/lib/api/runs';
import useMergedState from 'rc-util/lib/hooks/useMergedState';
import { useTestConfig } from '@/lib/hooks/useContext';
import { getItemTypeByKey } from '@/lib/api/proxima';

type AddTestExecutionModalProps = {
  trigger?: JSX.Element;
  visible?: boolean;
  itemId: string;
};

const Content: React.FC<{ id: string; close: () => void }> = ({ close, id }) => {
  const { error, data, loading } = useRequest(GetWorkspaceList);
  const { run, loading: runLoading, data: runData } = CreateTestExecutionWithTestRun();
  const { config } = useTestConfig();
  if (error) {
    return <div>加载失败,原因{error?.message}</div>;
  }
  if (loading) {
    return <Spin tip="加载中..."></Spin>;
  }
  if (!data?.data?.length) {
    return <div>暂无可选择空间</div>;
  }

  const onFinish = async (values: any) => {
    console.log('Success:', values);
    const { workspace, summary } = values;
    const itemTypeKey = config?.itemTypeMap?.TestExecution;
    if (!config?.itemTypeMap?.TestExecution) {
      return notification.open({
        message: '提示',
        description: '暂无事项类型与测试执行类型关联',
      });
    }
    const itemType = await getItemTypeByKey(itemTypeKey);

    if (!itemType?.objectId) {
      notification.open({
        message: '提示',
        description: '所属空间无法创建测试执行，请选择其他空间事项创建',
      });
      return;
    }
    run({
      workspaceId: workspace,
      workspaceKey: 'TEST_MANAGE_1',
      itemId: id,
      itemTypeId: itemType?.objectId,
      name: summary,
    });
  };

  return (
    <Form
      name="basic"
      layout="vertical"
      initialValues={{ workspace: 'nodeheFysV', summary: '为xxx创建的测试执行' }}
      onFinish={onFinish}
      autoComplete="off"
    >
      <Form.Item label="选择空间" name="workspace">
        <Select>
          {data.data.map(item => {
            return (
              <Select.Option key={item.objectId} value={item.objectId}>
                {item.name}
              </Select.Option>
            );
          })}
        </Select>
      </Form.Item>

      <Form.Item label="摘要" name="summary" rules={[{ required: true, message: '请输入摘要！' }]}>
        <Input placeholder="请输入摘要" />
      </Form.Item>

      <Form.Item>
        <div style={{ textAlign: 'right' }}>
          <Space>
            <Button onClick={() => close()}>取消</Button>
            <Button type="primary" htmlType="submit" loading={runLoading}>
              添加
            </Button>
          </Space>
        </div>
      </Form.Item>
    </Form>
  );
};

const AddTestExecutionModal: React.FC<AddTestExecutionModalProps> = props => {
  const [isVisible, setIsVisible] = useMergedState<boolean>(!!props.visible, {
    value: props.visible,
  });
  const handleCloseModal = () => {
    setIsVisible(false);
  };

  return (
    <>
      <Modal
        title="创建测试执行"
        visible={isVisible}
        maskClosable={false}
        destroyOnClose
        onCancel={handleCloseModal}
        footer={false}
      >
        {isVisible && <Content close={handleCloseModal} id={props.itemId} />}
      </Modal>
      {props.trigger &&
        React.cloneElement(props.trigger, {
          ...props.trigger.props,
          onClick: (e: any) => {
            setIsVisible(!isVisible);
            props.trigger?.props?.onClick?.(e);
          },
        })}
    </>
  );
};

export default AddTestExecutionModal;
