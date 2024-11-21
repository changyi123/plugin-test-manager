import React, { FC } from 'react';

import { CellProp } from '../types';

const Cell: FC<CellProp> = props => {
  return <span>{props.value}</span>;
};

export default Cell;
