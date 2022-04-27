import React from 'react';
import TestRun from './TestRun';
import { Modal, Button } from '@osui/ui';
import type { ModalProps } from 'antd/lib/modal';
import { getRootContainer } from '@/lib/utils/helper';

interface ITestRunModalProps {
  testId: string;
  visible?: boolean;
  trigger?: JSX.Element;
  /** 测试用例执行顺序 */
  testIdSequence?: string[];
  onCancel?: ModalProps['onCancel'];
}

const TestRunModal: React.FC<ITestRunModalProps> = props => {
  const [isVisible, setIsVisible] = React.useState(props.visible);

  React.useEffect(() => {
    if (typeof props.visible === 'boolean') {
      setIsVisible(props.visible);
    }
  }, [props.visible]);

  const handleCloseModal = React.useCallback(
    e => {
      console.info('close modal---', e);
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

  console.info('isVisible----->', isVisible);

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
        bodyStyle={{
          maxWidth: '1000px',
          maxHeight: 'calc(100vh - 220px)',
          overflowY: 'auto',
          padding: '0 24px',
        }}
      >
        {isVisible && <TestRun id={props.testId} idSequence={props.testIdSequence} />}
      </Modal>
      {props.trigger &&
        React.cloneElement(props.trigger, {
          ...props.trigger.props,
          onClick: e => {
            console.info('trigger------>', e);
            setIsVisible(true);
            props.trigger?.props?.onClick?.(e);
          },
        })}
    </>
  );
};

export default TestRunModal;
