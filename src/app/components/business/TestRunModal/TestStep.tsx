import React, { useCallback } from 'react';
import { useDebounceFn, useHover, useReactive, useUpdateEffect } from 'ahooks';
import { DeleteOutlined } from '@/icons';
import { Popconfirm, Empty } from 'antd';
import AddDefectButton from './AddDefectButton';
import { TabsComponentBaseProps } from './type';
import { useItemLinkTypeConfig } from './hooks';
import { escapeHtmlString, goToItemDetailPage } from '@/lib/utils/helper';
import { StatusBadge, StatusList } from '@/components/business/Status';
import Input from '@/components/business/TestStep/fields/Input';
import { addTestDefect, deleteTestDefect, updateTestRunDetail } from '@/lib/api/item';
import ExecutionEditor from './ExecutionEditor';
import useI18n from '@/lib/hooks/useI18n';
import { components } from 'proxima-sdk';

const { ItemIcon } = components.Components.Common;

import cx from './TestStep.less';

type TestStepProps = TabsComponentBaseProps;

const TestStep: React.FC<TestStepProps> = props => {
  const {
    testRunData,
    onDataChange,
    testRunEntity,
    allRelationDefects,
    onLoading,
    handleStatusChangeBySteps,
    selectedTestPlanId,
  } = props;
  const { t } = useI18n();
  const { TestToDefect = '' } = useItemLinkTypeConfig();
  const [statusConfig, setStatusConfig] = React.useState({});
  const renderFieldValue = value => (value ? escapeHtmlString(value) : '-');
  // 步骤状态更新标识，每次执行 set true，每次更新数据会 set false
  const [statusChangeBySteps, setStatusChangeBySteps] = React.useState(false);
  // 所有已关联的缺陷，测试执行内的缺陷只允许关联一次
  const allRelationDefectItemIds = allRelationDefects.map(defect => defect.itemId);

  const state = useReactive({
    steps: testRunData?.runDetail?.steps ?? [],
  });

  // 添加缺陷
  const handleDefectAdd = async (stepId, defectItemIds) => {
    // onLoading();
    const needUpdateSteps = state.steps.map(step =>
      step.id === stepId ? { ...step, defectItemIds } : step,
    );
    await Promise.all([
      addTestDefect(TestToDefect, testRunData, defectItemIds),
      updateTestRunDetail(testRunEntity, { steps: needUpdateSteps, planId: selectedTestPlanId }),
    ]);
    onDataChange();
  };

  // 删除缺陷
  const handleDeleteDefect = async (stepId, defectItemId) => {
    onLoading();
    const needUpdateSteps = state.steps.map(step =>
      step.id === stepId
        ? { ...step, defectItemIds: step.defectItemIds.filter(itemId => itemId !== defectItemId) }
        : step,
    );

    await Promise.all([
      deleteTestDefect(TestToDefect, testRunData, [defectItemId]),
      updateTestRunDetail(testRunEntity, { steps: needUpdateSteps, planId: selectedTestPlanId }),
    ]);
    onDataChange();
  };

  // 状态变更
  const handleStatusChange = async (stepId, status) => {
    onLoading();
    const needUpdateSteps = state.steps.map(step =>
      step.id === stepId ? { ...step, status } : step,
    );
    state.steps = needUpdateSteps;
    await updateTestRunDetail(testRunEntity, {
      steps: needUpdateSteps,
      planId: selectedTestPlanId,
    });
    await onDataChange();
    setStatusChangeBySteps(true);
  };

  React.useEffect(() => {
    state.steps = testRunData?.runDetail?.steps;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testRunData?.runDetail?.steps]);

  useUpdateEffect(() => {
    if (statusChangeBySteps && handleStatusChangeBySteps) {
      if (statusConfig?.[testRunData?.status]?.type === 'PASSED') {
        handleStatusChangeBySteps(statusConfig?.[testRunData?.status]);
      }
      setStatusChangeBySteps(false);
    }
  }, [handleStatusChangeBySteps]);

  // 实际结果变更
  const handleActualResultChange = useCallback(
    async (stepId, actualResult) => {
      const needUpdateSteps = state.steps.map(step =>
        step.id === stepId ? { ...step, actualResult } : step,
      );

      state.steps = needUpdateSteps;

      await updateTestRunDetail(testRunEntity, { steps: needUpdateSteps });
    },
    [state, testRunEntity],
  );

  const { run: changeSteps } = useDebounceFn(handleActualResultChange, {
    wait: 500,
  });

  // 执行步骤评论变更
  const onCommentChange = async (val, stepId) => {
    const needUpdateSteps = state.steps.map(step =>
      step.id === stepId ? { ...step, comment: val } : step,
    );

    await updateTestRunDetail(testRunEntity, { steps: needUpdateSteps });
    await onDataChange();
  };

  // 步骤缺陷渲染
  const renderStepDefectList = stepId => {
    const relationDefectItems = allRelationDefects.filter(item => item.stepId === stepId);
    if (!relationDefectItems.length) return null;

    const DefectItem: React.FC<{ item: any; itemId: string }> = ({ item, itemId }) => {
      const ref = React.useRef();
      const isHover = useHover(ref);
      return (
        <div ref={ref} className={cx('defect', isHover && 'hover')}>
          <ItemIcon className={cx('defect-icon')} icon={(item?.itemType as any)?.icon}></ItemIcon>
          <a
            className={cx('link')}
            onClick={() => {
              goToItemDetailPage({
                workspaceKey: (item.workspace as any)?.key,
                itemKey: item.key,
              });
            }}
          >
            <span className={cx('defect-key')}>{item.key}</span>
            {item.name}
          </a>
          <Popconfirm
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
            getPopupContainer={() =>
              document.querySelector('[data-element-id="test-run-container"]')
            }
            title={t('components.business.testRunModal.defectList.deleteButtonTips')}
            onConfirm={() => handleDeleteDefect(stepId, item.objectId ?? itemId)}
          >
            <a style={{ display: isHover ? 'block' : 'none' }}>
              <DeleteOutlined />
            </a>
          </Popconfirm>
        </div>
      );
    };

    return (
      <div className={cx('defects')}>
        {relationDefectItems.map(data => (
          <DefectItem key={data.itemId} itemId={data.itemId} item={data.item ?? {}} />
        ))}
      </div>
    );
  };

  const renderStepLength = (defectItemIds: string[]) => {
    return (
      defectItemIds?.filter(id => allRelationDefects.some(item => item.itemId === id)).length ?? 0
    );
  };

  if (!state.steps?.length)
    return (
      <Empty
        style={{ marginTop: 60 }}
        description={t('components.business.testRunModal.testStep.noSteps')}
      />
    );

  return (
    <div className={cx('step-list')}>
      <div className={cx('header', 'row')}>
        <span className={cx('position')}>#</span>
        <span className={cx('action')}>{t('components.business.testRunModal.testStep.step')}</span>
        <span className={cx('status')}>
          {t('components.business.testRunModal.testStep.stepResult')}
        </span>
      </div>
      {state.steps.map((step, index) => (
        <div className={cx('step')} key={step.id}>
          <div className={cx('row')}>
            <span className={cx('position')}>
              <span className={cx('position-tip')}>{index + 1}</span>
            </span>
            <span className={cx('action')}>{renderFieldValue(step.action)}</span>
            <span className={cx('status')}>
              <div className={cx('status-selector')}>
                <StatusList
                  onStatusChange={status => handleStatusChange(step.id, status.key)}
                  status={step.status}
                />
              </div>
              <StatusBadge
                className={cx('status-box')}
                showBg
                hideIcon
                status={step.status}
                onReady={setStatusConfig}
                readonly
              />
            </span>
          </div>
          <div className={cx('fields')}>
            <div className={cx('field')}>
              <span className={cx('label')}>
                {t('components.business.testRunModal.testStep.expect')}：
              </span>
              <span className={cx('data')}>{renderFieldValue(step.result)}</span>
            </div>
            <div className={cx('field')}>
              <span className={cx('label')}>
                {t('components.business.testRunModal.testStep.result')}：
              </span>
              <span className={cx('input')}>
                <Input
                  placeholder={t('components.business.testRunModal.testStep.resultPlaceholder')}
                  value={step.actualResult}
                  maxLength={2000}
                  onKeyDownEnter={value => changeSteps(step.id, value)}
                  onChange={value => changeSteps(step.id, value)}
                />
              </span>
            </div>
            <div className={cx('field')}>
              <span className={cx('label')}>
                {t('components.business.testRunModal.testStep.data')}：
              </span>
              <span className={cx('data')}>{renderFieldValue(step.data)}</span>
            </div>
          </div>
          <div className={cx('step-defects')}>
            <div className={cx('label')}>
              {t('components.business.testRunModal.testStep.defect')}（
              {renderStepLength(step.defectItemIds)}）
            </div>
            {renderStepDefectList(step.id)}
            <AddDefectButton
              // plainStyle
              className={cx('add-btn')}
              testRunEntity={testRunEntity}
              currentDefectIds={step.defectItemIds}
              allRelationDefectIds={allRelationDefectItemIds}
              onSave={defectItemIds => handleDefectAdd(step.id, defectItemIds)}
              onLoading={onLoading}
            />
          </div>
          <div className={cx('comment')}>
            <ExecutionEditor
              {...props}
              value={step.comment}
              onCommentChange={val => onCommentChange(val, step.id)}
              name={step.id}
              isStep={true}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default React.memo(TestStep);
