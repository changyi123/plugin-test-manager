import React from 'react';

import { FieldProp } from '../types';

const Field: React.FC<FieldProp> = props => {
  return <div>{props?.value}</div>;
};

export default Field;
