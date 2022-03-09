/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import React from 'react';
import FolderTree from '@/pages/repository/FolderTree';
import { getDevConfig } from '@/devEnv';
import TestDetailTable from './TestDetailTable';
import { useReactive, useRequest, useUpdate } from 'ahooks';
import { getFolderTree } from '@/lib/api/repository';
import { useSDK } from '@projectproxima/plugin-sdk';
import { useTestConfig } from '@/lib/hooks/useContext';
import PageLayout from '@/components/common/PageLayout';
import { getTestEntitiesByQuery } from '@/lib/api/common';
import TestManagerProvider from '@/components/common/TestManagerProvider';
import { traverseTreeNodes, reverseTreeNodes } from './hook';
import { TestType } from '@/lib/constants';
import { useBoolean } from 'ahooks';
import { Breadcrumb, Input } from '@osui/ui';
import { FileTextOutlined } from '@/icons';
import { message } from 'antd';
import { ROOT_FOLDER_KEY } from './constant';
import CopyModal from './CopyModal'; //复制弹框
import DeleteModal from './DeleteModal'; //删除弹框
import cx from './index.less';
import fetch from '@/lib/utils/fetch';
import { cloneDeep } from 'lodash';
import { deleteDetailsByIds, deleteItemByIds, clearRepoDetailIds } from '@/lib/api/repository';
import { createTestEntities, getTestConfig } from '@/lib/api/common';
import { getKeyByValue } from '@/lib/utils/helper';

// type RowSelectionType = {
//   onChange: (selectedRowKeys: any) => void;
//   selectedRowKeys: string[];
// };

const TestRepository: React.FC<{ workspaceKey: string }> = ({ workspaceKey }) => {
  const initialRef = React.useRef(false);
  //显示和取消
  const [isCopyVisible, { setTrue: setCopyTrue, setFalse: setCopyFalse }] = useBoolean(false);
  const [isDeleteVisible, { setTrue: setDeleteTrue, setFalse: setDeleteFalse }] = useBoolean(false);
  const [needClear, { setTrue: needClearTrue, setFalse: needClearFalse }] = useBoolean(false); //是不是需要清空选中
  const [folderTreeData, setFolderTreeData] = React.useState([]);
  const { config } = useTestConfig();

  //modal部分的代码
  const openCopyCase = () => {
    needClearFalse();
    if (state.rowKeys.length == 0) {
      message.warn('请选择要复制的用例');
      return;
    }
    setCopyTrue();
  };

  //打开删除弹框
  const openDeleteCase = () => {
    needClearFalse();
    if (state.rowKeys.length == 0) {
      message.warn('请选择要删除的用例');
      return;
    }
    setDeleteTrue();
  };

  //点击了ok操作
  const handleOk = async () => {
    //值是什么？可以从table数据中筛选出来我们想要的内容
    //fetchItems
    console.log('tabledata', state.items);
    const data = state.items.filter(item => state.rowKeys.includes(item.objectId));

    //依据这个data，我们去创建想要的列表数据
    //拿到data里对应的items

    /* data.forEach(detail => {
      console.log('item.reference', detail.reference); //这个是item
      const item = detail.reference; //拿到对应的item
      console.log('item.objectId', item.objectId);
    }); */
    //for循环查询
    const detailsIds = [];
    for (let i = 0; i < data.length; i++) {
      const detail = data[i];
      console.log('item.reference', detail.reference); //这个是item
      const item = detail.reference; //拿到对应的item

      //pass
      const itemData = {
        objectId: item.objectId ?? '', //被克隆的卡片id
        workspace: item.workspace?.objectId, //workspace
        name: item.name, // 卡片标题
        includeStatus: false,
      };
      console.log('--itemData--', itemData);
      const result = await fetch.post('/parse/api/items/clone', itemData);
      console.log('---result---', result); //result
      //创建新的detail
      const newItemId = result.data?.objectId;
      const testConfig = await getTestConfig({
        workspaceKey: item?.workspace?.key,
      });
      const itemTypeMap = testConfig?.get('itemTypeMap');
      const testType = getKeyByValue(itemTypeMap, item?.itemType.key) as TestType;
      const newDetails = await createTestEntities([
        {
          itemId: newItemId,
          type: testType,
          workspaceKey: item.workspace?.key,
          fields: {}, //暂不添加,但是需要按需求添加几个属性，todo：后续添加这几项
        },
      ]);
      console.log('--newDetails--', newDetails);
      //  newDetails.id;
      detailsIds.push(newDetails[0].id);
    }
    console.log('----ids----', detailsIds);
    //移动到某个未分组，实际上改变得是workspaceKey和id

    //尝试去调用clone方法
    /* const itemData = {
      objectId: 'hmvdIfyPN4',
      workspace: 'FoeMxgPARP',
      name: '1',
      includeStatus: false,
    };

    const result = await fetch.post('/parse/api/items/clone', itemData);
    console.log('---result---', result); //result
    //如果拿到id，把id保存
    const newItem = result.data;
    const newItemId = result.data?.objectId;
    console.log('itemId', newItemId); */

    //result:
    /* ACL: {role:read_item_group_bd0555a81641449341378: {…}, role:write_item_group_bd0555a81641449341378: {…}, *: {…}, pBzcnqAp1T: {…}}
    ancestors: []
    createdAt: "2022-03-08T14:01:16.931Z"
    createdBy: {__type: 'Pointer', className: '_User', objectId: 'pBzcnqAp1T'}
    itemGroup: {__type: 'Pointer', className: 'ItemGroup', objectId: 'AVDSoCMVyy'}
    itemType: {__type: 'Pointer', className: 'ItemType', objectId: 'hqTQcpfaiO'}
    key: "TEST_TEST_0002-1311"
    name: "1"
    objectId: "2nOTFBjBZw"
    status: {__type: 'Pointer', className: 'Status', objectId: 'HqdG1eLkKc'}
    updatedAt: "2022-03-08T14:01:16.931Z"
    values: {User1: Array(1), Userdd: Array(1), sprint: Array(0), assignee: Array(1), priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2', …}
    workspace: {__type: 'Pointer', className: 'Workspace', objectId: 'FoeMxgPARP'} */

    /* await createTestEntities([
      {
        itemId: item.id,
        type: testType,
        workspaceKey: item?.workspace?.key,
      },
    ]); */
    setCopyFalse();
  };
  const handleCancel = () => {
    setCopyFalse();
  };
  const getSelData = data => {
    state.rowKeys = data; //存储传递过来的值
  };

  //删除的一些操作
  const handleDeleteDone = async () => {
    //确认删除
    /* //todo:
    1.先看如何删除，
    2.在这里把数据拿到
    3.删除items
    4.删除details
    5.清理ids */
    //未分组数据的操作
    console.log('--branch--', state.selectBranchKey);
    //todo , 已经分组的数据
    //获取都要删除的数据
    const data = state.items.filter(item => state.rowKeys.includes(item.objectId));
    //先for循环把items拿到
    let items = [];
    data.forEach(item => {
      items.push(item?.reference);
    });
    //(2)得到itemids
    items = cloneDeep(items);
    const itemIds = [];
    items.forEach(item => {
      itemIds.push(item.objectId);
    });
    //(1)应该先删除details，再删除items
    const details = cloneDeep(data);
    //拿到details的ids们
    const detailsIds = [];
    details.forEach(item => {
      detailsIds.push(item?.objectId);
    });
    const ddets = await deleteDetailsByIds(detailsIds);

    console.log('delete details', ddets); //details---- QfT6BGf5dt 5a9aGULazV */

    //先试着删除这两个items
    const ditems = await deleteItemByIds(itemIds);
    console.log('delete items', ditems);
    //未分组的和模块还没有关系，不需要清理
    if (state.selectBranchKey != ROOT_FOLDER_KEY) {
      const res = await clearRepoDetailIds(
        JSON.parse(JSON.stringify(state.selectBranchKey)),
        detailsIds,
      );
    }
    //刷新table
    state.items = state.items.filter(item => !detailsIds.includes(item.objectId));

    //刷新tree
    refreshFolderTree();
    setDeleteFalse();
    needClearTrue();
  };
  //删除操作，删除之后记得重新刷新界面
  const handleDeleteCancel = () => {
    setDeleteFalse();
  };

  const state = useReactive({
    pagination: {
      offset: 0,
      limit: 20,
    },
    total: 20,
    items: [],
    breadcrumb: [],
    searchValue: '',
    testDetailIds: [],
    isRootFolder: false,
    selectedFolderKey: '',
    rowKeys: [],
    selectBranchKey: null,
    unFoldLength: null,
  });

  const { run: fetchItems, loading: tableLoading } = useRequest(getTestEntitiesByQuery, {
    manual: true,
    onSuccess(data) {
      state.items = data.results;
      state.total = data.count;
      if (state.isRootFolder) {
        state.unFoldLength = state.total;
      }
    },
  });

  const { loading: folderTreeLoading, refreshAsync: refreshFolderTree } = useRequest(
    () => getFolderTree(workspaceKey),
    {
      ready: !!workspaceKey,
      onSuccess(data) {
        setFolderTreeData(data);
      },
    },
  );

  // 获取 item
  const fetchFolderItems = React.useCallback(() => {
    //如果是未分组
    if (state.isRootFolder) {
      let excludeItemId = [];
      traverseTreeNodes(folderTreeData, node => {
        excludeItemId = excludeItemId.concat(node.testDetailIds);
      });

      fetchItems(
        {
          workspaceKey,
          notIn: excludeItemId,
          type: TestType.TestDetail,
          nameLike: state.searchValue,
        },
        {
          ...state.pagination,
          ascendingKeys: state.isRootFolder ? ['createdAt'] : null,
        },
      );
    } else {
      fetchItems({
        workspaceKey,
        in: state.testDetailIds,
        type: TestType.TestDetail,
        nameLike: state.searchValue,
      });
    }
  }, [
    state.isRootFolder,
    state.pagination,
    state.searchValue,
    state.testDetailIds,
    folderTreeData,
    fetchItems,
    workspaceKey,
  ]);

  const handlePageChange = React.useCallback(
    (currentPage, limit) => {
      state.pagination = {
        offset: (currentPage - 1) * limit,
        limit,
      };
      fetchFolderItems();
    },
    [fetchFolderItems, state],
  );

  React.useEffect(() => {
    if (workspaceKey && config.itemTypeMap?.TestDetail && !initialRef.current) {
      initialRef.current = true;
      fetchFolderItems();
    }
  }, [config.itemTypeMap?.TestDetail, fetchFolderItems, workspaceKey]);

  const treeNodeData = React.useMemo(() => {
    const rootFolder = {
      key: ROOT_FOLDER_KEY,
      name: '未分组用例',
      title: '未分组用例',
      parentId: null,
      testDetailIds: [],
      icon: <FileTextOutlined />,
      // 测试案例库有且只有一个根模块
      children: [],
    };
    return [rootFolder].concat(folderTreeData);
  }, [folderTreeData]);

  const handleSelect = React.useCallback(
    node => {
      //需要知道模块id，方便删除detailids
      state.selectBranchKey = node?.key;
      if (state.selectedFolderKey !== node?.key) {
        // 重置分页参数
        state.pagination = {
          ...state.pagination,
          offset: 0,
        };
      }

      state.selectedFolderKey = node.key;
      const testDetailIds = node.testDetailIds;
      state.testDetailIds = testDetailIds;
      state.isRootFolder = node.key === ROOT_FOLDER_KEY;
      const breadcrumbs = [];
      reverseTreeNodes(treeNodeData, node, n => {
        breadcrumbs.unshift(n.name);
      });
      state.breadcrumb = breadcrumbs;
      // 第一次使用 useEffect 请求
      if (!initialRef.current) return;
      fetchFolderItems();
    },
    [fetchFolderItems, state, treeNodeData],
  );

  return (
    <PageLayout className={cx('test-repository')}>
      <PageLayout.Header>
        <header className={cx('header')}>测试用例仓库</header>
      </PageLayout.Header>
      <PageLayout.Left>
        <FolderTree
          onSelect={handleSelect}
          loading={folderTreeLoading}
          treeNodeData={treeNodeData}
          unFoldLength={state.unFoldLength}
          onFolderTreeChange={refreshFolderTree}
        />
      </PageLayout.Left>
      <PageLayout.Right>
        <div className={cx('breadcrumb-container')}>
          <Breadcrumb
            className={cx('breadcrumb')}
            separator={<span className={cx('separator')}>&gt;</span>}
          >
            {state.breadcrumb.map((title, index) => (
              <Breadcrumb.Item
                className={cx(index !== state.breadcrumb.length - 1 && 'secondary')}
                key={title}
              >
                {title}
              </Breadcrumb.Item>
            ))}
          </Breadcrumb>
          <Input.Search
            className={cx('search')}
            placeholder="请输入关键字"
            style={{ width: 200 }}
            value={state.searchValue}
            onSearch={fetchFolderItems}
            onChange={e => (state.searchValue = e.target.value)}
          />
        </div>
        <div className={cx('table-container')}>
          <TestDetailTable
            total={state.total}
            loading={tableLoading}
            dataSource={state.items}
            onPageChange={handlePageChange}
            selectedFolderKey={state.selectedFolderKey}
            openCopyCase={openCopyCase}
            openDeleteCase={openDeleteCase}
            getSelData={getSelData}
            needClear={needClear}
          />
          {/* --复制弹框-- */}
          <CopyModal
            isModalVisible={isCopyVisible}
            handleOk={handleOk}
            handleCancel={handleCancel}
          />
          {/* --删除弹框-- */}
          <DeleteModal
            deleteSize={state.rowKeys.length}
            isModalVisible={isDeleteVisible}
            handleDeleteDone={handleDeleteDone}
            handleDeleteCancel={handleDeleteCancel}
          />
        </div>
      </PageLayout.Right>
    </PageLayout>
  );
};

const TestRepositoryPage = () => {
  const { context } = useSDK();
  const workspaceKey = context?.env?.WORKSPACE_KEY ?? getDevConfig().workspaceKey;
  return (
    <TestManagerProvider workspaceKey={workspaceKey}>
      <TestRepository workspaceKey={workspaceKey} />
    </TestManagerProvider>
  );
};

export default React.memo(TestRepositoryPage);
