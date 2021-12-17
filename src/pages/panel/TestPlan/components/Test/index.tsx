import React from 'react';
import DropDownButton from '@/components/panel/DropDownButton';

const Test = () => {
  const dropdownButtonMenuList = React.useMemo(() => {
    return [
      {
        title: '已存在的测试用例',
        onClick: () => {
          console.info(11);
        },
      },
    ];
  }, []);

  return (
    <div>
      <DropDownButton menuList={dropdownButtonMenuList}>添加测试用例</DropDownButton>
    </div>
  );
};

export default React.memo(Test);
