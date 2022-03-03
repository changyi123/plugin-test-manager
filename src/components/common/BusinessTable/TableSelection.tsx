import React from 'react';
import { noop } from 'lodash';
import { Checkbox } from '@osui/ui';

import cx from './TableSelection.less';

type TableSelectionProps = {
  onClose?: () => void;
  selectedRows?: unknown[];
  actions: React.ReactNode[];
  onCheck?: (visible: boolean) => void;
};

const TableSelection: React.FC<TableSelectionProps> = ({
  actions,
  onClose = noop,
  onCheck = noop,
  selectedRows,
}) => {
  const handleCheckboxChange = e => {
    onCheck(e.target.checked);
  };

  const checked = Boolean(selectedRows?.length);

  return (
    <div className={cx('table-selection')}>
      <Checkbox className={cx('checkbox')} onChange={handleCheckboxChange} checked={checked} />
      <span className={cx('select')}>
        已选中 <span className={cx('num')}>{selectedRows?.length ?? 0}</span> 项
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
