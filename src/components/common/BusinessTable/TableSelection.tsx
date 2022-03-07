import React from 'react';
import { noop } from 'lodash';
import { Checkbox } from '@osui/ui';
import { CheckboxProps } from 'antd/lib/checkbox';

import cx from './TableSelection.less';

type TableSelectionProps = {
  selectNum?: number;
  onClose?: () => void;
  actions: React.ReactNode[];
  checkboxProps?: CheckboxProps;
};

const TableSelection: React.FC<TableSelectionProps> = ({
  actions,
  selectNum,
  onClose = noop,
  checkboxProps,
}) => {
  return (
    <div className={cx('table-selection')}>
      <Checkbox className={cx('checkbox')} {...checkboxProps} />
      <span className={cx('select')}>
        已选中 <span className={cx('num')}>{selectNum ?? 0}</span> 项
      </span>
      <span className={cx('line')} />

      {actions.map((actionNode, index) => (
        <div className={cx('action')} key={index}>
          {actionNode}
        </div>
      ))}

      <span onClick={onClose} className={cx('cancel')}>
        取消操作
      </span>
    </div>
  );
};

export default TableSelection;
