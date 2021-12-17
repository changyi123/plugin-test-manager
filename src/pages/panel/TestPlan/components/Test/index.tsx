import React from 'react';

import { useRequest } from 'ahooks';
import { TestRelationType } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import { getTestEntitiesByRelation } from '@/lib/api/common';
import DropDownButton from '@/components/panel/DropDownButton';

const Test = () => {
  const { testEntity } = useTestConfig();

  const { data: testDetailEntities } = useRequest(
    () => getTestEntitiesByRelation(TestRelationType.PlanRelDetail, { from: testEntity }),
    {},
  );

  console.info('testDetailEntities', testDetailEntities);

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
