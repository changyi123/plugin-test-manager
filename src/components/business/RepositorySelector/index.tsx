import React from 'react';
import { useRequest } from 'ahooks';
import { TestType } from '@/lib/constants';
import { hasArrayItem } from '@/lib/utils/helper';
import { getFolderTree } from '@/lib/api/repository';
import { getAllTestWorkspaces } from '@/lib/api/proxima';
import { useIsolateTestType } from '@/lib/hooks/useTest';
import { traverseTreeNodes } from '@/pages/repository/hook';
import { Modal, Select, Tree, Empty, Spin } from '@osui/ui';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import EventBus from '@/lib/utils/eventBus';

import cx from './index.less';

const SubmitEventKey = 'SubmitEvent';

export type ActionType = {
  open: (params: { workspaceKey: string }) => Promise<{
    workspaceKey: string;
    repositoryKey: string;
    testDetailIds: string[];
  }>;
};

type RepositorySelectorProps = {
  title?: string;
  actionRef?: React.ForwardedRef<ActionType>;
};

const RepositorySelector: React.FC<RepositorySelectorProps> = props => {
  const { actionRef, title = '复制用例' } = props;

  const eventBusRef = React.useRef(new EventBus());
  const treeSelectedNodeRef = React.useRef<any>();
  const [visible, setVisible] = React.useState(false);
  const [workspaceKey, setWorkspaceKey] = React.useState('');
  const [selectedWorkspaceKey, setSelectedWorkspaceKey] = React.useState('');

  // 空间隔离
  const isWorkspaceIsolate = useIsolateTestType(workspaceKey, TestType.TestDetail);

  const { data: allTestWorkspaces } = useRequest(
    async () => {
      return getAllTestWorkspaces();
    },
    {
      cacheKey: 'AllTestWorkspaces',
      cacheTime: 99999999,
      staleTime: 99999999,
      // ready: Boolean(workspaceKey && isWorkspaceIsolate),
    },
  );

  const options = React.useMemo(() => {
    return (
      allTestWorkspaces?.map(workspace => ({
        label: (
          <p>
            <span>{workspace.name}</span>
            <span style={{ color: '#aaa', fontSize: 12 }}>({workspace.key})</span>
          </p>
        ),
        title: workspace.name + workspace.key,
        value: workspace.key,
      })) ?? []
    );
  }, [allTestWorkspaces]);

  const { loading, data: treeData } = useRequest(
    async () => {
      if (!visible) return [];
      const treeData = await getFolderTree(selectedWorkspaceKey);
      traverseTreeNodes(treeData, node => {
        node.title = <OverflowTooltip title={node.name}>{node.name}</OverflowTooltip>;
      });
      return treeData;
    },
    {
      refreshDeps: [visible, selectedWorkspaceKey],
      ready: Boolean(selectedWorkspaceKey),
    },
  );

  React.useImperativeHandle(
    actionRef,
    () => ({
      async open({ workspaceKey }) {
        setVisible(true);
        setWorkspaceKey(workspaceKey);
        setSelectedWorkspaceKey(workspaceKey);
        return new Promise(resolve => {
          const disposer = eventBusRef.current.register(SubmitEventKey, node => {
            disposer.unregister();
            resolve({
              repositoryKey: node.key,
              workspaceKey: node.workspaceKey,
              testDetailIds: node.testDetailIds,
            });
          });
        });
      },
    }),
    [],
  );

  const handleTreeSelect = (_, { node }) => {
    treeSelectedNodeRef.current = node;
  };

  const handleSubmit = () => {
    treeSelectedNodeRef.current &&
      eventBusRef.current.dispatch(SubmitEventKey, treeSelectedNodeRef.current);
    setVisible(false);
  };

  return (
    <Modal
      onCancel={() => setVisible(false)}
      onOk={handleSubmit}
      closable={false}
      title={title}
      visible={visible}
      className={cx('modal')}
    >
      <div className={cx('repository-selector')}>
        <p>选择测试用例库</p>
        <Select
          showSearch
          options={options}
          optionFilterProp="title"
          value={selectedWorkspaceKey}
          disabled={isWorkspaceIsolate}
          className={cx('workspace-selector')}
          onChange={key => setSelectedWorkspaceKey(key)}
        />
        <p>选择模块</p>
        <Spin spinning={loading}>
          <div className={cx('folder-selector')}>
            {hasArrayItem(treeData) ? (
              <Tree.DirectoryTree
                showIcon
                treeData={treeData}
                className={cx('tree')}
                onSelect={handleTreeSelect}
              />
            ) : (
              <Empty style={{ marginTop: 20 }} description="当前用例库未创建用例模块" />
            )}
          </div>
        </Spin>
      </div>
    </Modal>
  );
};

export default React.memo(RepositorySelector);
