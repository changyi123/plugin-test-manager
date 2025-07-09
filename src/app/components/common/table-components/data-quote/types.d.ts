import type { SelectProps } from 'antd';
import type { ItemType, PointerObject, Workspace } from 'lib/types/models';
import React from 'react';

import type { CommonProps, FieldProps } from '../base-component/types';
import type { IParams } from '../hooks/useParamsAdapter';

export interface selectValue {
  label: React.ReactNode;
  value: string | number;
  disabled?: boolean;
  enable?: boolean;
  icon?: string;
  itemType?: PointerObject | ItemType;
  workspace?: PointerObject | Workspace;
  archived?: boolean;
  values?: {
    [propName: string]: any;
  };
  name?: string;
  key?: string;
}

type FieldType = {
  component: string;
  dataType?: string;
  defaultKey: FieldKey;
  description?: string;
  key: FieldKey;
  name: string;
  type: string;
  property?: Record<string, unknown>;
};

type CustomFieldType = {
  readonly?: boolean;
  hidden?: boolean;
  data?: Record<string, unknown>;
  name: string;
  fieldType?: Partial<FieldType>;
  property: Record<string, unknown>;
  description?: string;
  key: string;
  required: boolean;
};

export type DataQuoteBaseFieldProps = SelectProps<any> &
  FieldProps & {
    value?: string[] | number[] | Array<IParams>;
    options?: selectValue[];
    placeholder?: string;
    //mode?: 'single' | 'multiple'; // 单选多选
    onChange?: (e: any, option?: optionType | optionType[] | string) => void;
    onSelect?: (e: any, option: any) => void;
    onOptionsChange?: (options: any[]) => void;
    onBlur?: (e: any) => void;
    onClear?: () => void;
    fetchOptions?: (keywords: string, from?: number) => Promise<selectValue[]>;
    fetchValues?: (values: string[], key: string) => Promise<selectValue[]>;
    debounceTimeout?: number;
    useChange?: boolean; // 失焦或者切换传值
    expression?: string; // 表达式
    iql?: string; // 表达式
    iqlTemp?: string; // 表达式模板
    display?: string; // label的展现形式
    objectId?: string; // CustomField的objectId
    workspace?: string; // 所属空间 ID
    label?: string; // 标签
    valueDisplayWrap?: boolean; // value展示换行
    optionDisplayWrap?: boolean; // editMode时下拉框选中的值显示换行
    disabledSwr?: boolean;
    onlyValue?: boolean;
    fetchChange?: (value?: boolean) => void;
    displayValueHidden?: boolean; // 是否展示不存在的值
    disabledLineThrough?: boolean; // 是否需要将禁用的选项回显划横线
    fieldKey?: string;
    fieldTypeKey?: string;
    iqlKey?: string;
    fetchOnFocus?: boolean; // 是否focus时才请求数据
    clickFetch?: boolean; // 点击请求
    iqlToNeedMore?: boolean; // IQL 转换也需要查询更多信息
    itemId?: string; // 事项的objectId
  };

export type DataQuoteFieldProps = DataQuoteBaseFieldProps &
  CommonProps & {
    extend?: Record<string, any>;
    itemValues?: Record<string, any>;
    editorFieldKey?: string;
    customFieldsMap?: Record<string, CustomFieldType>;
    ancestors?: string[];
  };
