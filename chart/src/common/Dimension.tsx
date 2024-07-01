import { DefaultOptionType } from 'antd/lib/cascader';
import { Cascader, Select } from 'insight';
import { isEmpty } from 'lodash';
import { useI18n } from 'proxima-sdk/hooks/Hooks';
import {
  BASIC_BAR_CHART,
  BASIC_ITEM_STATISTICS_CHART,
  BASIC_PIE_CHART,
  BASIC_TABLE_CHART,
} from 'proxima-sdk/lib/Global';
import React, { FC, useMemo } from 'react';

import { GroupValue } from '../lib/type';
import cx from './Dimension.less';

// 显示统计周期的报表类型：类型占比、事项状态分布、多维表格、事项统计
const IntervalChartTypes = [
  BASIC_BAR_CHART,
  BASIC_ITEM_STATISTICS_CHART,
  BASIC_PIE_CHART,
  BASIC_TABLE_CHART,
];

export interface IOption {
  disabled?: boolean;
  value: string | number;
  label: string;
  children?: IOption[];
}
// 统计周期：天、周、月、季度、年
export const INTERVALS = ['day', 'week', 'month', 'quarter', 'year'] as const;
export type TInterval = (typeof INTERVALS)[number];
// 展示统计周期的FieldType
export const INTERVAL_FIELD_TYPES = ['Date', 'createdAt', 'updatedAt'];

export interface IIntervalOption extends IOption {
  value: TInterval | null;
}

// 自定义字段接口，后续考虑从App获取完整类型
interface ICustomField {
  key: string;
  name: string;
  fieldType: {
    key: string;
  };
}

// 选择项
type TSelectedOptions = [IOption, IOption];

interface IBaseProps {
  chartType: string;
  fields: ICustomField[];
  placeholder?: string;
}

interface MultipleProps extends IBaseProps {
  multiple: true;
  value: GroupValue[];
  onChange: (selectedOptions: TSelectedOptions[]) => void;
  disabled?: boolean;
}

interface SingleProps extends IBaseProps {
  multiple: false;
  value: GroupValue;
  onChange: (selectedOptions: TSelectedOptions) => void;
  disabled?: boolean;
}

type TDimensionProps = MultipleProps | SingleProps;

// 维度组件
export const Dimension: FC<TDimensionProps> = ({
  chartType,
  fields,
  value,
  onChange,
  multiple = false,
  placeholder,
  disabled,
}) => {
  const i18n = useI18n();
  const isInterval = useMemo(() => IntervalChartTypes.includes(chartType), [chartType]);
  const timeGroupOptions: IIntervalOption[] = useMemo(() => {
    const intervalMap: Record<TInterval, string> = {
      day: i18n.t('reportPlugin.common.interval.day'),
      week: i18n.t('reportPlugin.common.interval.week'),
      month: i18n.t('reportPlugin.common.interval.month'),
      quarter: i18n.t('reportPlugin.common.interval.quarter'),
      year: i18n.t('reportPlugin.common.interval.year'),
    };
    const newOptions: IIntervalOption[] = INTERVALS.map(interval => ({
      value: interval,
      label: intervalMap[interval],
    }));
    newOptions.unshift({
      disabled: true,
      value: null,
      label: i18n.t('reportPlugin.common.option.statisticalCycle'),
    });
    return newOptions;
  }, [i18n]);
  const options = useMemo(() => {
    if (isInterval) {
      return (
        fields?.map(field => {
          const item = { value: field.key, label: field.name, children: [] };
          if (INTERVAL_FIELD_TYPES.includes(field?.fieldType?.key)) {
            item.children = timeGroupOptions;
          } else {
            delete item.children;
          }
          return item;
        }) ?? []
      );
    } else {
      return fields.map(field => ({
        value: field.key,
        label: field.name,
      }));
    }
  }, [isInterval, fields, timeGroupOptions]);
  const currentValue = useMemo(() => {
    if (multiple) {
      return (
        (value as GroupValue[])?.map(v => {
          return v.key;
        }) || []
      );
    } else {
      const { key, interval } = (value as GroupValue) || {};
      return [key, interval].filter(Boolean);
    }
  }, [multiple, value]);

  const selectMode = useMemo(() => (multiple ? ({ mode: 'multiple' } as const) : {}), [multiple]);

  const filter = (inputValue: string, path: DefaultOptionType[]) =>
    path.some(
      option => (option.label as string).toLowerCase().indexOf(inputValue.toLowerCase()) > -1,
    );

  return (
    <div className={cx('dimension')}>
      {isInterval ? (
        <Cascader
          multiple={multiple}
          getPopupContainer={() => document.body}
          popupClassName={cx('time-selector')}
          value={currentValue as string[]}
          options={options}
          onChange={(_val, selectedOptions) => {
            onChange(selectedOptions);
          }}
          displayRender={label => {
            const [fieldLabel, intervalLabel] = label;
            return fieldLabel + (intervalLabel ? `（${intervalLabel}）` : '');
          }}
          placeholder={placeholder || i18n.t('reportPlugin.common.option.xAxisPlaceholder')}
          showSearch={{ filter }}
        />
      ) : (
        <Select
          {...selectMode}
          value={currentValue}
          options={options}
          onChange={(_val, opt) => {
            const selectedOptions = Array.isArray(opt) ? opt.filter(i => !isEmpty(i)) : [opt];
            onChange(selectedOptions as any);
          }}
          placeholder={placeholder || i18n.t('reportPlugin.common.option.xAxisPlaceholder')}
          optionFilterProp="children"
          maxTagCount={1}
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          disabled={disabled}
        />
      )}
    </div>
  );
};
