import React from 'react';
import TestRun from './TestRun';
import { Modal, Button } from '@osui/ui';
import type { ModalProps } from 'antd/lib/modal';
import { getRootContainer } from '@/lib/utils/helper';
import useMergedState from 'rc-util/lib/hooks/useMergedState';

interface ITestRunModalProps {
  testId: string;
  visible?: boolean;
  trigger?: JSX.Element;
  /** 测试用例执行顺序 */
  testIdSequence?: string[];
  onCancel?: ModalProps['onCancel'];
}

const TestRunModal: React.FC<ITestRunModalProps> = props => {
  const [isVisible, setIsVisible] = useMergedState(false, {
    value: props.visible,
  });

  const handleCloseModal = React.useCallback(
    e => {
      setIsVisible(false);
      props.onCancel?.(e);
    },
    [props, setIsVisible],
  );

  const ModalFooterActionButtonsNode = React.useMemo(() => {
    return (
      <>
        <Button onClick={handleCloseModal}>关闭</Button>
      </>
    );
  }, [handleCloseModal]);

  return (
    <>
      <Modal
        width={1000}
        title="测试执行"
        destroyOnClose
        visible={isVisible}
        maskClosable={false}
        onCancel={handleCloseModal}
        getContainer={getRootContainer}
        footer={ModalFooterActionButtonsNode}
        bodyStyle={{ maxWidth: '1000px', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}
      >
        {isVisible && <TestRun id={props.testId} idSequence={props.testIdSequence} />}
      </Modal>
      {props.trigger &&
        React.cloneElement(props.trigger, {
          ...props.trigger.props,
          onClick: e => {
            setIsVisible(!isVisible);
            props.trigger?.props?.onClick?.(e);
          },
        })}
    </>
  );
};

export default TestRunModal;
