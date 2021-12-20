import React, { useCallback, useEffect } from 'react';
import { Dropdown, Menu, Spin, message } from '@osui/ui';
import { MenuInfo } from 'rc-menu/lib/interface';
import { colorArray, IColor } from './TestStatus';
import useMergedState from 'rc-util/lib/hooks/useMergedState';
import { updateTestStatus } from '@/lib/api/runs';
import { useRequest } from 'ahooks';

import css from './TestStatus.less';

const TestTableStatus: React.FC<{ status: IColor; testId: string }> = ({ status, testId }) => {
  const [itemStatus, setItemStatus] = useMergedState<IColor>(status, {
    value: status,
  });

  const { run, loading, data } = useRequest(
    (testId: string, status: IColor) => updateTestStatus(testId, status),
    {
      manual: true,
    },
  );

  useEffect(() => {
    if (data && data.success) {
      message.success('操作成功');
    }
  }, [data]);

  const changeStatus = useCallback(
    (info: MenuInfo) => {
      const { key } = info;
      run(testId, key as IColor);
      setItemStatus(key as IColor);
    },
    [testId, run, setItemStatus],
  );

  const menu = (
    <Menu onClick={changeStatus}>
      {colorArray.map(item => {
        if (item.class === itemStatus) {
          return null;
        }
        return (
          <Menu.Item key={item.class}>
            <div className={[css('table-status'), css('now-status')].join(' ')}>
              <div className={[css('status-block'), css(item.class)].join(' ')}></div>
              <div className={[css('now-status__content')].join(' ')}>{item.label}</div>
            </div>
          </Menu.Item>
        );
      })}
    </Menu>
  );

  if (loading) {
    return <Spin tip="加载中..."></Spin>;
  }
  console.log('data', data);
  return (
    <Dropdown overlay={menu} trigger={['click']}>
      <div className={[css('table-status'), css('now-status')].join(' ')}>
        <div className={[css('status-block'), css(itemStatus)].join(' ')}></div>
        <div className={[css('now-status__content')].join(' ')}>
          {colorArray.find(item => item.class === itemStatus).label}
        </div>
      </div>
    </Dropdown>
  );
};

export default TestTableStatus;
