import { CloseOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import dayjs from 'dayjs';
import { isArray, isPlainObject } from 'lodash';
import React, { useMemo } from 'react';

import { FILTER_EXPRESSIONS } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';
import { getDateDisplayText, SelectCase } from '@/lib/utils/iql';
import { isDate } from '@/lib/utils/iql';

import cx from './SelectorTag.less';

interface SelectorTagProps {
  data: SelectCase;
  onDelete?: (id: string) => void;
  onClick: (data: SelectCase) => void;
  active?: boolean;
  showCloseIcon?: boolean;
  selectTagId?: string;
  disabled?: boolean;
}

const stopPropagation = e => e.stopPropagation();

const DropdownList = ({ list, t }) => {
  return (
    <div className={cx('dropdown-wrapper')} onClick={stopPropagation}>
      <div className={cx('dropdown-header')}>{t('components.common.filterSearch.selected')}</div>
      <div className={cx('dropdown-content')}>
        {list.map(item => (
          <span className={cx('dropdown-item')} key={item.value} title={item.label}>
            {item.workspaceName ? item.value : item.label}
          </span>
        ))}
      </div>
    </div>
  );
};
const SelectorTag: React.FC<SelectorTagProps> = ({
  data,
  onDelete,
  onClick,
  active,
  disabled,
  showCloseIcon = true,
  selectTagId = 'filter-search-selector',
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

  const menus = useMemo(() => {
    if (Array.isArray(value)) {
      return value
        .map(item => {
          if (isPlainObject(item)) {
            return {
              ...item,
              label: item?.nickname || item?.username || item?.label || item?.key || item?.value,
            };
          }
          const v = item === 'NULL' ? t('components.common.filterSearch.none') : item;
          return { value: v, label: v };
        })
        .filter(item => item.label);
    }
    return [];
  }, [value, t]);

  const expressionText = useMemo(() => {
    if (isDate(component)) {
      return getDateDisplayText(_expression, value as string[], t);
    }

    const keys = component === 'test_manager_status' ? ['Workspace', component] : [component];
    const options = keys.flatMap(key => FILTER_EXPRESSIONS(t)[key]).filter(Boolean) || [];
    return options.find(item => item.value === _expression)?.label || null;
  }, [_expression, component, t, value]);

  return (
    <div className={cx('search-criteria', { active, disabled })}>
      {/* 挂载popover的节点 */}
      <span
        id={`${selectTagId}-${fieldId}`}
        className={cx('test-manager-filter-popover-transparency')}
      ></span>
      <div className={cx('search-tag')} onClick={() => onClick(data)}>
        <div className={cx('name')}>{fieldName}</div>
        {expressionText && <div className={cx('expression', 'ml4')}>{expressionText}</div>}
        {!isDate(component) && _value && _value !== 'NULL' && (
          <div className={cx('value', 'ml4')} title={_value}>
            {_value}
          </div>
        )}
        {!!count && (
          <Dropdown arrow dropdownRender={() => <DropdownList t={t} list={menus} />}>
            <div className={cx('count', 'ml4')}>+{count}</div>
          </Dropdown>
        )}
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
