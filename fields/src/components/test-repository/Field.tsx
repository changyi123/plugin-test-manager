// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { TreeSelect } from 'antd';
import React, { FC, useCallback, useEffect, useState } from 'react';

import { FieldProp } from '../types';

const Parse = global.Parse;
const workspaceQuery = new Parse.Query('Workspace');
const repositoryQuery = new Parse.Query('test_manager_Repository');

const Field: FC<FieldProp> = props => {
  const { onChange, workspace, ...restProps } = props;
  const [workspaceKey, setWorkspaceKey] = useState();
  const [treeData, setTreeData] = useState([]);

  useEffect(() => {
    if (!workspace) return;
    (async () => {
      const curWorkspace = await workspaceQuery
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
      const repositories = await repositoryQuery
        .equalTo('workspaceKey', workspaceKey)
        .select(['name', 'objectId', 'parent', 'sortIndex'])
        .addAscending(['sortIndex', 'createdAt'])
        .limit(99999)
        .find()
        .then(data => data.map(d => d.toJSON()));
      const repoMap = {};
      const treeNode = [{ name: '全部用例', objectId: 'root', children: [] }];
      repositories.forEach(repo => {
        repoMap[repo.objectId] = repoMap[repo.objectId] || [];
      });

      // 遍历repositoryData，将每个repo对象添加到其父对象的children属性中
      repositories.forEach(repo => {
        if (!repo.parent?.objectId || repo.parent.objectId === 'root')
          treeNode[0].children.push(repo);
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
