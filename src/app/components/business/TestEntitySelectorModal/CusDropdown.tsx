import { Select } from 'antd';

import cx from './CusDropdown.less';

const CusDropdown = props => {
  const { disabled, option, onChange, value } = props || {};
  return (
    <Select
      style={{ width: 100 }}
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={option}
      className={cx('cusDropdown')}
    />
  );
};

export default CusDropdown;
