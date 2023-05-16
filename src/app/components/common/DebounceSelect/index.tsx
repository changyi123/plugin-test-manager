import { Select, Spin } from 'antd';
import { SelectProps } from 'antd/es/select';
import { debounce, isObject, uniqWith } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import OverflowTooltip from '../OverflowTooltip';

const { Option } = Select;

const isObj = (val): boolean => isObject(val);

const noop = val => val;

export interface DebounceSelectProps<valueType = any>
  extends Omit<SelectProps<valueType>, 'options' | 'childern'> {
  fetchOptions: (search: string) => Promise<valueType[]>;
  fetchValues?: (values: string[] | valueType[]) => Promise<valueType[]>;
  debounceTimeout?: number;
  filterOptions?: (values: valueType[]) => valueType[];
}
function DebounceSelect<
  ValueType extends {
    key?: string;
    label: React.ReactNode;
    value: string | number;
    disabled?: boolean;
  } = any,
>({
  fetchOptions,
  filterOptions = noop,
  debounceTimeout = 800,
  fetchValues,
  value,
  onChange,
  ...props
}: DebounceSelectProps): React.ReactElement {
  const [fetching, setFetching] = useState(false);
  const [options, setOptions] = useState<ValueType[]>([]);
  const isInitialRef = useRef(false);
  const fetchRef = useRef(0);
  const initialOptionsRef = useRef<ValueType[]>([]);

  // 存储 options
  const saveInitialOptions = useCallback(options => {
    initialOptionsRef.current = uniqWith(
      initialOptionsRef.current.concat(options),
      (a, b) => a.value === b.value,
    );
    return initialOptionsRef.current;
  }, []);

  useEffect(() => {
    if (isInitialRef.current === false) {
      isInitialRef.current = true;
      setFetching(true);
      fetchOptions('').then(opts => {
        const options = saveInitialOptions(opts);
        setOptions(options);
        setFetching(false);
      });
    }
  }, [fetchOptions, fetchValues, saveInitialOptions]);

  // 处理回显
  useEffect(() => {
    if (value) {
      const expectedValue = Array.isArray(value) ? value : [value];
      const isNotExistedKeys = expectedValue.filter(val =>
        // 兼容value是对象数组
        initialOptionsRef.current.every(item => item.value !== (isObj(val) ? val.value : val)),
      );
      if (isNotExistedKeys.length) {
        fetchValues?.(isNotExistedKeys).then(notExistedOpts => {
          const options = saveInitialOptions(notExistedOpts);
          setOptions(options);
        });
      }
    }
  }, [value, setOptions, fetchValues, saveInitialOptions]);
  const debounceFetcher = useMemo(() => {
    const loadOptions = (keyword: string) => {
      fetchRef.current += 1;
      const fetchId = fetchRef.current;
      setOptions([]);
      setFetching(true);

      fetchOptions(keyword).then(newOptions => {
        if (fetchId !== fetchRef.current) {
          // for fetch callback order
          return;
        }

        setOptions(newOptions);
        setFetching(false);
      });
    };

    return debounce(loadOptions, debounceTimeout);
  }, [fetchOptions, debounceTimeout]);

  // 失焦后重置 option 选项
  const handleSearchInputBlur = useCallback(() => {
    if (initialOptionsRef.current) {
      setOptions(initialOptionsRef.current);
    }
  }, []);

  // 选中的 option 置顶
  const sortedOptions = useMemo(() => {
    return Array.isArray(value)
      ? filterOptions(options).sort(a => (value.includes(a.value) ? -1 : 1))
      : options;
  }, [options, value, filterOptions]);

  // 搜索结果拼接到 initialOptions 中
  useEffect(() => {
    if (Array.isArray(sortedOptions)) {
      saveInitialOptions(sortedOptions);
    }
  }, [saveInitialOptions, sortedOptions]);

  // 兼容处理 onchange options 参数不全的情况
  const handleSearchChange = useCallback(
    (value, item) => {
      if (Array.isArray(value) && Array.isArray(initialOptionsRef.current)) {
        const options = value.map(val => initialOptionsRef.current.find(opt => opt.value === val));
        onChange(value, options);
      } else {
        onChange(value, item);
      }
    },
    [onChange],
  );

  return (
    <Select<ValueType>
      filterOption={false}
      onSearch={debounceFetcher}
      onBlur={handleSearchInputBlur}
      notFoundContent={fetching ? <Spin size="small" /> : null}
      {...props}
      value={value}
      onChange={handleSearchChange}
    >
      {sortedOptions.map(option => {
        const { label, value, key, disabled, ...otherOptions } = option;
        return (
          <Option key={key || value} value={value} disabled={disabled} {...otherOptions}>
            <OverflowTooltip title={label as string} maxline={1}>
              {label}
            </OverflowTooltip>
          </Option>
        );
      })}
    </Select>
  );
}

export default DebounceSelect;
