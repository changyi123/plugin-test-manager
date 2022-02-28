import React from 'react';
import { Button, Checkbox } from '@osui/ui';
import { UserOutlined, DeleteOutlined } from '@/icons';

import cx from './TableSelection.less';

const TableSelection = ({ selectedRowKeys, indeterminate, toggleAllRowsChecked, onDelete }) => {
  const selectedRowLength = selectedRowKeys?.length ?? 0;

  const handleCheckboxChange = e => {
    toggleAllRowsChecked(e.target.checked);
  };

  return (
    <div className={cx('table-selection')}>
      <Checkbox
        className={cx('checkbox')}
        indeterminate={indeterminate}
        onChange={handleCheckboxChange}
        checked={Boolean(selectedRowLength)}
      />
      <span>
        已选中 <span className={cx('num')}>{selectedRowLength}</span> 项
      </span>
      <span className={cx('line')} />
      <Button type="link" icon={<UserOutlined />}>
        负责人
      </Button>
      <Button
        onClick={() => onDelete(selectedRowKeys)}
        className={cx('delete')}
        type="link"
        icon={<DeleteOutlined />}
      >
        删除
      </Button>
    </div>
  );
};

export default TableSelection;
