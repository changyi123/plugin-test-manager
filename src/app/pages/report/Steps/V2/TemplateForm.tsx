import { Select, Tooltip } from 'antd';
import React, { useMemo, useState } from 'react';

import useI18n from '@/lib/hooks/useI18n';
import { getRootContainer } from '@/lib/utils/helper';
import { testConfigQuery } from '@/services/query';
import { useWorkspaceTemplateListQuery } from '@/services/testReport/query';

import { FormProps } from '../RangeForm';
import cx from './TemplateForm.less';

const TemplateForm: React.FC<FormProps> = ({ state, workspace }) => {
  const { t } = useI18n();

  const [selectStatus, setSelectStatus] = useState(undefined);

  const { data: globalConfig } = testConfigQuery.useGlobalTestConfig();

  const {
    data: { results: reportTemplateList },
    isLoading,
  } = useWorkspaceTemplateListQuery(
    globalConfig && {
      pagination: { limit: 999 },
      workspace: workspace?.objectId,
      onlyGlobalTemplate: !globalConfig?.extra?.enableWorkspaceReportTemplate,
      onlyEnabled: true,
    },
  );

  const templateList = useMemo(
    () =>
      reportTemplateList?.map(d => ({
        ...d,
        label: (
          <Tooltip title={!d.reportTemplate ? t('report.reportTemplateTooltip') : ''}>
            <div
              className={cx('option')}
              style={{ display: 'flex', justifyContent: 'space-between' }}
            >
              {d.name}
              <span className={cx('tag')}>
                {d.workspace ? t('report.workspaceTemplate') : t('report.globalTemplate')}
              </span>
            </div>
          </Tooltip>
        ),
        disabled: !d.reportTemplate,
        value: d.objectId,
        searchText: d.name,
      })),
    [reportTemplateList, t],
  );

  return (
    <>
      <div className={cx('form-box')}>
        <span className={cx('step-label', 'required')}>{t('report.choiceTemplate')}</span>
        {selectStatus === 'error' && <span className={cx('error')}>{t('report.required')}</span>}
        <div className={cx('step-cont')}>
          <Select
            className={cx('step-select')}
            placeholder={t('report.choiceTemplatePlaceholder')}
            defaultValue={state.template?.objectId}
            options={templateList}
            loading={isLoading}
            status={selectStatus}
            showSearch
            optionFilterProp="searchText"
            onChange={val => {
              state.template = templateList.find(d => d.value === val) ?? {};
            }}
            onBlur={() => {
              setSelectStatus(state.template?.objectId ? undefined : 'error');
            }}
            getPopupContainer={getRootContainer}
          ></Select>
        </div>
      </div>
    </>
  );
};

export default React.memo(TemplateForm);
