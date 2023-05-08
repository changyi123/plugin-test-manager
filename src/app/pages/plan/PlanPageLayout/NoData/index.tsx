import React, { useMemo } from 'react';
import { Dropdown, Empty, Menu } from 'antd';
import emptyImg from '@/icons/svg/empty-data.png';
import { useBaseAction } from '@/lib/hooks/useContext';
import { TestType } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/business/TestEntitySelectorModal';
import { DownOutlined } from '@ant-design/icons';

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

  const itemsList = useMemo(
    () => (
      <Menu>
        <Menu.Item key="create" disabled={getCreatePermission(TestType.Execution)}>
          <a onClick={() => createTestExecution()}>{t('common.createTestExecution')}</a>
        </Menu.Item>
        <Menu.Item key="link" disabled={getCreatePermission(TestType.Execution)}>
          <a onClick={addExistedTestExecution}>
            {t('modules.panel.testPlan.testExecutionPanel.modelTitle')}
          </a>
        </Menu.Item>
      </Menu>
    ),
    [addExistedTestExecution, createTestExecution, getCreatePermission, t],
  );
  return (
    <div className={cx('no-data-box')}>
      <Empty description={t('page.plan.planPageLayout.noData.description')} image={emptyImg}>
        <Dropdown.Button
          type="primary"
          onClick={() => createTestExecution()}
          icon={<DownOutlined />}
          overlay={itemsList}
          trigger={['hover']}
        >
          {t('common.createTestExecution')}
        </Dropdown.Button>
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
