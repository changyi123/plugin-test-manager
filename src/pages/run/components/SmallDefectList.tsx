import React, { useState, useCallback, useEffect } from 'react';
import { Popover, Skeleton, Space, Typography, Modal, Popconfirm } from '@osui/ui';
import { ExclamationCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { getItemByIQL } from '@/lib/api/proxima';
import { getRootContainer } from '@/lib/utils/helper';

import css from './SmallDefectList.less';

interface ISmallDefectListProps {
  itemIds: string[];
  testId: string;
  save?: () => (value: string[]) => void;
  refreshNum?: number;
}

export const SmallDefectList: React.FC<ISmallDefectListProps> = props => {
  const { itemIds } = props;
  const handleDeleteRelation = useCallback((index: number) => {
    console.log('提交', index);
    console.log('props', props);
  }, []);

  const { data, loading, error, refresh } = useRequest(() =>
    getItemByIQL({ itemId: props.itemIds }),
  );

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
  console.log('items', items);

  return (
    <div className={css('list')}>
      {itemIds &&
        itemIds.map((itemId, index) => {
          const item = items.find(item => item.objectId === itemId);
          if (item) {
            return (
              <div key={index} className={css('list__item')}>
                <div className={css('list__item__detail')}>
                  <div className={css('img')}></div>
                  <div className={css('key')}>{item.key}</div>
                  <div className={css('name')}>
                    <Typography.Text ellipsis={{ tooltip: item.name }}>{item.name}</Typography.Text>
                  </div>
                </div>
                <div className={css('list__item__handle')}>
                  <Popconfirm
                    title="当前操作会删除与该缺陷的关联关系，是否继续执行？"
                    onConfirm={() => handleDeleteRelation(index)}
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
    <Popover
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
  );
};

export default SmallDefectList;
