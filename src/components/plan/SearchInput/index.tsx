import React from 'react';
import { Input } from '@osui/ui';
import { SearchOutlined } from '@/icons';
import { InputProps } from 'antd/lib/input/Input';

import cx from './index.less';

const SearchInput: React.FC<InputProps> = props => {
  const [inputVisible, setInputVisible] = React.useState(false);
  const inputValueRef = React.useRef('');

  const handleBlur = e => {
    setInputVisible(false);
    props.onBlur?.(e);
  };

  const handleChange = e => {
    const value = e.target.value;
    inputValueRef.current = value;
    props.onChange?.(value);
  };

  return (
    <div className={cx('search', props.className)}>
      {inputVisible ? (
        <Input
          {...props}
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
