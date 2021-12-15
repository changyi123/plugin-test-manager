import React, { useState } from 'react';
import { Tooltip, Divider, Button, Space } from '@osui/ui';
import css from './TestStatus.less';

export type IColor = 'todo' | 'ing' | 'fail' | 'pass';

export interface IStatusColor {
  class: IColor;
  label: string;
}

const TestStatus: React.FC = () => {
  const [currentColor, setCurrentColor] = useState<IColor>('todo');
  const colorArray: Array<IStatusColor> = [
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
                  <Button className={[css(`btn-${item.class}`)].join(' ')}>{item.label}</Button>
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
