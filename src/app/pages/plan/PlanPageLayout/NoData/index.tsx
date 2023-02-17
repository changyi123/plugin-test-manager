import React from 'react';
import { Button, Empty } from 'antd';
import emptyImg from '@/icons/svg/empty-data.png';
import { useBaseAction } from '@/lib/hooks/useContext';
import { TestType } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';

import cx from './index.less';

interface NoDataProps {
  createTestExecution?: (val?: boolean) => void;
}

const NoData: React.FC<NoDataProps> = ({ createTestExecution }) => {
  const { t } = useI18n();
  const { getCreatePermission } = useBaseAction();
  return (
    <div className={cx('no-data-box')}>
      <Empty description={t('page.plan.planPageLayout.noData.description')} image={emptyImg}>
        <Button
          type="primary"
          disabled={getCreatePermission(TestType.Execution)}
          onClick={async () => {
            createTestExecution();
          }}
        >
          {t('common.createTestExecution')}
        </Button>
      </Empty>
    </div>
  );
};

export default NoData;
