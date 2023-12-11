import { Button, Modal } from 'antd';
import classnames from 'classnames';
import React from 'react';

import useI18n from '@/lib/hooks/useI18n';
import EventBus from '@/lib/utils/eventBus';
import { getRootContainer } from '@/lib/utils/helper';

import { SaveTriggerProvider, useSaveTriggerEvent } from './SaveTriggerEvent';
import TestRun from './TestRun';

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
  const { t } = useI18n();
  const [isVisible, setIsVisible] = React.useState(false);
  const [testRunDepData, setTestRunDepData] = React.useState(
    {} as Parameters<ActionType['open']>[0],
  );

  const event = useSaveTriggerEvent();
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
    event.emit();
    setTimeout(() => {
      setIsVisible(false);
    }, 500);
    eventBusRef.current.dispatch(CancelEventType);
  }, [event]);

  const ModalFooterActionButtonsNode = React.useMemo(() => {
    return (
      <>
        <Button onClick={handleCloseModal}>{t('common.close')}</Button>
      </>
    );
  }, [handleCloseModal, t]);

  return (
    <>
      <Modal
        width={1000}
        title={t('common.testRun')}
        destroyOnClose
        open={isVisible}
        maskClosable={false}
        onCancel={handleCloseModal}
        getContainer={getRootContainer}
        className={classnames(className)}
        footer={ModalFooterActionButtonsNode}
        bodyStyle={{
          maxWidth: '1000px',
          maxHeight: 'calc(100vh - 220px)',
          overflowY: 'auto',
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

const TestRunModalContainer = props => {
  return (
    <SaveTriggerProvider>
      <TestRunModal {...props} />
    </SaveTriggerProvider>
  );
};

export default TestRunModalContainer;
