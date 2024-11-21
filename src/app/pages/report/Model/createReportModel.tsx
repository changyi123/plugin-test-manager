import { useReactive } from 'ahooks';
import { Button, message, Modal } from 'antd';
import classnames from 'classnames';
import { isEmpty } from 'lodash';
import clone from 'lodash/clone';
import React, { useCallback, useMemo, useState } from 'react';

import useI18n from '@/lib/hooks/useI18n';
import { Workspace } from '@/lib/types/App';
import EventBus from '@/lib/utils/eventBus';

import CreateReportSteps from '../Steps';
import RangeForm from '../Steps/RangeForm';
import TemplateForm from '../Steps/TemplateForm';

const MaxInputNameLength = 250;

export type ActionType = {
  open: (data: { name?: string; selectors?: any }) => Promise<void>;
};

type CreateReportModelProps = {
  actionRef?: React.ForwardedRef<ActionType>;
  className?: string;
  modelProps?: Record<string, unknown>;
  workspace?: Workspace;
};

const CreateReportEventType = 'create_test_report';

const CreateReportModel: React.FC<CreateReportModelProps> = props => {
  const { actionRef, className, workspace } = props;
  const eventBusRef = React.useRef(new EventBus());
  const { t } = useI18n();

  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState('1');

  const state = useReactive({
    name: '',
    reportStatus: '',
    template: {},
    selectors: {},
    reportOverviewData: {},
  });

  React.useImperativeHandle(
    actionRef,
    () => ({
      async open(_params) {
        setVisible(true);
        eventBusRef.current.disposer();
        return new Promise(resolve => {
          eventBusRef.current.disposer = eventBusRef.current.register(
            CreateReportEventType,
            data => {
              if (!data) return;
              resolve(data);
            },
          );
        });
      },
    }),
    [],
  );

  const handleCloseModal = React.useCallback(
    data => {
      setTimeout(() => {
        state.name = '';
        state.reportStatus = '';
        state.template = {} as any;
        state.selectors = {};
        setCurrent('1');
        setVisible(false);
      }, 300);
      eventBusRef.current.dispatch(CreateReportEventType, data);
    },
    [setVisible, state],
  );

  const validateState = useCallback(() => {
    if (!state.name) {
      return true;
    }
    if (!state.reportStatus) {
      return true;
    }
    if (!(state.template as any)?.objectId) {
      return true;
    }

    return false;
  }, [state]);

  const validateSelector = useCallback(() => {
    if (isEmpty(state.selectors)) return false;
    const values = Object.values(state.selectors);
    return values.map(s => (s as any).value?.length).filter(Boolean)?.length !== values?.length;
  }, [state?.selectors]);

  const ModalFooterNode = useMemo(() => {
    return (
      <>
        <Button onClick={handleCloseModal}>{t('common.cancel')}</Button>
        {current === '2' ? (
          <>
            <Button
              onClick={() => {
                setCurrent('1');
              }}
            >
              {t('common.prevStep')}
            </Button>
            <Button
              type="primary"
              onClick={() => {
                const isNull = validateSelector();
                if (isNull) return message.error(t('report.validateTips'));
                handleCloseModal(clone(state));
              }}
            >
              {t('common.confirm')}
            </Button>
          </>
        ) : (
          <Button
            onClick={() => {
              if (state.name?.length > MaxInputNameLength)
                return message.error(t('report.exceedLength'));
              const validate = validateState();
              if (validate) return message.error(t('report.validateTips'));
              setCurrent('2');
            }}
          >
            {t('common.nextStep')}
          </Button>
        )}
      </>
    );
  }, [handleCloseModal, t, current, state, validateState, validateSelector]);

  const steps = useMemo(() => {
    const Components = current === '2' ? RangeForm : TemplateForm;
    return <Components state={state} workspace={workspace} />;
  }, [current, state, workspace]);

  return (
    <Modal
      className={classnames(className)}
      open={visible}
      destroyOnClose
      title={t('report.addTestReport')}
      width={600}
      maskClosable={false}
      onCancel={handleCloseModal}
      footer={ModalFooterNode}
    >
      <CreateReportSteps current={current} />
      {steps}
    </Modal>
  );
};

export default React.memo(CreateReportModel);
