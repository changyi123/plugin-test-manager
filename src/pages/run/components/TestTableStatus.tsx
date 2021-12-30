import React, { useCallback, useEffect, useContext } from 'react';
import { Dropdown, Menu, Spin, message } from '@osui/ui';
import { MenuInfo } from 'rc-menu/lib/interface';
import { colorArray, IColor } from './TestStatus';
import useMergedState from 'rc-util/lib/hooks/useMergedState';
import { updateTestStatus } from '@/lib/api/runs';
import { useRequest } from 'ahooks';
import { RunsContext } from '@/pages/panel/TestDetail/TestRunPanel';

import css from './TestStatus.less';

const TestTableStatus: React.FC<{
  status: IColor;
  testId: string;
  readonly?: boolean;
  change?: () => void;
}> = ({ status, testId, readonly = false, change }) => {
  const [itemStatus, setItemStatus] = useMergedState<IColor>(status, {
    value: status || 'todo',
  });

  const { run, loading, data } = useRequest(
    (testId: string, status: IColor) => updateTestStatus(testId, status),
    {
      manual: true,
    },
  );

  const { refresh } = useContext(RunsContext);

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
      setTimeout(() => {
        change && change();
        refresh && refresh();
      }, 200);
    },
    [testId, run, setItemStatus, refresh, change],
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
  return (
    <Dropdown overlay={menu} trigger={readonly ? [] : ['click']}>
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
