import { isEmpty } from 'lodash';
import { useRequest } from 'ahooks';
import React, { useCallback } from 'react';
import { TestType } from '@/lib/constants';
import EventBus from '@/lib/utils/eventBus';
import { hasArrayItem } from '@/lib/utils/helper';
import { getFolderTree } from '@/lib/api/repository';
import { traverseTreeNodes } from '@/pages/repository/util';
import { Modal, Select, Tree, Empty, Spin } from 'antd';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { useIsolateTestType, useAllTestWorkspace } from '@/lib/hooks/useTest';

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
  const [treeSelectedNode, setTreeSelectedNode] = React.useState<any>();
  const [visible, setVisible] = React.useState(false);
  const [workspaceKey, setWorkspaceKey] = React.useState('');
  const [selectedWorkspaceKey, setSelectedWorkspaceKey] = React.useState('');

  // 空间隔离
  const isWorkspaceIsolate = useIsolateTestType(workspaceKey, TestType.Case);

  // 在提交之后置空用户所选的模块
  const resetTreeSelect = () => setTreeSelectedNode(null);

  const allTestWorkspaces = useAllTestWorkspace();

  const options = React.useMemo(() => {
    return (
      allTestWorkspaces
        ?.filter(workspace => selectedWorkspaceKey === workspace.key)
        ?.map(workspace => ({
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
  }, [allTestWorkspaces, selectedWorkspaceKey]);

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
        eventBusRef.current.disposer();
        return new Promise(resolve => {
          eventBusRef.current.disposer = eventBusRef.current.register(SubmitEventKey, node => {
            resetTreeSelect();
            resolve({
              repositoryKey: node.key,
              workspaceKey: node.workspaceKey,
              testDetailIds: node.caseIds,
            });
          });
        });
      },
    }),
    [],
  );

  const handleTreeSelect = (_, { node }) => {
    setTreeSelectedNode(node);
  };

  const onCancel = () => {
    setVisible(false);
    resetTreeSelect();
  };

  const handleSubmit = useCallback(() => {
    !isEmpty(treeSelectedNode) && eventBusRef.current.dispatch(SubmitEventKey, treeSelectedNode);
    setVisible(false);
  }, [treeSelectedNode]);

  return (
    <Modal
      onCancel={onCancel}
      onOk={handleSubmit}
      closable={false}
      title={title}
      visible={visible}
      okButtonProps={{ disabled: isEmpty(treeSelectedNode) }}
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
