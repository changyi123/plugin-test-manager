import React from 'react';
import classnames from 'classnames';
import { DownOutlined } from '@/icons';
import { getWorkspaceByName } from '@/lib/api/proxima';
import { getRootContainer } from '@/lib/utils/helper';
import { Modal, Select, Dropdown, Menu, Button, message } from '@osui/ui';
import { useRequest, useSafeState } from 'ahooks';
import { useSelectedWorkspace } from '../hooks';

import cx from './index.less';

type WorkspaceSelectorProps = {
  className?: string;
};

const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = props => {
  const selectContainerRef = React.useRef(null);
  const [selectedWorkspace, setSelectedWorkspace] = useSelectedWorkspace();
  const isSelectedWorkspace = !!selectedWorkspace?.key;
  const [visible, setVisible] = useSafeState(!isSelectedWorkspace);
  const [workspaces, setWorkspaces] = useSafeState([]);
  const [selectValue, setSelectValue] = useSafeState(selectedWorkspace.key);

  const { run } = useRequest(
    async name => {
      return getWorkspaceByName(name ?? '');
    },
    {
      debounceWait: 500,
      onSuccess(workspaces) {
        const workspacesData = workspaces?.map(parseObj => parseObj.toJSON()) ?? [];
        setWorkspaces(workspacesData);
      },
    },
  );

  const handleChange = React.useCallback(
    value => {
      setSelectValue(value);
    },
    [setSelectValue],
  );

  return (
    <>
      <Dropdown
        className={classnames(cx('dropdown'), props.className)}
        overlay={
          <Menu
            onClick={({ key }) => {
              if (key === '1') {
                setVisible(true);
              }
            }}
          >
            <Menu.Item key="1">切换所选空间</Menu.Item>
          </Menu>
        }
      >
        <Button>
          空间：{selectedWorkspace.name ?? '-'}
          <DownOutlined />
        </Button>
      </Dropdown>
      <Modal
        visible={visible}
        title="请选择测试管理配置空间"
        onOk={() => {
          if (!selectValue) return message.warn('请先选择空间');
          const workspace = workspaces.find(item => item.key === selectValue);
          setSelectedWorkspace(workspace);
          setVisible(false);
        }}
        onCancel={() => {
          if (!isSelectedWorkspace) {
            return message.warn('请先选择需要配置空间');
          }
          setVisible(false);
        }}
        getContainer={getRootContainer}
      >
        <div ref={selectContainerRef}>
          <Select
            showSearch
            onSearch={run}
            value={selectValue}
            placeholder="请选择空间"
            onChange={handleChange}
            className={cx('select')}
            getPopupContainer={() => selectContainerRef.current}
          >
            {workspaces.map(opt => (
              <Select.Option value={opt.key} key={opt.key}>
                {opt.name}
                <span style={{ color: '#ccc', fontSize: 12 }}>（{opt.key}）</span>
              </Select.Option>
            ))}
          </Select>
        </div>
      </Modal>
    </>
  );
};

export default WorkspaceSelector;
