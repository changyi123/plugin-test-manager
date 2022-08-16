import React from 'react';
import TestRun from './TestRun';
import classnames from 'classnames';
import { Modal, Button } from 'antd';
import EventBus from '@/lib/utils/eventBus';
import { getRootContainer } from '@/lib/utils/helper';

export type ActionType = {
  open: (data: { testId: string; testIdSequence?: string[] }) => Promise<void>;
};
interface ITestRunModalProps {
  className?: string;
  actionRef?: React.ForwardedRef<ActionType>;
  idSequence?: string[];
  selectedTestPlanId?: string;
}

const CancelEventType = 'CancelEventType';

const TestRunModal: React.FC<ITestRunModalProps> = ({
  actionRef,
  className,
  idSequence,
  selectedTestPlanId,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [testRunDepData, setTestRunDepData] = React.useState(
    {} as Parameters<ActionType['open']>[0],
  );
  const eventBusRef = React.useRef(new EventBus());

  React.useImperativeHandle(
    actionRef,
    () => ({
      async open(data) {
        setIsVisible(true);
        setTestRunDepData(data);
        return new Promise(resolve => {
          eventBusRef.current.register(CancelEventType, resolve);
        });
      },
    }),
    [],
  );

  const handleCloseModal = React.useCallback(() => {
    setIsVisible(false);
    eventBusRef.current.dispatch(CancelEventType);
  }, [setIsVisible]);

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
        className={classnames(className)}
        footer={ModalFooterActionButtonsNode}
        bodyStyle={{
          maxWidth: '1000px',
          maxHeight: 'calc(100vh - 220px)',
          overflowY: 'auto',
          padding: '0 24px',
        }}
      >
        {isVisible && (
          <TestRun
            id={testRunDepData.testId}
            idSequence={testRunDepData.testIdSequence ?? idSequence}
            selectedTestPlanId={selectedTestPlanId}
          />
        )}
      </Modal>
    </>
  );
};

export default TestRunModal;
