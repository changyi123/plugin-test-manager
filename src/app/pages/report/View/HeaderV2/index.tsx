import { useListener } from '@projectproxima/proxima-sdk-js';
import { Button, Space } from 'antd';
import { isEmpty } from 'lodash';
import React, { useCallback, useRef } from 'react';

import CreatePermission from '@/components/business/Contianer/CreatePermission';
import { ControlOutlined, PlusOutlined } from '@/icons';
import { TestExecutionModel, TestPlanModel, TestType } from '@/lib/constants';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { selectorToIql } from '@/lib/utils/iql';

import CreateReportModel, { ActionType } from '../../Model/createReportV2Model';
import ReportTemplateModal, {
  ActionType as ReportTemplateModalActionType,
} from '../../ReportTemplateModal';
import cx from './index.less';

const handleSelector = (selector, key) => {
  if (isEmpty(selector)) return null;
  const selectors = {} as Record<string, any>;
  if (selector) {
    // 处理测试用例库筛选字段
    selectors[key] = {
      ...selector,
      component: 'Dropdown',
      fieldName: 'id',
    };
  }
  return {
    ...selectors,
  };
};

const getReportOverviewData = selectors => {
  const getSelectorDataGetters = type => {
    switch (type) {
      case TestPlanModel:
        return selector => {
          if (!selector?.value) return null;
          return {
            testPlan: selector?.value?.map(i => i.value).filter(Boolean),
          };
        };
      case TestExecutionModel:
        return selector => {
          if (!selector?.value) return null;
          return {
            testExecution: selector?.value?.map(i => i.value).filter(Boolean),
          };
        };
      default:
        return selector => {
          if (!selector?.value) return null;
          return {
            [selector.key]: selector?.value?.map(i => i?.value ?? i?.id).filter(Boolean),
          };
        };
    }
  };

  return Object.values(selectors ?? {}).reduce((res: any, selector: any) => {
    return {
      ...res,
      ...(getSelectorDataGetters(selector.key)(selector) ?? {}),
    };
  }, {});
};

const ReportHeader: React.FC<any> = () => {
  const modalRef = useRef<ActionType>();
  const reportTemplateModalActionRef = useRef<ReportTemplateModalActionType>();
  const { createItemUseModal, globalTestConfig } = useBaseAction();
  const reportSelect = useRef();

  const { t } = useI18n();
  const { workspace, config } = useTestConfig();

  const createReport = useCallback(
    async (params?: unknown) => {
      const res: any = await modalRef.current.open(params);
      if (!res.template?.objectId) return;
      reportSelect.current = { ...res, currentStep: '2', init: true };

      const iqlMap = Object.entries(res.selectors ?? {}).reduce((prev, [key, value]: any[]) => {
        prev[value.key] = selectorToIql(
          [TestPlanModel, TestExecutionModel].includes(key)
            ? handleSelector(value, key)
            : { key: value },
        );
        return prev;
      }, {});

      return await createItemUseModal({
        type: TestType.Report,
        extraData: {
          fields: {
            reportOverviewData: getReportOverviewData(res.selectors),
            reportTemplate: res.template.objectId,
          },
          defectsMapping: config?.defectsMapping,
          iqlMap,
          templateId: res.template.objectId,
          isCustomCreateItem: true,
          isDisableCreateNext: true,
          isShowPrevButton: true,
          modalProps: {
            title: t('page.reportTemplateCreator.createReportModelTitle'),
            footer: {
              cancel: {
                name: t('common.prevStep'),
              },
            },
          },
        },
      });
    },
    [createItemUseModal, t, config?.defectsMapping],
  );

  const cancelCallback = useCallback(
    async params => {
      if (params?.type === 'prev') {
        await createReport(reportSelect.current);
      }
    },
    [createReport],
  );

  const openReportTemplateModal = () => {
    reportTemplateModalActionRef.current.open();
  };
  useListener('CreateItemModalPrev', cancelCallback);

  const enableWorkspaceReportTemplate = globalTestConfig?.enableWorkspaceReportTemplate ?? false;

  return (
    <>
      <div className={cx('report-header')}>
        <div className={cx('report-title')}>{t('common.testReport')}</div>
        <Space>
          {enableWorkspaceReportTemplate && (
            <Button icon={<ControlOutlined />} onClick={() => openReportTemplateModal()}>
              {t('report.templateSet')}
            </Button>
          )}
          <CreatePermission type={TestType.Report}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => createReport()}>
              {t('report.addReport')}
            </Button>
          </CreatePermission>
        </Space>
      </div>
      <ReportTemplateModal workspace={workspace} actionRef={reportTemplateModalActionRef} />
      <CreateReportModel actionRef={modalRef} workspace={workspace}></CreateReportModel>
    </>
  );
};

export default React.memo(ReportHeader);
