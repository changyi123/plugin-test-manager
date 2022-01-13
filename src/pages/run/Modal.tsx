import React from 'react';
import type { ModalProps } from '@osui/modal';
import { Modal, Button } from '@osui/ui';
import useMergedState from 'rc-util/lib/hooks/useMergedState';
import TestRun from './index';
import { getRootContainer } from '@/lib/utils/helper';
import css from './index.less';

interface ITestRunModalProps {
  trigger?: JSX.Element;
  visible?: boolean;
  testId: string;
  onCancel?: ModalProps['onCancel'];
}

const TestRunModal: React.FC<ITestRunModalProps> = props => {
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
        title={'测试执行'}
        visible={isVisible}
        maskClosable={false}
        width="1400px"
        footer={
          <Button key="2" onClick={handleCloseModal}>
            关闭
          </Button>
        }
        onCancel={handleCloseModal}
        destroyOnClose
      >
        {isVisible && (
          <div className={css('modal-content')} id="modal-content">
            <TestRun testId={props.testId} />
          </div>
        )}
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

export default TestRunModal;
