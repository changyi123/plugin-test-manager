import { CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { isArray } from 'lodash';
import React, { useMemo } from 'react';

import { FILTER_EXPRESSIONS } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';
import { SelectCase } from '@/lib/utils/iql';
import { isDate } from '@/lib/utils/iql';

import cx from './SelectorTag.less';

interface SelectorTagProps {
  data: SelectCase;
  onDelete?: (id: string) => void;
  onClick: (data: SelectCase) => void;
  active?: boolean;
  showCloseIcon?: boolean;
}
const SelectorTag: React.FC<SelectorTagProps> = ({
  data,
  onDelete,
  onClick,
  active,
  showCloseIcon = true,
}) => {
  const { t } = useI18n();
  const { fieldName, value, component, fieldId, expression: _expression } = data;

  const [_value, count] = useMemo(() => {
    let content = null;
    let count = null;
    if (isDate(component)) {
      const dateValue =
        (value as string[])
          ?.map(item => item && dayjs(item).format('YYYY-MM-DD'))
          .filter(Boolean) || [];
      return [dateValue.join(` ${t('components.common.filterSearch.to')} `), 0];
    } else if (isArray(value)) {
      count = value.length > 1 ? value.length : 0;
      const [tagValue] = value;
      content =
        tagValue === 'NULL'
          ? `“-” ${t('components.common.filterSearch.or')} “${t(
              'components.common.filterSearch.none',
            )}”`
          : tagValue?.nickname || tagValue?.fieldName || tagValue?.label || tagValue;
    } else {
      content = value;
    }
    return [content, count];
  }, [component, value, t]);

  const expressionText = useMemo(() => {
    const options = FILTER_EXPRESSIONS(t)[component] || [];
    return options.find(item => item.value === _expression)?.label || null;
  }, [_expression, component, t]);

  return (
    <div className={cx('search-criteria', { active })}>
      {/* 挂载popover的节点 */}
      <span id={`filter-search-selector-${fieldId}`}></span>
      <div className={cx('search-tag')} onClick={() => onClick(data)}>
        <div className={cx('name')}>{fieldName}</div>
        {expressionText && <div className={cx('expression', 'ml4')}>{expressionText}</div>}
        {_value && _value !== 'NULL' && <div className={cx('value', 'ml4')}>{_value}</div>}
        {!!count && <div className={cx('count', 'ml4')}>+{count}</div>}
        {showCloseIcon && (
          <CloseOutlined
            className={cx('search-criteria-icon')}
            onClick={e => {
              e.stopPropagation();
              onDelete?.(fieldId);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default SelectorTag;
