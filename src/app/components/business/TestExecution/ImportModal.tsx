import { Modal, Select } from 'antd';
import queryString from 'query-string';
import React from 'react';

import useI18n from '@/lib/hooks/useI18n';
import { getProximaBasePath, getTenantKey, inIframe } from '@/lib/utils/helper';
import { testConfigQuery } from '@/services/query';

import useRequest from './common/useRequest';
import { defaultFilterOptions } from './common/util';
import cx from './ExportModal.less';
const ImportModal = props => {
  const { t } = useI18n();

  const { onCancel } = props;
  const {
    selectedExecutionIds,
    selectedTestPlanIds,
    setSelectedTestPlanIds,
    testPlanList,
    setSelectedExecutionIds,
    executionList,
    workspaceKey,
  } = useRequest();
  const { data: queryRes } = testConfigQuery.useWorkspaceTestConfig({
    workspaceKey,
  }) as any;
  const { workspace } = queryRes || {};
  return (
    <Modal
      open={true}
      okButtonProps={{ disabled: !selectedExecutionIds.length }}
      okText={t('executionTaskImport.sure')}
      title={t('executionTaskImport.settings.title')}
      cancelText={t('executionTaskExport.cancel')}
      onOk={async () => {
        const baseUrl = getProximaBasePath() ? `${getProximaBasePath()}` : '/';
        const queryStr = queryString.stringify({
          app: 'test_manager',
          disableToggleWorkspace: true,
          hiddenItemType: true,
          validateRequired: true,
          ...(inIframe() && {
            hiddenSider: true,
            hiddenHeader: true,
          }),
          stepTitle: t('executionTaskImport.settings.title'),
          step1Tip: t('executionTaskImport.settings.tip'),
          step1BottomTip: t('executionTaskImport.settings.bottomTip'),
          disableMultiplySheet: true,
          disableHistoryFile: true,
          executionId: selectedExecutionIds[0],
          ignoreValidateItemTypeScheme: true,
          extendRow: true,
          planId: selectedTestPlanIds[0],
        });
        // 跳转到导入页面
        const href = `${baseUrl}/${getTenantKey()}/workspaces/${workspaceKey}/import/${
          workspace?.objectId
        }?${queryStr}`;
        window.open(href);
      }}
      onCancel={onCancel}
      maskClosable={false}
    >
      <div>
        <div>{t('executionTaskImport.testPlan')}</div>
        <Select
          showSearch
          getPopupContainer={() => document.body}
          className={cx('select')}
          value={selectedTestPlanIds}
          onChange={values => {
            setSelectedTestPlanIds([values]);
          }}
          filterOption={defaultFilterOptions}
        >
          {testPlanList.map(item => {
            return (
              <Select.Option key={item.id} value={item.id}>
                {item.name}
              </Select.Option>
            );
          })}
        </Select>
      </div>
      <div>
        <div className={cx('title')}>{t('executionTaskImport.testExecution')}</div>
        <Select
          showSearch
          getPopupContainer={() => document.body}
          className={cx('select')}
          onChange={values => {
            setSelectedExecutionIds([values]);
          }}
          filterOption={defaultFilterOptions}
        >
          {executionList.map(item => {
            return (
              <Select.Option key={item.id} value={item.id}>
                {item.name}
              </Select.Option>
            );
          })}
        </Select>
      </div>
    </Modal>
  );
};

export default ImportModal;
