import React, { useState, useEffect } from 'react';
import { Modal } from '@osui/ui';
// import DebounceSelect from '@/components/common/DebounceSelect';
import { fetchTestConfig } from '@/lib/api/detail';

type ItemTypelModelProps = {
  trigger?: JSX.Element;
  visible?: boolean;
};

const ItemTypeModalContent: React.FC = () => {
  return (
    // <DebounceSelect
    //   placeholder="搜索事项ID、标题"
    //   fetchOptions={fetchCardList}
    //   onChange={value => {
    //     console.log('value', value);
    //     setValue(value);
    //   }}
    //   style={{ width: '100%' }}
    // />
    <div>ahahhaha</div>
  );
};

const ItemTypeModal: React.FC<ItemTypelModelProps> = (props: ItemTypelModelProps) => {
  const [isVisible, setIsVisible] = useState<boolean>(props.visible);
  useEffect(() => {
    fetchTestConfig('GBYsF1CYcI').then(() => {
      // console.log('data', data);
    });
  }, []);

  return (
    <>
      <Modal
        title="请选择继承测试用例"
        visible={isVisible}
        maskClosable={false}
        onCancel={() => setIsVisible(!isVisible)}
        destroyOnClose
      >
        <ItemTypeModalContent />
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

export default ItemTypeModal;
