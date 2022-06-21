import React from 'react';
import { noop } from 'lodash';
import { Input, Tooltip } from 'antd';
import { useDebounceFn } from 'ahooks';
import { SearchOutlined } from '@/icons';
import { InputProps } from 'antd/lib/input/Input';

import cx from './index.less';

const SearchInput: React.FC<
  InputProps & {
    text?: string;
    onChange?: (value: string) => void;
    onSearch?: (value: string) => void;
  }
> = props => {
  const inputValueRef = React.useRef('');
  const inputRef = React.useRef<any>(null);
  const { onSearch = noop, text, ...restInputProps } = props;
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
    if (e.key === 'Escape') {
      setInputVisible(false);
    }
  };

  return (
    <div className={cx('search', props.className)}>
      {inputVisible ? (
        <Input
          {...restInputProps}
          onBlur={handleBlur}
          ref={inputRef}
          className={cx('input')}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          defaultValue={inputValueRef.current}
        />
      ) : (
        <Tooltip title="搜索">
          <div
            onClick={() => {
              setInputVisible(true);
              setTimeout(() => {
                inputRef.current.focus();
              }, 300);
            }}
          >
            <SearchOutlined />
            {text ? <span className={cx('text')}>{text}</span> : null}
          </div>
        </Tooltip>
      )}
    </div>
  );
};

export default SearchInput;
