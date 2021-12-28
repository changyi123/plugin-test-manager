import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { Modal, Spin, message } from '@osui/ui';
import type { ModalProps } from '@osui/modal';
import { useRequest } from 'ahooks';
import ItemTypeSelect from './ItemTypeSelect';
import {
  GetTestConfigFromWorkspaceKey,
  GetItemTypeFromKey,
  GetItemFromItemType,
} from '@/lib/api/detail';
import { checkHasDepsLink } from '@/lib/api/runs';
import useMergedState from 'rc-util/lib/hooks/useMergedState';
import { IActionCard } from '..';
import { TestType } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import { getRootContainer } from '@/lib/utils/helper';
import cx from '@/components/panel/TestEntitySelectorModal/index.less';

type ItemTypelModelProps = {
  trigger?: JSX.Element;
  itemId: string;
  visible?: boolean;
  title?: string;
  onCancel?: ModalProps['onCancel'];
  saveCard?: IActionCard['saveCard'];
  type: TestType;
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
  const { workspace } = useTestConfig();
  const testConfigRequest = useRequest(() => GetTestConfigFromWorkspaceKey(workspace.key));
  const debounceSelectContainerRef = React.useRef();

  const { data, error, loading } = useRequest(
    () => GetItemTypeFromKey(testConfigRequest?.data?.data?.itemTypeMap?.[props.type]),
    {
      ready: !!testConfigRequest.data,
    },
  );

  if (!testConfigRequest?.data?.data?.itemTypeMap?.[props.type]) {
    return <div>暂无找到{props.type}关联关系</div>;
  }

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
    <div ref={debounceSelectContainerRef}>
      <ItemTypeSelect
        placeholder="搜索事项ID、标题"
        fetchOptions={GetItemFromItemType}
        itemTypeName={data?.data?.name}
        getPopupContainer={() => debounceSelectContainerRef.current}
        onChange={value => {
          currentTestId = value;
        }}
        style={{ width: '100%' }}
      />
    </div>
  );
};

const ItemTypeModal: React.ForwardRefRenderFunction<ItemTypeModalHandle, ItemTypelModelProps> = (
  props,
  forwardedRef,
) => {
  const [isVisible, setIsVisible] = useMergedState<boolean>(!!props.visible, {
    value: props.visible,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
    setIsLoading(true);
    checkHasDepsLink(props.itemId, currentTestId)
      .then(() => {
        props.saveCard(
          undefined,
          {
            callTestId: currentTestId,
          },
          currentIndex,
        );
        handleCloseModal(e);
      })
      .catch(e => {
        message.warning(e.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useImperativeHandle(forwardedRef, () => {
    return {
      open: handleOpenModal,
    };
  });

  return (
    <>
      <Modal
        getContainer={getRootContainer}
        title={props.title || '请选择继承测试用例'}
        visible={isVisible}
        maskClosable={false}
        onCancel={handleCloseModal}
        onOk={handleOkModal}
        destroyOnClose
        className={cx('modal')}
        okButtonProps={{
          loading: isLoading,
        }}
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
