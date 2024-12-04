import { TreeSelect } from 'antd';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { nebulaFetch } from 'proxima-sdk/lib/Fetch';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Parse from 'proxima-sdk/lib/Parse';
import React, { FC, useCallback, useEffect, useState } from 'react';

import { FieldProp } from '../types';

const Field: FC<FieldProp> = props => {
  const { onChange, workspace, ...restProps } = props;
  const [workspaceKey, setWorkspaceKey] = useState();
  const [treeData, setTreeData] = useState([]);

  useEffect(() => {
    if (!workspace) return;
    (async () => {
      const curWorkspace = await new Parse.Query('Workspace')
        .equalTo('objectId', workspace)
        .select('key')
        .first();
      setWorkspaceKey(curWorkspace.get('key'));
    })();
  }, [workspace]);

  const search = useCallback(
    async () => {
      if (!workspaceKey) return;
      // 构建目录树
      // 创建一个哈希表，用于存储每个repo对象的子对象
      const repositories = await new Parse.Query('test_manager_Repository')
        .equalTo('workspaceKey', workspaceKey)
        .select(['name', 'objectId', 'parent', 'sortIndex'])
        .addAscending(['sortIndex', 'createdAt'])
        .limit(99999)
        .find()
        .then(data => data.map(d => d.toJSON()));
      const result = await nebulaFetch.get('v1/environment/test_manager/production');
      const groupRequired = result?.data?.data?.env?.GROUP_REQUIRED_WHEN_VALIDATE;
      const repoMap = {};
      // GROUP_REQUIRED_WHEN_VALIDATE 所属模块必填时，下拉不可选择全部用例
      const treeNode = groupRequired ? [] : [{ name: '全部用例', objectId: 'root', children: [] }];
      repositories.forEach(repo => {
        repoMap[repo.objectId] = repoMap[repo.objectId] || [];
      });

      // 遍历repositoryData，将每个repo对象添加到其父对象的children属性中
      repositories.forEach(repo => {
        if (!repo.parent?.objectId || repo.parent.objectId === 'root')
          groupRequired ? treeNode.push(repo) : treeNode[0].children.push(repo);
        if (repo.parent?.objectId && repoMap[repo.parent.objectId])
          repoMap[repo.parent.objectId].push(repo);
      });

      // 将每个repo对象的children属性设置为其在哈希表中存储的子对象数组
      repositories.forEach(repo => {
        repo.parent && delete repo.parent;
        repo.updatedAt && delete repo.updatedAt;
        repo.createdAt && delete repo.createdAt;
        repo.children = repoMap[repo.objectId] || [];
      });

      setTreeData(treeNode);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspaceKey],
  );

  useEffect(() => {
    search();
  }, [search]);

  return (
    <TreeSelect
      {...restProps}
      fieldNames={{
        label: 'name',
        value: 'objectId',
      }}
      showSearch
      filterTreeNode
      treeNodeFilterProp="name"
      allowClear
      onChange={(value, label) => onChange(value, [{ value, label: label?.[0] }])}
      treeData={treeData}
      treeDefaultExpandAll
      style={{ width: '100%' }}
    ></TreeSelect>
  );
};

export default Field;
