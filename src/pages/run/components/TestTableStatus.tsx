import React from 'react';
import { Dropdown, Menu } from '@osui/ui';
import { colorArray, IColor } from './TestStatus';

import css from './TestStatus.less';

const TestTableStatus: React.FC<{ readonly?: boolean; status: IColor }> = ({
  status,
  readonly = false,
}) => {
  const menu = (
    <Menu>
      {colorArray.map((item, index) => {
        if (item.class === status) {
          return null;
        }
        return (
          <Menu.Item key={index + 1}>
            <div className={[css('table-status'), css('now-status')].join(' ')}>
              <div className={[css('status-block'), css(item.class)].join(' ')}></div>
              <div className={[css('now-status__content')].join(' ')}>{item.label}</div>
            </div>
          </Menu.Item>
        );
      })}
    </Menu>
  );

  return (
    <Dropdown overlay={menu} trigger={readonly ? [] : ['click']}>
      <div className={[css('table-status'), css('now-status')].join(' ')}>
        <div className={[css('status-block'), css(status)].join(' ')}></div>
        <div className={[css('now-status__content')].join(' ')}>
          {colorArray.find(item => item.class === status).label}
        </div>
      </div>
    </Dropdown>
  );
};

export default TestTableStatus;
