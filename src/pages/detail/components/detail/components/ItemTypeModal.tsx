import React, { useImperativeHandle, forwardRef } from 'react';
import { Modal, Spin } from '@osui/ui';
import type { ModalProps } from '@osui/modal';
import { useRequest } from 'ahooks';
import ItemTypeSelect from './ItemTypeSelect';
import {
  GetTestConfigFromWorkspaceId,
  GetItemTypeFromId,
  GetItemFromItemType,
} from '@/lib/api/detail';
import useMergedState from 'rc-util/lib/hooks/useMergedState';
import { IActionCard } from '../';

type ItemTypelModelProps = {
  trigger?: JSX.Element;
  visible?: boolean;
  onCancel?: ModalProps['onCancel'];
  saveCard?: IActionCard['saveCard'];
  type: 'Test' | 'TestPrecondition' | 'TestSet' | 'TestPlan' | 'TestExecution';
};

export type ItemTypeModalHandle = {
  open: (index: number) => void;
};

export interface ItemTypeModalContentProps {
  type: ItemTypelModelProps['type'];
  saveCard?: IActionCard['saveCard'];
}

let currentIndex = 0;
let currentTestId = '';

const ItemTypeModalContent: React.FC<ItemTypeModalContentProps> = props => {
  const testConfigRequest = useRequest(() => GetTestConfigFromWorkspaceId('nodeheFysV'), {
    throwOnError: true,
  });

  const { data, error, loading } = useRequest(
    () => GetItemTypeFromId(testConfigRequest?.data?.data?.itemTypeMap?.[props.type]),
    {
      ready: !!testConfigRequest.data,
    },
  );

  if (testConfigRequest.error) {
    return <div>加载失败,原因:{testConfigRequest?.error?.message}</div>;
  }

  if (error) {
    return <div>加载失败,原因{error?.message}</div>;
  }

  if (loading) {
    return <Spin tip="加载中..."></Spin>;
  }

  return (
    <ItemTypeSelect
      placeholder="搜索事项ID、标题"
      fetchOptions={GetItemFromItemType}
      itemTypeName={data?.data?.name}
      onChange={value => {
        currentTestId = value;
      }}
      style={{ width: '100%' }}
    />
  );
};

const ItemTypeModal: React.ForwardRefRenderFunction<ItemTypeModalHandle, ItemTypelModelProps> = (
  props,
  forwardedRef,
) => {
  const [isVisible, setIsVisible] = useMergedState<boolean>(!!props.visible, {
    value: props.visible,
  });
  const { type } = props;

  const handleCloseModal = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    currentIndex = 0;
    currentTestId = '';
    setIsVisible(false);
    props.onCancel?.(e);
  };

  const handleOpenModal = (index: number) => {
    currentIndex = index;
    setIsVisible(true);
  };

  const handleOkModal = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    props.saveCard(
      undefined,
      {
        callTestId: currentTestId,
      },
      currentIndex,
    );
    handleCloseModal(e);
  };

  useImperativeHandle(forwardedRef, () => {
    return {
      open: handleOpenModal,
    };
  });

  console.log('没更新吗', props.visible);

  return (
    <>
      <Modal
        title="请选择继承测试用例"
        visible={isVisible}
        maskClosable={false}
        onCancel={handleCloseModal}
        onOk={handleOkModal}
        destroyOnClose
      >
        {isVisible && <ItemTypeModalContent type={type} saveCard={props.saveCard} />}
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

export default forwardRef(ItemTypeModal);
