/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-spread */
import React, { FC, useState, useCallback } from 'react';
import { Modal, Select, Input, Button, Row, Col } from '@osui/ui';
import CaseBox from './CaseBox';
import { getAppByAppKey, getAppInstallationByApp, getWorkspacesByScheme } from '@/lib/api/case';
import { getTestEntitiesByQuery } from '@/lib/api/common';
import { unique, traverseTreeNodes, treeToChildren } from './utils';
import type { DataType } from './CaseBox/index';
import { xor, cloneDeep } from 'lodash';
import { useTestConfig } from '@/lib/hooks/useContext';
// import { getItemByIQL } from '@/lib/api/proxima'; //iql
import { getFolderTree } from '@/lib/api/repository';
import {
  useMount,
  useRequest,
  useReactive,
  useUpdateEffect,
  useDebounce,
  useHistoryTravel,
} from 'ahooks';
import { TestType } from '@/lib/constants';
import { useSDK } from '@projectproxima/plugin-sdk';
import { getDevConfig } from '@/devEnv';
import cx from './index.less';
import { SearchOutlined } from '@ant-design/icons';
interface ModelItem {
  isModalVisible: boolean;
  handleOk: (data: any) => void;
  handleCancel: () => void;
  type: number; //0是继承，1是规划
  ignoreTestEntityIds?: string[];
  needFillValue?: boolean;
}
type CheckedType = { checked?: string[]; halfChecked?: string[] };
const unassignedKey = 'UN_ASSIGNED_CASE_KEY'; //未分组的key

const CaseModal: FC<ModelItem> = ({
  isModalVisible,
  handleOk,
  handleCancel,
  type,
  ignoreTestEntityIds,
  needFillValue,
}) => {
  const [tableData, setTableData] = useState<any>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<CheckedType>({ checked: [], halfChecked: [] });
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState<boolean>(true);
  const [workspaceKey, setWorkspaceKey] = useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
  const [repoKey, setRepoKey] = useState<string>(''); //我们来处理repo
  const { config } = useTestConfig();
  const state = useReactive({
    fullCases: [], //这里维护一个全量状态,todo
    total: 0,
    treeData: [], //树节点数据
    workspaceKeys: [],
    selectData: [], //select所有数据
    defaultValue: '', //select初始选中值
    isIsolate: false, //维护一个全局的状态，是否有权限控制，默认false
    checkedKeys: [], //维护一个选中效果
    justSelectItems: [], //记录一批items，方便我们后期比对，省心新的item
    justSelectKey: '', //记录一下key值，这个如何判断修改
    unpackedKeys: [], //未分组的key，主要用于右侧对左侧的控制
    packedKeys: [], //注意这个key，对应的是最终items的key，这些值可以在getIds中拿到，限定一下上下文
    packedBranchKeys: [], // 树节点的key，需要对照选中
    packageTree: [], //将整个tree拿到
    rowkeys: [], //用state还不如这个rowkeys
    searchChange: false,
    searchValue: '',
    //这两个给继承
    clickIndex: null, //继承选中的index
    clickRecord: null, //继承选中的具体record内容
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
  const { value: originTable, setValue: setOriginTable, reset } = useHistoryTravel<any[]>([]);
  const debouncedValue = useDebounce(state.searchValue, { wait: 500 });

  useUpdateEffect(() => {
    //判断是否有原始值
    let table = [];
    if (originTable.length > 0) {
      table = originTable.filter(item => item?.title.indexOf(debouncedValue) != -1);
    } else {
      table = tableData.filter(item => item?.title.indexOf(debouncedValue) != -1);
    }
    //存起来原始值
    if (originTable.length == 0 && tableData.length > 0) {
      setOriginTable(tableData);
    }
    setTableData(table);
  }, [debouncedValue]);

  useUpdateEffect(() => {
    if (isModalVisible == false) {
      initData();
    }
  }, [isModalVisible]);

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
    let workspaceKeys = [];
    for (let i = 0; i < workspaces.length; i++) {
      const key = workspaces[i]?.attributes?.key;
      workspaceKeys.push(key);
    }
    //走隔离函数
    workspaceKeys = isolateFunc(workspaceKeys);
    state.workspaceKeys = workspaceKeys;

    //优化成新的树形结构
    const repoList = [];
    for (let i = 0; i < state.workspaceKeys.length; i++) {
      //进行数据请求
      const res = await fetchTreeData(state.workspaceKeys[i]);
      //pass
      repoList.push.apply(repoList, res);
    }
    //selectData的初始化
    state.selectData = repoList;
    //初始tree值
    const treeData = repoList.length > 0 ? repoList[0] : [];
    let t = []; //给到tree的应该是一个数组
    t.push(treeData);
    //初始化的时候，未分组也是对应着workspaceKey获取的数据
    t = await getIds(t, state.workspaceKeys[0]);
    state.treeData = t;
    state.defaultValue = state.selectData[0].key || '';
  }, []);
  //isolate func
  const isolateFunc = (workspaceKeys: string[]): string[] => {
    //从config里边拿到隔离数组
    const itypes = config.isolateTestType ?? [];
    const detail = TestType.TestDetail;
    state.isIsolate = itypes.includes(detail) ? true : false;

    //如果做了隔离，数组里边只保留一个
    if (state.isIsolate) {
      workspaceKeys = [];
      //拿到当前workspaceKey进行处理
      const { context } = useSDK();
      const workspaceKey = context?.env?.WORKSPACE_KEY ?? getDevConfig().workspaceKey;
      workspaceKey.unshift(workspaceKey);
    }
    return workspaceKeys;
  };

  const clearTreeAndTable = () => {
    setCheckedKeys({ checked: [], halfChecked: [] });
    setSelectedRowKeys([]);
    setTableData([]);
    setSelectedKeys([]);
  };
  //对未分组部分数据的处理
  const getIds: (t: any[], key: string) => Promise<any[]> = async (
    t: any[],
    key: string,
  ): Promise<any[]> => {
    let tree = cloneDeep(t);
    //这里参考wkey需不需要给值
    const ungroupedTree = {
      key: unassignedKey,
      name: '未分组',
      title: '未分组',
      workspaceKey: key, //暂时置空
      items: [], //绑在上边的id们
    };
    //tree上的所有id
    let excludeItemId = [];
    tree = tree.length > 1 ? [tree[1]] : [tree[0]];
    //问题是，正常切换的时候这个tree要变化，但是现在没有变化
    const packageBranchKeys = [];
    traverseTreeNodes(tree, node => {
      excludeItemId = excludeItemId.concat(node?.testDetailIds ?? []);
      packageBranchKeys.push(node.key); //注意这部分要重新切一下
    });
    state.packedBranchKeys = packageBranchKeys;

    const resP = await fetchItems(
      {
        in: excludeItemId,
        notIn: [...ignoreTestEntityIds], //去掉已提交
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
    excludeItemId = excludeItemId.concat(ignoreTestEntityIds);
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
  const onExpand = (expandedKeysValue: React.Key[]) => {
    // if not set autoExpandParent to false, if children expanded, parent can not collapse.
    // or, you can remove all expanded children keys.
    setExpandedKeys(expandedKeysValue);
    setAutoExpandParent(false);
  };

  //left control right and slect rows
  const onCheck = async (checkedKeysValue: CheckedType, info: any) => {
    let items = [];
    let keys = cloneDeep(state.rowkeys);
    const node = info.node;

    //知道是加法还是减法，哪些东西变化了
    const pre = checkedKeys.checked; //pre的length可能不存在
    const next = checkedKeysValue.checked;

    //加一些选中改造
    //(0)找出加减
    let adds = [];
    let subs = [];
    //console.log('--checkedKeys', checkedKeys);

    if (next.length > pre.length) {
      adds = xor(next, pre);
    } else {
      subs = xor(next, pre);
    }

    if (adds.length > 0) {
      //如果是top节点
      if (!node?.parentId) {
        if (!node?.children) {
          //single top这种不需要处理
        } else {
          //将children的key拿到给到checked
          const subKeys = [];
          node.children.forEach(item => {
            subKeys.push(item.key);
          });
          checkedKeysValue.checked.push.apply(checkedKeysValue.checked, subKeys);
        }
      }
      //如果含有父一级
      if (node?.parentId) {
        //pass
        if (node?.children) {
          //todo 中间层
        } else {
          //todo 底部
        }
      }
    }

    if (subs.length > 0) {
      //如果做了减法操作
      if (!node?.parentId) {
        //说明是top节点,就是单个节点,也就是只有自身
        //console.log('--top--');
        if (!node?.children) {
          //single top这种不需要处理
        } else {
          //将children的key拿到给到checked
          const subKeys = [];
          node.children.forEach(item => {
            subKeys.push(item.key);
          });
          checkedKeysValue.checked = checkedKeysValue.checked.filter(
            node => !subKeys.includes(node),
          );
        }
      }
      //如果含有父一级
      if (node?.parentId) {
        //pass
        if (node?.children) {
          //中间层
        } else {
          //底部
        }
      }
    }

    setCheckedKeys(checkedKeysValue);
    setSelectedKeys([]);

    //加上和减去的一些树形
    const subKeys = [];
    const addKeys = [];

    //(3)在未选的基础上再完成一些加减
    //--add--
    if (adds.length > 0) {
      //--未分组
      if (adds.includes(unassignedKey)) {
        items = items.concat(node.items);
        //在加的时候，如果有选中，就去掉
        /* items = unique(items); //去重 */
        let ids = [];
        items.forEach(item => {
          ids.push(item.id);
        });
        ids = unique(ids);
        const its = [];
        //再ids的基础上做的items的筛选
        ids.forEach(item => {
          //如何从另一个数组里边取出一个满足该id的item
          const it = items.find(i => i.id == item);
          its.push(it);
        });
        items = its;
        //--在加减中keys的变化
        node.items.forEach(item => {
          addKeys.push(item.key);
        });
      }
      //--已分组
      else {
        const nodes = [];
        traverseTreeNodes([node], item => {
          nodes.push(item);
        });

        let subIds = []; //新增
        let ids = []; //ids是总数
        nodes.forEach(item => {
          //在加减中key的变化
          /* addKeys.push(item?.key); */
          subIds = subIds.concat(item?.testDetailIds ?? []); //然后根
        });
        // //console.log('--addkey--', addKeys);
        subIds = subIds.filter(res => res != undefined);

        //set去重是到items这一层
        items.forEach(item => {
          ids.push(item.id);
        });
        //整体的ids，去重
        ids = ids.concat(subIds);
        ids = unique(ids);

        //然后根据ids去请求相应的items
        const res = await fetchItems(
          {
            notIn: [...ignoreTestEntityIds],
            in: ids,
            //nameLike: state.searchValue,
            type: TestType.TestDetail, //事项和detail 1:1关联
          },
          {
            limit: 10000,
          },
        );
        //items
        items = res?.results.map(item => {
          item.key = item.objectId;
          return item;
        }); //做一层去重

        const addRes = await fetchItems(
          {
            notIn: [...ignoreTestEntityIds],
            in: subIds,
            //nameLike: state.searchValue,
            type: TestType.TestDetail, //事项和detail 1:1关联
          },
          {
            limit: 10000,
          },
        );
        const subItems = addRes?.results.map(item => {
          item.key = item.objectId;
          return item;
        }); //做一层去重
        subItems.forEach(item => {
          addKeys.push(item.key);
        });
      }
    }
    //--sub--
    if (subs.length > 0) {
      //--未分组
      //先对id进行操作然后再请求
      let ids = [];
      items.forEach(item => {
        ids.push(item.id);
      });
      if (subs.includes(unassignedKey)) {
        const subIds = [];
        node.items.forEach(item => {
          subKeys.push(item.key); //用来处理key
          subIds.push(item.id);
        });
        ids = ids.filter(item => !subIds.includes(item));

        const res = await fetchItems(
          {
            notIn: [...ignoreTestEntityIds],
            in: ids,
            //nameLike: state.searchValue,
            type: TestType.TestDetail, //事项和detail 1:1关联
          },
          {
            limit: 10000,
          },
        );
        //list
        const list = res.results ?? [];
        items = list.map(item => {
          item.key = item.objectId;
          return item;
        });
      }
      //-已分组
      else {
        let subIds = [];
        traverseTreeNodes([info.node], node => {
          subIds = subIds.concat(node.testDetailIds ?? []);
        });
        subIds = subIds.concat(ignoreTestEntityIds);
        const res = await fetchItems(
          {
            notIn: subIds,
            in: ids,
            type: TestType.TestDetail,
          },
          {
            limit: 10000,
          },
        );
        //list
        const list = res.results ?? [];
        items = list.map(item => {
          item.key = item.objectId;
          return item;
        });

        //todo: 减去是针对subids的减去
        //减去的话从总体减去不用再请求
        const subRes = await fetchItems(
          {
            notIn: [...ignoreTestEntityIds],
            in: subIds,
            //nameLike: state.searchValue,
            type: TestType.TestDetail, //事项和detail 1:1关联
          },
          {
            limit: 10000,
          },
        );
        const subItems = subRes?.results.map(item => {
          item.key = item.objectId;
          return item;
        }); //做一层去重
        subItems.forEach(item => {
          subKeys.push(item.key);
        });
      }
    }

    //最后设置items
    setTableData(items);

    if (addKeys.length > 0) {
      keys = keys.concat(addKeys);
    }
    if (subKeys.length > 0) {
      keys = keys.filter(item => !subKeys.includes(item));
    }
    keys = unique(keys);
    state.rowkeys = keys;

    //之前select的部分先去掉，然后再处理交集，上边的tableData先不处理
    setSelectedRowKeys(keys);

    //(2)单个命中，这个是目前一个未选的状况
    /* if (checkedKeysValue.checked.length == 0) {
      setTableData([]);
      setSelectedRowKeys([]);
    } */
    reset();
  };

  //点击树节点的时候触发，树节点是文字部分
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onSelect = async (selectedKeysValue: React.Key[], info: any) => {
    const rowkeys = cloneDeep(state.rowkeys);
    let items = [];
    state.clickIndex = null;

    const pre = selectedKeys;
    const next = selectedKeysValue;

    //重读点击取消数据
    if (pre.length > next.length) {
      //pass
    }
    //如果只是切换，或者新增
    if (pre.length == next.length || pre.length < next.length) {
      if (info?.node.key == unassignedKey) {
        const nodeItems = info.node.items;
        state.justSelectItems = info.node.items;
        state.justSelectKey = unassignedKey; //当前选中的key
        //subItems
        const subItems = nodeItems.filter(item => !items.includes(item));
        items = [...subItems, ...items];
      }
      //如果是已分组数据
      else {
        const ids = info.node?.testDetailIds ?? [];
        const res = await fetchItems(
          {
            notIn: [...ignoreTestEntityIds],
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
    setTableData(items);
    setSelectedKeys(selectedKeysValue);
    //切换的时候并没有change，所以要人为的加一个change
    setSelectedRowKeys(rowkeys);
    reset();
  };

  const rowSelection = {
    selectedRowKeys,
    //--todo-- 去耦合，slect部分主要控制选中
    onSelect: (record, selected, selectedRows, nativeEvent) => {
      // console.log('select', selected, 'record', record);
      if (selected) state.rowkeys.push(record.key);
      if (!selected)
        state.rowkeys.splice(
          state.rowkeys.findIndex(item => item == record.key),
          1,
        );
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onSelectAll: (selected, selectedRows, changeRows) => {
      //pass
      // console.log('select', selected, 'change', changeRows);
      const keys = [];
      changeRows.forEach(item => {
        keys.push(item.key);
      });
      if (selected) {
        state.rowkeys.push.apply(state.rowkeys, keys);
      }
      if (!selected) {
        state.rowkeys = state.rowkeys.filter(item => !keys.includes(item));
      }
    },

    //--right control left
    onChange: async (keys: React.Key[], selectedRows: DataType[]) => {
      let rowkeys = cloneDeep(state.rowkeys);
      const ckeys = cloneDeep(checkedKeys);

      //未分组的所有key
      const unpackedKeys = [];
      state.unpackedKeys.forEach(item => {
        unpackedKeys.push(item);
      });

      //已分组的所有key
      const packagekeys = [];
      state.packedKeys.forEach(item => {
        packagekeys.push(item);
      });

      const treeData = cloneDeep(state.treeData);
      const tr = treeData.length > 1 ? treeData[1] : [];
      const children = treeToChildren([tr]);
      const groupBox = [];
      const groupKeys = [];

      for (let i = 0; i < children.length; i++) {
        //pass
        const { results } = await fetchItems(
          {
            notIn: [...ignoreTestEntityIds],
            in: children[i],
            type: TestType.TestDetail,
          },
          {
            limit: 10000,
          },
        );
        results.map(item => {
          item.key = item.objectId;
          return item;
        });

        groupBox.push(results);
      }

      for (let i = 0; i < groupBox.length; i++) {
        //将items分组放好
        const items = [];
        groupBox[i].forEach(item => {
          items.push(item.key);
        });
        groupKeys.push(items);
      }
      const branchkeys = [];
      state.packedBranchKeys.forEach(item => {
        branchkeys.push(item);
      });

      groupKeys.forEach((item, index) => {
        const items = groupKeys[index];
        const originLength = items.length;
        const keys = rowkeys.filter(item => items.includes(item));
        const currentLength = keys.length;
        // console.log('origin-current', originLength, currentLength);
        const topkey = Object.values(branchkeys)[index];

        //如果是选中
        if (originLength == currentLength) {
          if (!ckeys.checked.includes(topkey)) {
            ckeys.checked.push(topkey);
            if (ckeys.halfChecked.includes(topkey)) {
              ckeys.halfChecked.splice(
                //找到要删除的位置
                ckeys.halfChecked.findIndex(item => item == topkey),
                //删除一个确定值
                1,
              );
            }
          }
        }

        //如果是清空
        if (keys.length == 0) {
          //做减法，减完
          if (ckeys.halfChecked.includes(topkey)) {
            ckeys.halfChecked.splice(
              //找到要删除的位置
              ckeys.halfChecked.findIndex(item => item == topkey),
              //删除一个确定值
              1,
            );
          }
          if (ckeys.checked.includes(topkey)) {
            ckeys.checked.splice(
              //找到要删除的位置
              ckeys.checked.findIndex(item => item == topkey),
              //删除一个确定值
              1,
            );
          }
        }
        //如果是选中部分
        if (currentLength < originLength && keys.length > 0) {
          if (!ckeys.halfChecked.includes(topkey)) {
            ckeys.halfChecked.push(topkey);
          }
          if (ckeys.checked.includes(topkey)) {
            ckeys.checked.splice(
              //找到要删除的位置
              ckeys.checked.findIndex(item => item == topkey),
              //删除一个确定值
              1,
            );
          }
        }
      });
      const unkeys = rowkeys.filter(item => unpackedKeys.includes(item));
      //说明要处理未选中
      if (unkeys.length >= 0) {
        //如果是全部选中
        if (unkeys.length == unpackedKeys.length) {
          //console.log('全部选中');
          if (!ckeys.checked.includes(unassignedKey)) {
            //todo
            ckeys.checked.push(unassignedKey);
            if (ckeys.halfChecked.includes(unassignedKey)) {
              ckeys.halfChecked.splice(
                //找到要删除的位置
                ckeys.halfChecked.findIndex(item => item == unassignedKey),
                //删除一个确定值
                1,
              );
            }
          }
        }
        //如果全部不选
        if (unkeys.length == 0) {
          if (ckeys.halfChecked.includes(unassignedKey)) {
            ckeys.halfChecked.splice(
              //找到要删除的位置
              ckeys.halfChecked.findIndex(item => item == unassignedKey),
              //删除一个确定值
              1,
            );
          }
          if (ckeys.checked.includes(unassignedKey)) {
            ckeys.checked.splice(
              //找到要删除的位置
              ckeys.checked.findIndex(item => item == unassignedKey),
              //删除一个确定值
              1,
            );
          }
        }
        //如果只是选中了部分
        if (unkeys.length > 0 && unkeys.length != unpackedKeys.length) {
          //减少到部分,注意不能一直往里加，只是第一次加,直到加满，一直都是这个状态
          if (!ckeys.halfChecked.includes(unassignedKey)) {
            ckeys.halfChecked.push(unassignedKey);
          }

          if (ckeys.checked.includes(unassignedKey)) {
            ckeys.checked.splice(
              //找到要删除的位置
              ckeys.checked.findIndex(item => item == unassignedKey),
              //删除一个确定值
              1,
            );
          }
        }
      }

      rowkeys.push(keys);
      rowkeys = unique(keys);

      setSelectedRowKeys(rowkeys);

      setCheckedKeys(ckeys);
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getCheckboxProps: (record: DataType) => ({}),
  };

  //top select
  async function handleChange(value) {
    setSelectedKeys([]); //点击选中给去掉
    let data = state.selectData.filter(item => item.key === value);
    /* console.log('--data--', data); */
    const key = data[0]?.workspaceKey;
    state.defaultValue = data[0].key;

    const cache = state.fullCases.filter(item => item.repoKey == repoKey); //缓存
    const currrnt = state.fullCases.filter(item => item.repoKey == value); //当前

    //上一波有没有缓存都会清理一下数据
    //清理完之后，下边会根据缓存取值
    if (cache.length > 0) {
      //如果这部分已经有缓存了，这里做一下更新
      state.fullCases = state.fullCases.map(item => {
        //对数据进行进一步处理
        if (item.key == repoKey) {
          item.checkedKeys = { ...checkedKeys };
          item.selectedRowKeys = [...selectedRowKeys];
          item.tabData = [...tableData];
        }
        return item;
        //更新完上次的是不是要清空下
      });
      clearTreeAndTable();
      //如果这部分没有缓存了，就做一下更新
    } else {
      //进一步处理下数据
      const obj = {
        repoKey: repoKey,
        checkedKeys: { ...checkedKeys },
        selectedRowKeys: [...selectedRowKeys],
        tableData: [...tableData],
      };
      state.fullCases.push(obj);
      clearTreeAndTable();
    }

    //使用部分，如果没有缓存，就一切都是0
    if (currrnt.length > 0) {
      //从current中取值赋值
      setCheckedKeys(currrnt[0].checkedKeys);
      setSelectedRowKeys(currrnt[0].selectedRowKeys);
      setTableData(currrnt[0].tableData);
    }

    data = await getIds(data, key);
    state.treeData = data;

    setRepoKey(value);
    setWorkspaceKey(key); //key发生了变化
  }

  const changeSearch: () => void = (): void => {
    //pass
    if (!state.searchChange) {
      state.searchChange = true;
    }
  };

  const onSubmit = async () => {
    let testIds = [];
    //if是继承

    //--如果type等于0，是单选模式--
    if (type == 0) {
      if (state.clickRecord != null) {
        const ids = [];
        ids.push(state.clickRecord?.objectId);
        const itemId = ids;
        //我们重新请求res
        const res = await fetchItems({
          in: itemId,
          type: TestType.TestDetail,
        });
        const results = res.results;
        if (needFillValue) testIds = results;
        if (!needFillValue) {
          results.forEach(item => {
            testIds.push(item.objectId);
          });
        }
      }
    }

    //if是规划
    if (type == 1) {
      let ids = [];
      state.rowkeys.forEach(item => {
        ids.push(item);
      });
      ids = unique(ids);
      const itemId = ids;

      const res = await fetchItems(
        {
          in: itemId,
          type: TestType.TestDetail,
        },
        {
          limit: 1000,
        },
      );
      const results = res.results;
      if (needFillValue) testIds = results;
      if (!needFillValue) {
        results.forEach(item => {
          testIds.push(item.objectId);
        });
      }
    }
    //最后清理一下数据
    clearTreeAndTable();
    state.rowkeys = [];
    state.fullCases = [];
    handleOk(testIds);
  };

  return (
    <Modal
      destroyOnClose
      maskClosable={false}
      width={1000}
      title={type == 1 ? '规划用例' : '请选择要继承的测试用例'}
      visible={isModalVisible}
      onOk={() => {
        //触发外部的onSubmit，等于是触发handleOk
        /* handleSubmit(); */
        onSubmit();
      }}
      footer={[
        <Row key="row">
          {/* 只有在规划的时候才显示多少条用例 */}
          {type == 1 ? (
            <Col span={4} style={{ textAlign: 'left' }}>
              已选择<span style={{ fontWeight: 600 }}> {state.rowkeys.length} </span>条用例
            </Col>
          ) : (
            <Col span={4}></Col>
          )}
          <Col span={8} offset={12}>
            <Button
              key="back"
              onClick={e => {
                clearTreeAndTable();
                state.checkedKeys = [];
                state.fullCases = [];
                handleCancel();
              }}
            >
              取消
            </Button>
            <Button
              key="submit"
              type="primary"
              onClick={e => {
                onSubmit();
              }}
            >
              确定
            </Button>
          </Col>
        </Row>,
      ]}
      onCancel={() => {
        state.rowkeys = [];
        handleCancel();
        clearTreeAndTable();
      }}
    >
      <p className={cx('sub_title')}>
        <span>
          选择用例库 <span className={cx('des')}>(仅可选择当前拥有权限的用例库)</span>
        </span>
        {/* search按钮 */}
        <span
          className={cx({ search_btn: true, search_btn_none: state.searchChange })}
          onClick={changeSearch}
        >
          <SearchOutlined style={{ marginRight: 3 }} />
          搜索
        </span>
        {/* search输入框,隐层 */}
        {state.searchChange ? (
          <span className={cx({ search_input: state.searchChange })}>
            <Input
              size="small"
              placeholder="请输入"
              style={{ width: 150 }}
              prefix={<SearchOutlined />}
              value={state.searchValue}
              onChange={e => (state.searchValue = e.target.value)}
            />
          </span>
        ) : null}
      </p>

      <div className={cx('box_sel')}>
        {state.selectData.length > 0 ? (
          <Select
            defaultValue={state.defaultValue == '' ? state.selectData[0].key : state.defaultValue}
            style={{ width: '100%' }}
            onChange={handleChange}
          >
            {state.selectData.map(item => (
              <Select.Option value={item.key} key={item.key}>
                {item?.name}
              </Select.Option>
            ))}
          </Select>
        ) : (
          'loading'
        )}
      </div>

      <CaseBox
        type={type}
        tree={state.treeData}
        onExpand={onExpand}
        expandedKeys={expandedKeys}
        autoExpandParent={autoExpandParent}
        onCheck={onCheck}
        checkedKeys={checkedKeys}
        onSelect={onSelect}
        selectedKeys={selectedKeys}
        tableData={tableData}
        rowSelection={rowSelection}
        clickIndex={type == 0 ? state.clickIndex : null}
        //加上自定义footer的处理
        onRow={(record, index) => {
          if (type == 0) {
            return {
              onClick: event => {
                //和外置index，做一下选中判断
                if (index == state.clickIndex) {
                  state.clickIndex = null;
                  state.clickRecord = null;
                } else {
                  state.clickIndex = index;
                  state.clickRecord = record;
                }
              },
            };
          }
        }}
      />
    </Modal>
  );
};

export default CaseModal;
