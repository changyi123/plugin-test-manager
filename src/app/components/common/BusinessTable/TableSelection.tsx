import { Checkbox, Tooltip } from 'antd';
import { CheckboxProps } from 'antd/lib/checkbox';
import { noop } from 'lodash';
import React from 'react';

import useI18n from '@/lib/hooks/useI18n';

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
  const { t } = useI18n();
  return (
    <div className={cx('table-selection', tableExpandable && 'table-expandable')}>
      {disableSelectAll ? null : (
        <>
          <Tooltip title={t('components.common.businessTable.checkAllPages')}>
            <Checkbox className={cx('checkbox')} {...checkboxProps} />
          </Tooltip>
          <span className={cx('checkbox-label')}>
            {t('components.common.businessTable.checkAllPages')}
          </span>
        </>
      )}

      <span className={cx('select')}>
        {t('common.checked')}
        <span className={cx('num')}>{selectNum ?? 0}</span>
        {t('common.item', { count: selectNum ?? 0 })}
      </span>
      <span className={cx('line')} />

      {actions.map((actionNode, index) => (
        <div className={cx('action', !selectNum && 'disabled')} key={index}>
          {actionNode}
        </div>
      ))}

      <span onClick={onClose} className={cx('cancel')}>
        {t('common.cancelAction')}
      </span>
    </div>
  );
};

export default TableSelection;
