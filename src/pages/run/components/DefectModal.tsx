import React from 'react';
import type { ModalProps } from '@osui/modal';
import { Modal, Button } from '@osui/ui';
import useMergedState from 'rc-util/lib/hooks/useMergedState';
import { getRootContainer } from '@/lib/utils/helper';

interface IDefectModalProps {
  trigger?: JSX.Element;
  visible?: boolean;
  testId: string;
  onCancel?: ModalProps['onCancel'];
}

const DefectModal: React.FC<IDefectModalProps> = props => {
  const [isVisible, setIsVisible] = useMergedState<boolean>(!!props.visible, {
    value: props.visible,
  });

  const handleCloseModal = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    setIsVisible(false);
    props.onCancel?.(e);
  };

  return (
    <>
      <Modal
        getContainer={getRootContainer}
        title={'请选择添加缺陷'}
        visible={isVisible}
        maskClosable={false}
        width="400px"
        onCancel={handleCloseModal}
        destroyOnClose
      >
        {isVisible && <div>wahahahha</div>}
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

export default DefectModal;
