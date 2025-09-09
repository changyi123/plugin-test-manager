import { Button, Empty, Space } from 'antd';
import React from 'react';

import CreatePermission from '@/components/business/Contianer/CreatePermission';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/business/TestEntitySelectorModal';
import emptyImg from '@/icons/svg/empty-data.png';
import { TestType } from '@/lib/constants';
import { useBaseAction } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';

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
  const { testExecutionFieldKeys } = useBaseAction();

  return (
    <div className={cx('no-data-box')}>
      <Empty description={t('page.plan.planPageLayout.noData.description')} image={emptyImg}>
        <Space>
          <CreatePermission type={TestType.Execution}>
            <Button
              type="primary"
              onClick={async () => {
                createTestExecution();
              }}
            >
              {t('common.createTestExecution')}
            </Button>
          </CreatePermission>
          <CreatePermission type={TestType.Execution}>
            <Button
              type="primary"
              onClick={async () => {
                addExistedTestExecution();
              }}
            >
              {t('modules.panel.testPlan.testExecutionPanel.modelTitle')}
            </Button>
          </CreatePermission>
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
