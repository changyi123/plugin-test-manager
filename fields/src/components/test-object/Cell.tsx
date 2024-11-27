import React, { FC, useMemo } from 'react';

import { CellProp } from '../types';

const Cell: FC<CellProp> = props => {
  const text = useMemo(
    () => (typeof props?.value === 'object' ? JSON.stringify(props?.value) : '-'),
    [props?.value],
  );
  return (
    <div className="field-cell-layout">
      <span className="tooltip-overflow tooltip-maxline-1" title={text}>
        {text}
      </span>
    </div>
  );
};

export default Cell;
