import React, { useCallback } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Input, InputProps } from 'antd';

import cx from './SearchInput.less';

interface FilterSearch extends Omit<InputProps, 'onChange'> {
  onChange: (value: string) => void;
}

const FilterSearch: React.VFC<FilterSearch> = ({ value, onChange, className, ...props }) => {
  const handleChange = useCallback(
    e => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div className={cx('filter-search', className)}>
      <Input {...props} onChange={handleChange} value={value} maxLength={50} />
    </div>
  );
};

FilterSearch.defaultProps = {
  placeholder: '请输入标题关键字',
  allowClear: true,
  name: 'name',
  suffix: <SearchOutlined />,
};

export default FilterSearch;
