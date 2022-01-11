import React, { useState, useCallback, useEffect } from 'react';
import { Popover, Skeleton, Space, Typography, message, Popconfirm } from '@osui/ui';
import { ExclamationCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { deleteDefect, fetchDefectList } from '@/lib/api/runs';
import { useItemLinkTypeConfig } from './hooks';
import ItemIcon from './ItemIcon';

import css from './SmallDefectList.less';

interface ISmallDefectListProps {
  itemIds: string[];
  testId: string;
  save?: () => (value: string[]) => void;
  refreshNum?: number;
}

export const SmallDefectList: React.FC<ISmallDefectListProps> = props => {
  const { itemIds, testId, save } = props;
  const { TestToDefect = '' } = useItemLinkTypeConfig();
  const handleDeleteRelation = useCallback(
    (itemId: string) => {
      deleteDefect(TestToDefect, testId, [itemId]).then(() => {
        message.success('删除成功');
        const index = itemIds.findIndex(item => item === itemId);
        const itemIdsBak = [...itemIds];
        itemIdsBak.splice(index, 1);
        save && save()(itemIdsBak);
      });
    },
    [testId, save, itemIds, TestToDefect],
  );

  const { data, loading, error, refresh } = useRequest(() => fetchDefectList(props.itemIds));

  useEffect(() => {
    if (props.refreshNum > 1) {
      refresh();
    }
  }, [props.refreshNum, refresh]);
  if (loading) {
    return (
      <Space direction="vertical">
        <Skeleton.Button active={true} size="small" style={{ width: 200 }} />
        <Skeleton.Button active={true} size="small" style={{ width: 200 }} />
      </Space>
    );
  }
  if (error) {
    return <div>发生错误: {error.message}</div>;
  }
  const { items } = data;
  if (!items.length) {
    return <div></div>;
  }
  const open = (url: string) => window.open(url);

  return (
    <div className={css('list')}>
      {itemIds &&
        itemIds.map((itemId, index) => {
          const item = items.find(item => item.objectId === itemId);
          if (item) {
            return (
              <div key={index} className={css('list__item')}>
                <div className={css('list__item__detail')}>
                  <div className={css('img')}>
                    <ItemIcon src={item?.itemType?.icon} />
                  </div>
                  <div
                    className={css('key')}
                    onClick={() =>
                      open(`/osc/workspaces/${(item as any)?.workspace?.key}/item/${item?.key}`)
                    }
                  >
                    <Typography.Text ellipsis={{ tooltip: item.key }}>{item.key}</Typography.Text>
                  </div>
                  <div className={css('name')}>
                    <Typography.Text ellipsis={{ tooltip: item.name }}>{item.name}</Typography.Text>
                  </div>
                </div>
                <div className={css('list__item__handle')}>
                  <Popconfirm
                    getPopupContainer={() => document.getElementById('small_defect_list')}
                    title="当前操作会删除与该缺陷的关联关系，是否继续执行？"
                    onConfirm={() => handleDeleteRelation(item.objectId)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <DeleteOutlined />
                  </Popconfirm>
                </div>
              </div>
            );
          }
        })}
    </div>
  );
};

export const SmallDefectListPopover: React.FC<ISmallDefectListProps> = props => {
  const [refreshNum, setRefreshNum] = useState<number>(0);

  const handleVisibleChange = useCallback(
    (visible: boolean) => {
      if (visible) {
        setRefreshNum(refreshNum + 1);
      }
    },
    [refreshNum, setRefreshNum],
  );

  return (
    <div id="small_defect_list">
      <Popover
        getPopupContainer={() => document.getElementById('small_defect_list')}
        content={
          <SmallDefectList
            itemIds={props.itemIds}
            refreshNum={refreshNum}
            testId={props.testId}
            save={props.save}
          />
        }
        onVisibleChange={handleVisibleChange}
        trigger="click"
      >
        <div className={css('btn')}>
          <ExclamationCircleOutlined style={{ color: 'red' }} />
          <div>({props.itemIds.length})</div>
        </div>
      </Popover>
    </div>
  );
};

export default SmallDefectList;
