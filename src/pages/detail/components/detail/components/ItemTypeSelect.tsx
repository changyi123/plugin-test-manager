import React, { FC } from 'react';
import { Select, Spin } from '@osui/ui';
import { SelectProps } from 'antd';
import { debounce } from 'lodash';

export interface DebounceSelectProps<ValueType = any>
  extends Omit<SelectProps<ValueType>, 'options' | 'children'> {
  fetchOptions: (itemTypeName: string, name?: string) => Promise<ValueType[]>;
  debounceTimeout?: number;
  itemTypeName?: string;
}

const DebounceSelect: FC<DebounceSelectProps> = ({
  fetchOptions,
  itemTypeName,
  debounceTimeout = 800,
  ...props
}) => {
  const [fetching, setFetching] = React.useState(false);
  const [options, setOptions] = React.useState([]);
  const fetchRef = React.useRef(0);

  const debounceFetcher = React.useMemo(() => {
    const loadOptions = (value: string) => {
      fetchRef.current += 1;
      const fetchId = fetchRef.current;
      setOptions([]);
      setFetching(true);

      fetchOptions(itemTypeName, value).then(newOptions => {
        if (fetchId !== fetchRef.current) {
          // for fetch callback order
          return;
        }
        const itemArray = newOptions.map(item => ({
          label: item.name,
          value: item.objectId,
        }));
        setOptions(itemArray);
        setFetching(false);
      });
    };

    return debounce(loadOptions, debounceTimeout);
  }, [fetchOptions, debounceTimeout, itemTypeName]);

  return (
    <Select
      filterOption={false}
      showSearch
      onSearch={debounceFetcher}
      notFoundContent={fetching ? <Spin size="small" /> : null}
      {...props}
      options={options}
    />
  );
};

export default DebounceSelect;
