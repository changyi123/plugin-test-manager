import { Popover } from 'antd';
import React, { FC } from 'react';

import { CellProp } from '../types';

const Content = props => {
  console.info('props', props);
  return <div>123</div>;
};

const Cell: FC<CellProp> = props => {
  return (
    <div className="field-cell-layout">
      <Popover trigger={['click']} content={<Content {...props} />}>
        <span
          className="tooltip-overflow tooltip-maxline-1"
          style={{ cursor: 'pointer' }}
          title={props?.value}
        >
          {props?.value}
        </span>
      </Popover>
    </div>
  );
};

export default Cell;
