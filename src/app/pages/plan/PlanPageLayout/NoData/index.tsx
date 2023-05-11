import React from 'react';
import { Button, Empty, Space } from 'antd';
import emptyImg from '@/icons/svg/empty-data.png';
import { useBaseAction } from '@/lib/hooks/useContext';
import { TestType } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/business/TestEntitySelectorModal';

import cx from './index.less';

interface NoDataProps {
  createTestExecution?: (val?: boolean) => void;
  addExistedTestExecution?: () => void;
  selectorModalRef?: React.MutableRefObject<SelectorActionType>;
}

const NoData: React.FC<NoDataProps> = ({
  createTestExecution,
  addExistedTestExecution,
  selectorModalRef,
}) => {
  const { t } = useI18n();
  const { getCreatePermission, testExecutionFieldKeys } = useBaseAction();

  return (
    <div className={cx('no-data-box')}>
      <Empty description={t('page.plan.planPageLayout.noData.description')} image={emptyImg}>
        <Space>
          <Button
            type="primary"
            disabled={getCreatePermission(TestType.Execution)}
            onClick={async () => {
              createTestExecution();
            }}
          >
            {t('common.createTestExecution')}
          </Button>

          <Button
            type="primary"
            disabled={getCreatePermission(TestType.Execution)}
            onClick={async () => {
              addExistedTestExecution();
            }}
          >
            {t('modules.panel.testPlan.testExecutionPanel.modelTitle')}
          </Button>
        </Space>
      </Empty>
      <TestEntitySelectorModal
        actionRef={selectorModalRef}
        title={t('modules.panel.testPlan.testExecutionPanel.modelTitle')}
        ignoreTestEntityIds={[]}
        tableFieldsKeys={testExecutionFieldKeys}
        width={800}
      />
    </div>
  );
};

export default NoData;
