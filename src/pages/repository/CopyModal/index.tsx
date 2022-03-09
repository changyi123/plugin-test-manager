/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-spread */
import React, { FC, useState, useCallback } from 'react';
import { Modal, Select, Tree } from '@osui/ui';
import { getAppByAppKey, getAppInstallationByApp, getWorkspacesByScheme } from '@/lib/api/case';
import { getTestEntitiesByQuery } from '@/lib/api/common';
import { unique, traverseTreeNodes } from '@/components/common/CaseModal/utils';
import { cloneDeep } from 'lodash';
import { useTestConfig } from '@/lib/hooks/useContext';
import { getFolderTree } from '@/lib/api/repository';
import { useMount, useRequest, useReactive, useUpdateEffect } from 'ahooks';
import { TestType } from '@/lib/constants';
import cx from './index.less';
import { getRootContainer } from '@/lib/utils/helper';
import { FolderOutlined } from '@ant-design/icons';

interface ModelItem {
  isModalVisible: boolean;
  handleOk: (data: any) => void;
  handleCancel: () => void;
}
type CheckedType = { checked?: string[]; halfChecked?: string[] };
const unassignedKey = 'UN_ASSIGNED_CASE_KEY'; //未分组的key

const CaseModal: FC<ModelItem> = ({ isModalVisible, handleOk, handleCancel }) => {
  const [tableData, setTableData] = useState<any>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<CheckedType>({ checked: [], halfChecked: [] });
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState<boolean>(true);
  const [workspaceKey, setWorkspaceKey] = useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
  const [repoKey, setRepoKey] = useState<string>(''); //我们来处理repo

  const { config, workspace } = useTestConfig();
  const state = useReactive({
    fullCases: [], //这里维护一个全量状态,todo
    total: 0,
    treeData: [], //树节点数据
    workspaceKeys: [],
    selectWorkspaceKey: '', //选中得workspaceKey
    selectData: [], //select所有数据
    defaultValue: '', //select初始选中值
    isIsolate: false, //维护一个全局的状态，是否有权限控制，默认false
    checkedKeys: [], //维护一个选中效果
    unpackedKeys: [], //未分组的key，主要用于右侧对左侧的控制
    packedKeys: [], //注意这个key，对应的是最终items的key，这些值可以在getIds中拿到，限定一下上下文
    rowkeys: [], //用state还不如这个rowkeys
    //这两个给继承
    repoKey: null,
    repoList: [], //树形数据的存储
    treed: [], //新的tree结构
  });
  //初始化操作
  useMount(() => {
    initData();
  });

  //获取itemIds
  const { runAsync: fetchItems, loading: tableLoading } = useRequest(getTestEntitiesByQuery, {
    manual: true,
  });
  //请求到tree结构的数据
  const { runAsync: fetchTreeData, loading: folderTreeLoading } = useRequest(getFolderTree, {
    manual: true,
  });
  useUpdateEffect(() => {
    const current = state.fullCases.filter(item => item.repoKey == state.repoKey); //当前
    if (current[0] && current[0].repoKey == state.repoKey) {
      //todo:不该更新得时候不更新
      state.fullCases = state.fullCases.map(item => {
        //对数据进行进一步处理
        if (item.repoKey == state.repoKey) {
          item.checkedKeys = { ...checkedKeys };
          item.selectedRowKeys = [...selectedRowKeys];
          // item.tableData = JSON.parse(JSON.stringify([])); //这个有可能是上一层得tableData，在不该更新得时候更新了
        }
        return item;
      });
    }
    if (current.length == 0) {
      const obj = {
        repoKey: JSON.parse(JSON.stringify(state.repoKey)),
        checkedKeys: { ...checkedKeys },
        selectedRowKeys: [...selectedRowKeys],
        // tableData: JSON.parse(JSON.stringify(tableData)),
      };
      state.fullCases.push(obj);
    }
  }, [state.repoKey, state.rowkeys, state.checkedKeys]);

  /* useUpdateEffect(() => {
    if (isModalVisible == false) {
      initData();
    }
  }, [isModalVisible]); */

  useUpdateEffect(() => {
    //监听treeData数据，在它发生变化的时候，改变数据
    changeData(state.treeData);
  }, [state.treeData]);

  const changeData = function (tree) {
    //将ES6 proxy转化为普通js对象，洗一遍数据
    const list = JSON.stringify(tree);
    const mutableTree = JSON.parse(list);
    //add file icon
    const ntree = deepCloneTree(mutableTree);
    state.treed = ntree;
  };

  const deepCloneTree = function (data) {
    const toString = Object.prototype.toString;
    const map = {
      '[object Boolean]': 'boolean',
      '[object Number]': 'number',
      '[object String]': 'string',
      '[object Function]': 'function',
      '[object Array]': 'array',
      '[object Date]': 'date',
      '[object RegExp]': 'regExp',
      '[object Undefined]': 'undefined',
      '[object Null]': 'null',
      '[object Object]': 'object',
    };
    const type = map[toString.call(data)];

    let obj;
    //在遍历得时候改变键值
    if (data?.name) data.title = data?.name;
    //给每个key节点添加选中和未选的图片
    if (data?.key)
      data.icon = ({ selected }) =>
        selected ? <FolderOutlined style={{ color: '#0A50D1' }} /> : <FolderOutlined />;
    if (type === 'array') {
      obj = [];
    } else if (type == 'object') {
      obj = {};
    } else {
      //基本数据类型直接返回
      return data;
    }
    if (type == 'array') {
      for (let i = 0; i < data.length; i++) {
        obj.push(deepCloneTree(data[i]));
      }
    } else if (type == 'object') {
      for (const key in data) {
        obj[key] = deepCloneTree(data[key]);
      }
    }
    return obj;
  };

  const initData = useCallback(async () => {
    const r = await getAppByAppKey('test_manager');
    const apps = r;
    const list = [];
    for (let i = 0; i < apps.length; i++) {
      //app vs installation is 1 vs n
      const res = getAppInstallationByApp(apps[i].id);
      list.push(res);
    }
    //如果错误，抛出的是
    const installBox = await Promise.all(list);
    const appInstallations = [];
    //将1 vs n找到的appInstallations 打平
    for (let i = 0; i < installBox.length; i++) {
      appInstallations.push.apply(appInstallations, installBox[i]);
    }

    //从这里再取到sheme数组，能拿到sheme的id
    const shemes = [];
    for (let i = 0; i < appInstallations.length; i++) {
      const sheme = appInstallations[i]?.attributes?.workspaceScheme?.id;
      shemes.push(sheme);
    }

    //根据scheme去workspace表中筛选出来用该sheme创建的workspaces
    let workspacesBox = [];
    const wlist = [];
    for (let i = 0; i < shemes.length; i++) {
      const res = getWorkspacesByScheme(shemes[i]);
      wlist.push(res);
    }
    workspacesBox = await Promise.all(wlist);
    //将1 vs n 找到的workspaces打平
    const workspaces = [];
    for (let i = 0; i < workspacesBox.length; i++) {
      workspaces.push.apply(workspaces, workspacesBox[i]);
    }
    //拿到workspace的key
    let workspaceKeys = [];
    for (let i = 0; i < workspaces.length; i++) {
      const key = workspaces[i]?.attributes?.key;
      workspaceKeys.push(key);
    }

    //走隔离函数
    workspaceKeys = isolateFunc(workspaceKeys);
    //将workspaceKey存起来
    state.workspaceKeys = workspaceKeys;

    //优化成新的树形结构
    const repoList = [];
    for (let i = 0; i < state.workspaceKeys.length; i++) {
      //进行数据请求
      const res = await fetchTreeData(state.workspaceKeys[i]);
      //pass
      repoList.push(res);
    }
    state.repoList = repoList;

    //然后做一层筛选
    state.selectData = workspaces;
    state.defaultValue = state.selectData[0]?.attributes.key || '';

    //初始tree值
    const initTreeData = repoList.length > 0 ? repoList[0] : [];

    //初始化的时候，未分组也是对应着workspaceKey获取的数据
    //todo: repo这个我们需要重新设置
    state.repoKey = state.selectData[0]?.attributes.key;
    const t = await getIds(initTreeData, state.workspaceKeys[0]);
    state.treeData = t; //获取到tree结构
    // setSelectedKeys([unassignedKey + state.repoKey]);
    // setTableData(t[0].items ?? []);
  }, []);

  //isolate func
  //isolate func
  const isolateFunc = (workspaceKeys: string[]): string[] => {
    //从config里边拿到隔离数组
    const itypes = config.isolateTestType ?? [];

    const detail = TestType.TestDetail;
    state.isIsolate = itypes.includes(detail) ? true : false;

    //如果做了隔离，数组里边只保留一个
    let wks = [];
    if (state.isIsolate) {
      const workspaceKey = workspace?.key;
      wks = workspaceKeys.filter(item => item == workspaceKey);
    } else {
      wks = workspaceKeys;
    }
    return wks;
  };

  //对未分组部分数据的处理
  const getIds: (t: any[], key: string) => Promise<any[]> = async (
    t: any[],
    key: string,
  ): Promise<any[]> => {
    const tree = cloneDeep(t);
    //这里参考wkey需不需要给值
    const ungroupedTree = {
      key: unassignedKey + state.repoKey,
      name: '未分组',
      title: '未分组',
      workspaceKey: key, //暂时置空
      items: [], //绑在上边的id们
    };
    //tree上的所有id
    let excludeItemId = [];
    //问题是，正常切换的时候这个tree要变化，但是现在没有变化
    const packageBranchKeys = [];
    traverseTreeNodes(tree, node => {
      excludeItemId = excludeItemId.concat(node?.testDetailIds ?? []);
      packageBranchKeys.push(node.key); //注意这部分要重新切一下
    });

    const resP = await fetchItems(
      {
        in: excludeItemId,
        workspaceKey: key,
        //nameLike: state.searchValue,
        type: TestType.TestDetail, //事项和detail 1:1关联
      },
      {
        limit: 10000,
      },
    );
    let pItems = [];
    pItems = resP?.results.map(item => {
      item.key = item.objectId;
      return item;
    });
    const pkeys = [];
    pItems.forEach(item => {
      pkeys.push(item.key);
    });
    state.packedKeys = pkeys;

    /* state.packedKeys = packedKeys; //将所有的keys拿到 */
    //itemIds本身就是结果，而不是ids
    // excludeItemId = excludeItemId.concat(ignoreTestEntityIds);
    const res = await fetchItems(
      {
        notIn: excludeItemId,
        workspaceKey: key,
        //nameLike: state.searchValue,
        type: TestType.TestDetail, //事项和detail 1:1关联
      },
      {
        limit: 10000,
      },
    );
    //直接给未分组挂了items
    let unItems = [];
    unItems = res?.results ?? [];
    ungroupedTree.items = unItems.map(item => {
      item.key = item.objectId;
      return item;
    });
    const unpackedKeys = [];
    //将未分组的所有key都收集一下,方便管理左侧
    ungroupedTree.items.forEach(item => {
      unpackedKeys.push(item.key);
    });
    state.unpackedKeys = unpackedKeys;
    tree.unshift(ungroupedTree); //在头部加上这个未分组选项
    return tree;
  };

  //top select
  async function topSelect(value) {
    const index = state.selectData.findIndex(item => item.attributes.key == value);
    //得到对应的
    const data = state.selectData[index];
    //todo，新的repoKey
    state.repoKey = data.attributes.key; //repoKey
    // const key = data[0]?.workspaceKey;
    const key = data.attributes.key;
    state.defaultValue = key;
    let tree = state.repoList[index];
    //树形结构数据
    tree = await getIds(tree, key);
    state.treeData = tree;
    // const cache = state.fullCases.filter(item => item.repoKey == repoKey); //缓存
    const currrnt = state.fullCases.filter(item => item.repoKey == value); //当前
    //进来之后让它默认选中未分组
    const keys = [unassignedKey + state.repoKey];
    //去掉默认选中
    /* setSelectedKeys(keys); */

    // clearTreeAndTable();

    setTableData(tree[0].items ?? []);

    //使用部分，如果没有缓存，就一切都是0
    if (currrnt.length > 0) {
      //从current中取值赋值
      setCheckedKeys(currrnt[0].checkedKeys);
      setSelectedRowKeys(currrnt[0].selectedRowKeys);
      // setTableData(currrnt[0].tableData);
    }
    setSelectedRowKeys(JSON.parse(JSON.stringify(state.rowkeys)));
    setRepoKey(value);
    setWorkspaceKey(key);
  }

  const onSubmit = async () => {
    state.rowkeys = [];
    state.fullCases = [];
    handleOk([]);
  };

  //--tree相关方法--
  const onExpand = (expandedKeysValue: React.Key[]) => {
    // if not set autoExpandParent to false, if children expanded, parent can not collapse.
    // or, you can remove all expanded children keys.
    setExpandedKeys(expandedKeysValue);
    setAutoExpandParent(false);
  };
  const onSelect = async (selectedKeysValue: React.Key[], info: any) => {
    const rowkeys = cloneDeep(state.rowkeys);
    const items = [];

    setSelectedKeys(selectedKeysValue);

    /* const pre = selectedKeys;
    const next = selectedKeysValue;

    //重读点击取消数据
    if (pre.length > next.length) {
      //pass
    }
    //如果只是切换，或者新增
    if (pre.length == next.length || pre.length < next.length) {
      if (info?.node.key == unassignedKey + state.repoKey) {
        const nodeItems = info.node.items;
        state.justSelectItems = info.node.items;
        state.justSelectKey = unassignedKey + state.repoKey; //当前选中的key
        //subItems
        const subItems = nodeItems.filter(item => !items.includes(item));
        items = [...subItems, ...items];
      }
      //如果是已分组数据
      else {
        const ids = info.node?.testDetailIds ?? [];
        const res = await fetchItems(
          {
            notIn: [],
            in: ids,
            //nameLike: state.searchValue,
            // itemType: [config.itemTypeMap?.TestDetail], //事项和detail 1:1关联
            type: TestType.TestDetail,
          },
          {
            limit: 10000,
          },
        );
        //拿到了需要的items
        let nodeItems = res.results ?? [];
        nodeItems = nodeItems.map(item => {
          item.key = item.objectId;
          return item;
        });

        //通过fetchItems获取的值，然后我们需要变化一下，将key直接给到id
        //后期提交的时候我们就不需要再去查找了
        const subKeys = [];
        const itemsKeys = [];
        nodeItems.forEach(item => {
          subKeys.push(item.key);
        });
        items.forEach(item => {
          itemsKeys.push(item.key);
        });
        //然后用key再去筛选
        const sKeys = subKeys.filter(item => !itemsKeys.includes(item));
        //然后自己去筛选自己
        const subItems = nodeItems.filter(item => sKeys.includes(item.key));
        items = [...subItems, ...items];
        //分组和筛选应该分别设置
        state.justSelectItems = nodeItems; //获取到items，然后对这个items进行筛选
        state.justSelectKey = info.node.key;
      }
    }
    setSelectedKeys(selectedKeysValue);
    //切换的时候并没有change，所以要人为的加一个change
    setSelectedRowKeys(rowkeys); */
  };

  return (
    <Modal
      destroyOnClose
      maskClosable={false}
      width={600}
      autoHeight
      title="复制用例"
      visible={isModalVisible}
      getContainer={() => getRootContainer()}
      onOk={() => {
        onSubmit();
      }}
      onCancel={() => {
        state.rowkeys = [];
        handleCancel();
      }}
    >
      <p className={cx('sub_title')}>
        <span>选择测试用例库</span>
      </p>

      <div id="case_top_sel" className={cx('box_sel')}>
        {state.selectData.length > 0 ? (
          <Select
            defaultValue={
              state.defaultValue == '' ? state.selectData[0]?.attributes.key : state.defaultValue
            }
            style={{ width: '100%' }}
            onChange={topSelect}
            getPopupContainer={() => document.getElementById('case_top_sel')}
          >
            {state.selectData.map(item => (
              <Select.Option value={item.attributes.key} key={item.attributes.key}>
                {item.attributes.name}
              </Select.Option>
            ))}
          </Select>
        ) : (
          'loading'
        )}
      </div>

      <p className={cx('sub_title')}>
        <span>选择模块</span>
      </p>
      <div className={cx('box_tree')}>
        <Tree
          onExpand={onExpand}
          showIcon
          expandedKeys={expandedKeys}
          autoExpandParent={autoExpandParent}
          onSelect={onSelect}
          selectedKeys={selectedKeys}
          treeData={state.treed}
          defaultExpandAll={false}
        />
      </div>
    </Modal>
  );
};
export default CaseModal;
