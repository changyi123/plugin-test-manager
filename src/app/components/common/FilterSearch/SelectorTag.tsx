import { CloseOutlined } from '@ant-design/icons';
import { SelectCase } from '@/lib/utils/iql';
import cx from './SelectorTag.less';

import React, { useMemo } from 'react';
import { isArray } from 'lodash';
import { isDate } from '@/lib/utils/iql';
import dayjs from 'dayjs';
import { FILTER_EXPRESSIONS } from '@/lib/constants';

interface SelectorTagProps {
  data: SelectCase;
  onDelete: (id: string) => void;
  onClick: (data: SelectCase) => void;
  active?: boolean;
}
const SelectorTag: React.FC<SelectorTagProps> = ({ data, onDelete, onClick, active }) => {
  const { fieldName, value, component, fieldId, expression: _expression } = data;

  const [_value, count] = useMemo(() => {
    let content = null;
    let count = null;
    if (isDate(component)) {
      const dateValue =
        (value as string[])
          ?.map(item => item && dayjs(item).format('YYYY-MM-DD'))
          .filter(Boolean) || [];
      return [dateValue.join(' 至 '), 0];
    } else if (isArray(value)) {
      count = value.length > 1 ? value.length : 0;
      const [tagValue] = value;
      content =
        tagValue === 'NULL'
          ? '“-” 或 “无”'
          : tagValue?.nickname || tagValue?.fieldName || tagValue?.label || tagValue;
    } else {
      content = value;
    }
    return [content, count];
  }, [component, value]);

  const expressionText = useMemo(() => {
    const options = FILTER_EXPRESSIONS[component] || [];
    return options.find(item => item.value === _expression)?.label || null;
  }, [_expression, component]);

  return (
    <div className={cx('search-criteria', { active })}>
      {/* 挂载popover的节点 */}
      <span id={`filter-search-selector-${fieldId}`}></span>
      <div className={cx('search-tag')} onClick={() => onClick(data)}>
        <div className={cx('name')}>{fieldName}</div>
        {expressionText && <div className={cx('expression', 'ml4')}>{expressionText}</div>}
        {_value && _value !== 'NULL' && <div className={cx('value', 'ml4')}>{_value}</div>}
        {!!count && <div className={cx('count', 'ml4')}>+{count}</div>}
        <CloseOutlined
          className={cx('search-criteria-icon')}
          onClick={e => {
            e.stopPropagation();
            onDelete(fieldId);
          }}
        />
      </div>
    </div>
  );
};

export default SelectorTag;
