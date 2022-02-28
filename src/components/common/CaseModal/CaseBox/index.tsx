/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { FC, useState } from 'react';
import cx from './index.less';
import { Tree } from '@osui/ui';
import CommonTable from '@/components/common/CommonTable';
import { useMount, useUpdateEffect, useReactive } from 'ahooks';
import { traverseTreeNodes } from '../utils';
import { AutoComplete } from 'antd';
import { SearchOutlined, CheckOutlined } from '@ant-design/icons';
import { FolderOutlined } from '@ant-design/icons';
import { ModalType } from '@/lib/constants';
export interface DataType {
  key: React.Key;
  name: string;
  level: number;
  selected: boolean;
}
type ItemType = {
  value: string;
  key: string;
};

interface RowSelection {
  onChange: (selectedRowKeys: React.Key[], selectedRows: DataType[]) => void;
  getCheckboxProps: (record: DataType) => void;
  onSelectAll: (selected, selectedRows, changeRows) => void;
}

interface BoxItem {
  tree: any[];
  onExpand: (expandedKeysValue: React.Key[]) => void;
  onCheck: (checkedKeysValue: any, info: any) => void;
  onSelect: (selectedKeysValue: React.Key[], info: any) => void;
  expandedKeys: React.Key[];
  checkedKeys: any; //todo:将checkedKeys细粒度操作
  selectedKeys: React.Key[];
  autoExpandParent: boolean;
  tableData: any[];
  rowSelection: RowSelection; //table的checked框
  selectedRowKeys?: string[];
  type: number;
  onRow?: (text: string, record: any, index: any) => any;
  clickIndex?: any;
}
//copy的时候数据变化
export const deepCloneTree = function (data) {
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

const CaseBox: FC<BoxItem> = ({
  tree,
  onExpand,
  onCheck,
  onSelect,
  expandedKeys,
  checkedKeys,
  selectedKeys,
  autoExpandParent,
  tableData,
  rowSelection,
  selectedRowKeys,
  type,
  clickIndex,
  onRow,
}) => {
  const [sortOrderTest, setSortOrderTest] = useState<string>('descend');
  const columns = [
    {
      title: `共${tableData.length}条案例`,
      dataIndex: 'title',
    },
    {
      title: () => {
        const title = sortOrderTest == 'descend' ? '最晚' : '最早';
        return title;
      },
      dataIndex: 'sort',
      width: 80,
      showSorterTooltip: false,
      sortOrder: sortOrderTest,
      sortDirections: ['descend', 'ascend'],
      sorter: (a, b) => {
        const aTime = new Date(a.createdAt).getTime(); // 需要先转换成时间戳
        const bTime = new Date(b.createdAt).getTime();
        return aTime - bTime;
      },
      render: (text, record, index) => {
        //--index
        if (type == ModalType.ModalInherit) {
          if (clickIndex == index) {
            return <CheckOutlined style={{ color: '#0C62FF' }} />;
          }
        }
      },
    },
  ];

  const selectionType = 'checkbox';
  const state = useReactive({
    treed: [], //tree data
    options: [], //选项默认为空
    newTreed: [], //选中处理
    selectNodes: [], //所有的树节点
    state: '排序',
    table: [],
  });

  useMount(() => {
    //状态
    //初始化走这儿
    changeData(tree);
    searchData(tree); //将tree给到它，内部操作
    changeTableData(tableData);
  });

  useUpdateEffect(() => {
    changeData(tree);
    searchData(tree);
    changeTableData(tableData);
  }, [tree, checkedKeys, tableData]);

  const changeData = function (tree) {
    //将ES6 proxy转化为普通js对象，洗一遍数据
    const list = JSON.stringify(tree);
    const mutableTree = JSON.parse(list);
    //add file icon
    const ntree = deepCloneTree(mutableTree);
    state.treed = ntree;
  };

  function changeTableData(tableData) {
    const table = [];
    tableData.forEach(item => {
      item.title = item?.reference?.title ?? '--该事项已被删除--';
      table.push(item);
    });
    state.table = table;
  }

  const onChange = (data: string) => {
    const nt = state.selectNodes.filter(item => item.title == data);
    state.newTreed = nt;
  };

  function onTableChange(pagination, filters, sorter, extra) {
    // console.log('params', pagination, filters, sorter, extra);
    setSortOrderTest(sorter.order || 'descend');
  }
  const searchData = function (tree) {
    const options = [];
    const nodes = [];
    traverseTreeNodes(tree, node => {
      //我们只拿一个key，一个value自己拼接把
      const item: ItemType = { value: '', key: '' };
      item.value = node.name;
      item.key = node.key;
      options.push(item);
      nodes.push(node);
    });
    //todo:node选中和tree的联动
    state.options = options;
    state.selectNodes = nodes;
  };

  //内部还需要一个检索，用于
  /*-- table --*/
  return (
    <div className={cx('case_box')}>
      <span className={cx('case_left')}>
        {/* 搜索分组 */}
        <span className={cx('case_ac')}>
          <span className={cx('searchIcon')} style={{ width: 16 }}>
            <SearchOutlined style={{ color: '#878C96' }} />
          </span>
          <span id="case_search_auto" className={cx('searchAuto')}>
            {/* 搜索框 */}
            <AutoComplete
              style={{ width: 158 }}
              options={state.options}
              getPopupContainer={() => document.getElementById('case_search_auto')}
              placeholder="&nbsp;&nbsp; 搜索分组"
              filterOption={(inputValue, option) =>
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                option.value.indexOf(inputValue) !== -1
              }
              onChange={onChange}
            />
          </span>
        </span>
        <span className={cx('case_line')}></span>

        {/* tree */}
        <span className={cx('case_sub_select')}>
          {state.treed && state.treed.length > 0 ? (
            <Tree
              checkable={type == ModalType.ModalInherit ? false : true} /* 加上选择框 */
              checkStrictly={type == ModalType.ModalInherit ? false : true} /* 加上选中可控 */
              onExpand={onExpand}
              showIcon
              expandedKeys={expandedKeys}
              autoExpandParent={autoExpandParent}
              onCheck={onCheck}
              checkedKeys={checkedKeys}
              onSelect={onSelect}
              selectedKeys={selectedKeys}
              treeData={state.newTreed.length > 0 ? state.newTreed : state.treed}
              defaultExpandAll={false}
            />
          ) : (
            <span>&nbsp;&nbsp;loading</span>
          )}
        </span>
      </span>
      <div className={cx('case_right')}>
        {/* 这里放table ,将commonTable提出来*/}
        <CommonTable
          rowSelection={
            type == ModalType.ModalInherit
              ? false
              : {
                  selectedRowKeys: selectedRowKeys,
                  type: selectionType,
                  ...rowSelection,
                }
          }
          columns={columns}
          dataSource={state.table}
          pagination={false}
          onChange={onTableChange}
          onRow={onRow}
        />
      </div>
    </div>
  );
};

export default CaseBox;
