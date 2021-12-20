import React, { useState, useEffect, useCallback } from 'react';
import { Tooltip, Divider, Button, Space, message, Spin } from '@osui/ui';
import css from './TestStatus.less';
import { useRequest } from 'ahooks';
import { updateTestStatus } from '@/lib/api/runs';

export type IColor = 'todo' | 'ing' | 'fail' | 'pass';

export interface IStatusColor {
  class: IColor;
  label: string;
}

export const colorArray: Array<IStatusColor> = [
  {
    class: 'todo',
    label: '未开始',
  },
  {
    class: 'ing',
    label: '正在执行',
  },
  {
    class: 'fail',
    label: '失败',
  },
  {
    class: 'pass',
    label: '通过',
  },
];

const TestStatus: React.FC<{ status: IColor; testId: string }> = ({ status, testId }) => {
  const [currentColor, setCurrentColor] = useState<IColor>(status);
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
    (key: IColor) => {
      run(testId, key);
      setCurrentColor(key as IColor);
    },
    [testId, run, setCurrentColor],
  );

  if (loading) {
    return <Spin tip="改变中..."></Spin>;
  }

  return (
    <div className={css('run__header__status')}>
      <div className={css('run__header__status__content')}>
        <div className={css('now-status')}>
          <div className={css('now-status__label')}>当前状态</div>
          <div className={[css('status-block'), css(currentColor)].join(' ')}></div>
          <div className={[css('now-status__content')].join(' ')}>
            {colorArray.find(item => item.class === currentColor).label}
          </div>
        </div>

        <Divider type="vertical" />

        <div className={css('had-status')}>
          <Space>
            {colorArray.map(item => {
              if (item.class === currentColor) {
                return null;
              }
              return (
                <Tooltip key={item.class} title={`设置该测试用例${item.label}`}>
                  <Button
                    onClick={() => changeStatus(item.class)}
                    className={[css(`btn-${item.class}`)].join(' ')}
                  >
                    {item.label}
                  </Button>
                </Tooltip>
              );
            })}
          </Space>
        </div>
      </div>
    </div>
  );
};

export default TestStatus;
