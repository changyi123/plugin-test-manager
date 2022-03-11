import React from 'react';
import { noop } from 'lodash';
import { useDebounceFn } from 'ahooks';
import { SearchOutlined } from '@/icons';
import { Input, Tooltip } from '@osui/ui';
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
    if (!e.target.value) {
      setInputVisible(false);
    }
    props.onBlur?.(e);
  };

  const handleChange = e => {
    const value = e.target.value;
    inputValueRef.current = value;
    props.onChange?.(value);
    handleSearch(value);
  };

  const handleKeyDown = e => {
    if (e.key === 'Escape' || e.key === 'Enter') {
      setInputVisible(false);
    }
  };

  return (
    <div className={cx('search', props.className)}>
      {inputVisible ? (
        <Input
          {...restInputProps}
          onBlur={handleBlur}
          className={cx('input')}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          defaultValue={inputValueRef.current}
        />
      ) : (
        <Tooltip title="搜索">
          <SearchOutlined onClick={() => setInputVisible(true)} />
        </Tooltip>
      )}
    </div>
  );
};

export default SearchInput;
