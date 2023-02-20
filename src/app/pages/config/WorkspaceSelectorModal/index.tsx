import React from 'react';
import { useReactive } from 'ahooks';
import { Modal, Select } from 'antd';
import EventBus from '@/lib/utils/eventBus';
import { getRootContainer } from '@/lib/utils/helper';
import { useAllTestWorkspace } from '@/lib/hooks/useTest';
import useI18n from '@/lib/hooks/useI18n';

const CLICK_OK_EVENT_TYPE = 'CLICK_OK_EVENT_TYPE';

type WorkspaceSelectorModalProps = {
  actionRef: React.ForwardedRef<{
    open: (selectedWorkspace?: any) => Promise<any>;
  }>;
};

const WorkspaceSelectorModal: React.FC<WorkspaceSelectorModalProps> = ({ actionRef }) => {
  const state = useReactive({
    visible: false,
    selectValue: null,
  });
  const { t } = useI18n();

  const eventBusRef = React.useRef(new EventBus());

  const workspaces = useAllTestWorkspace();

  const workspaceOptions = React.useMemo(() => {
    if (!workspaces) return [];
    return workspaces.map(workspace => ({
      label: (
        <span>
          {workspace.name}
          <span style={{ color: '#ccc', fontSize: 12 }}>（{workspace.key}）</span>
        </span>
      ),
      data: workspace.name + workspace.key,
      value: workspace.key,
    }));
  }, [workspaces]);

  React.useImperativeHandle(
    actionRef,
    () => ({
      open(selectedWorkspace) {
        if (selectedWorkspace) {
          state.selectValue = selectedWorkspace?.key;
        }
        state.visible = true;
        return new Promise(resolve => {
          eventBusRef.current.register(CLICK_OK_EVENT_TYPE, () => {
            const selectedWorkspace = workspaces.find(
              workspace => workspace.key === state.selectValue,
            );
            if (selectedWorkspace) {
              resolve(selectedWorkspace);
            }
          });
        });
      },
    }),
    [state, workspaces],
  );

  const selectContainerRef = React.useRef();
  return (
    <Modal
      open={state.visible}
      title={t('page.config.workspaceSelectorModal.modelTitle')}
      okButtonProps={{
        disabled: !state.selectValue,
      }}
      onOk={() => {
        state.visible = false;
        eventBusRef.current.dispatch(CLICK_OK_EVENT_TYPE);
      }}
      onCancel={() => {
        state.visible = false;
      }}
      getContainer={getRootContainer}
    >
      <div ref={selectContainerRef}>
        <Select
          showSearch
          optionFilterProp="data"
          placeholder={t('page.config.workspaceSelectorModal.placeholder')}
          style={{ width: '100%' }}
          value={state.selectValue}
          options={workspaceOptions}
          onChange={value => (state.selectValue = value)}
          getPopupContainer={() => selectContainerRef.current}
        />
      </div>
    </Modal>
  );
};

export default WorkspaceSelectorModal;
