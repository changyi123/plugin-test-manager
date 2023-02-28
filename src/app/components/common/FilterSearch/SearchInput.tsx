import React, { useCallback } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Input, InputProps } from 'antd';
import useI18n from '@/lib/hooks/useI18n';

import cx from './SearchInput.less';

interface FilterSearch extends Omit<InputProps, 'onChange'> {
  onChange: (value: string) => void;
}

const FilterSearch: React.VFC<FilterSearch> = ({ value, onChange, className, ...props }) => {
  const { t } = useI18n();
  const handleChange = useCallback(
    e => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div className={cx('filter-search', className)}>
      <Input
        {...props}
        placeholder={t('components.common.filterSearch.inputPlaceholder')}
        onChange={handleChange}
        value={value}
        maxLength={50}
      />
    </div>
  );
};

FilterSearch.defaultProps = {
  allowClear: true,
  name: 'name',
  suffix: <SearchOutlined />,
};

export default FilterSearch;
