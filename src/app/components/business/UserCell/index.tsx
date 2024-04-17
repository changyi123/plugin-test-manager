import { Row } from 'antd';
import classNames from 'classnames';
import React, { forwardRef } from 'react';

import BaseField from './BaseField';
import { BaseUserProps } from './BaseField';

export type UserProps = BaseUserProps & { overlayClsName?: string };
const User: React.ForwardRefRenderFunction<any, UserProps> = (props, ref) => {
  const { overlayClsName } = props;
  return (
    <Row ref={ref} className={classNames(overlayClsName, 'field-cell-layout')}>
      <BaseField {...props} apply="cell" />
    </Row>
  );
};

export default forwardRef(User);
