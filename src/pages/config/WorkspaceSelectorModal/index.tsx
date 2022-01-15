import React from 'react';
import { Modal, Select } from '@osui/ui';
import EventBus from '@/lib/utils/eventBus';
import { useReactive, useRequest } from 'ahooks';
import { getRootContainer } from '@/lib/utils/helper';

import { getWorkspaceByName } from '@/lib/api/proxima';

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
    workspaces: [],
  });

  const eventBusRef = React.useRef(new EventBus());

  const { run } = useRequest(
    async name => {
      return getWorkspaceByName(name ?? '');
    },
    {
      debounceWait: 500,
      onSuccess(workspaces) {
        const workspacesData = workspaces?.map(parseObj => parseObj.toJSON()) ?? [];
        state.workspaces = workspacesData;
      },
    },
  );

  React.useImperativeHandle(actionRef, () => ({
    open(selectedWorkspace) {
      if (selectedWorkspace) {
        state.selectValue = selectedWorkspace?.key;
      }
      state.visible = true;
      return new Promise(resolve => {
        eventBusRef.current.register(CLICK_OK_EVENT_TYPE, () => {
          const selectedWorkspace = state.workspaces.find(
            workspace => workspace.key === state.selectValue,
          );
          if (selectedWorkspace) {
            resolve(selectedWorkspace);
          }
        });
      });
    },
  }));

  const selectContainerRef = React.useRef();
  return (
    <Modal
      visible={state.visible}
      title="请选择测试管理配置空间"
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
          onSearch={run}
          filterOption={false}
          placeholder="请选择空间"
          style={{ width: '100%' }}
          value={state.selectValue}
          onChange={value => (state.selectValue = value)}
          getPopupContainer={() => selectContainerRef.current}
        >
          {state.workspaces.map(opt => (
            <Select.Option value={opt.key} key={opt.key}>
              {opt.name}
              <span style={{ color: '#ccc', fontSize: 12 }}>（{opt.key}）</span>
            </Select.Option>
          ))}
        </Select>
      </div>
    </Modal>
  );
};

export default WorkspaceSelectorModal;
