import React from 'react';
import { noop } from 'lodash';
import { Checkbox, Tooltip } from 'antd';
import { CheckboxProps } from 'antd/lib/checkbox';

import cx from './TableSelection.less';

type TableSelectionProps = {
  selectNum?: number;
  onClose?: () => void;
  disableSelectAll?: boolean;
  tableExpandable?: boolean;
  actions: React.ReactNode[];
  checkboxProps?: CheckboxProps;
};

const TableSelection: React.FC<TableSelectionProps> = ({
  actions,
  selectNum,
  checkboxProps,
  onClose = noop,
  disableSelectAll = false,
  tableExpandable = false,
}) => {
  return (
    <div className={cx('table-selection', tableExpandable && 'table-expandable')}>
      {disableSelectAll ? null : (
        <>
          <Tooltip title="选中所有分页">
            <Checkbox className={cx('checkbox')} {...checkboxProps} />
          </Tooltip>
          <span className={cx('checkbox-label')}>选中所有分页</span>
        </>
      )}

      <span className={cx('select')}>
        已选中 <span className={cx('num')}>{selectNum ?? 0}</span> 项
      </span>
      <span className={cx('line')} />

      {actions.map((actionNode, index) => (
        <div className={cx('action', !selectNum && 'disabled')} key={index}>
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
