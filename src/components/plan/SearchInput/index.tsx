import React from 'react';
import { noop } from 'lodash';
import { Input } from '@osui/ui';
import { useDebounceFn } from 'ahooks';
import { SearchOutlined } from '@/icons';
import { InputProps } from 'antd/lib/input/Input';

import cx from './index.less';

const SearchInput: React.FC<
  InputProps & {
    onSearch?: (value: string) => void;
  }
> = props => {
  const inputValueRef = React.useRef('');
  const { onSearch = noop, ...restInputProps } = props;
  const [inputVisible, setInputVisible] = React.useState(false);

  const { run: handleSearch } = useDebounceFn(onSearch, {
    wait: 1000,
  });

  const handleBlur = e => {
    setInputVisible(false);
    props.onBlur?.(e);
  };

  const handleChange = e => {
    const value = e.target.value;
    inputValueRef.current = value;
    props.onChange?.(value);
    handleSearch(value);
  };

  return (
    <div className={cx('search', props.className)}>
      {inputVisible ? (
        <Input
          {...restInputProps}
          onBlur={handleBlur}
          className={cx('input')}
          onChange={handleChange}
          defaultValue={inputValueRef.current}
        />
      ) : (
        <SearchOutlined onClick={() => setInputVisible(true)} />
      )}
    </div>
  );
};

export default SearchInput;
