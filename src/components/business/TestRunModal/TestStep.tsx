import React from 'react';
import { useHover, useUpdateEffect } from 'ahooks';
import { DeleteOutlined } from '@/icons';
import { Popconfirm, Empty } from 'antd';
import { updateTestRun } from '@/lib/api/runs';
import AddDefectButton from './AddDefectButton';
import { TabsComponentBaseProps } from './type';
import { useItemLinkTypeConfig } from './hooks';
import { escapeHtmlString } from '@/lib/utils/helper';
import { addDefect, deleteDefect } from '@/lib/api/runs';
import { StatusBadge } from '@/components/business/Status';
import Input from '@/components/business/TestStep/fields/Input';
import { generateStaticFileUrl } from '@/lib/utils/helper';

import cx from './TestStep.less';
import ExecutionEditor from './ExecutionEditor';

type TestStepProps = TabsComponentBaseProps;

const TestStep: React.FC<TestStepProps> = props => {
  const {
    testRunData,
    onDataChange,
    testRunEntity,
    allRelationDefects,
    onLoading,
    handleStatusChangeBySteps,
  } = props;
  const { TestToDefect = '' } = useItemLinkTypeConfig();
  const steps = testRunData.runDetail?.steps ?? [];
  const [statusConfig, setStatusConfig] = React.useState({});
  const renderFieldValue = value => (value ? escapeHtmlString(value) : '-');
  // 步骤状态更新标识，每次执行 set true，每次更新数据会 set false
  const [statusChangeBySteps, setStatusChangeBySteps] = React.useState(false);
  // 所有已关联的缺陷，测试执行内的缺陷只允许关联一次
  const allRelationDefectItemIds = allRelationDefects.map(defect => defect.itemId);

  // 添加缺陷
  const handleDefectAdd = async (stepId, defectItemIds) => {
    // onLoading();
    const needUpdateSteps = steps.map(step =>
      step.id === stepId ? { ...step, defectItemIds } : step,
    );
    await Promise.all([
      addDefect(TestToDefect, testRunData.objectId, defectItemIds),
      updateTestRun(testRunEntity, { steps: needUpdateSteps }),
    ]);
    onDataChange();
  };

  // 删除缺陷
  const handleDeleteDefect = async (stepId, defectItemId) => {
    onLoading();
    const needUpdateSteps = steps.map(step =>
      step.id === stepId
        ? { ...step, defectItemIds: step.defectItemIds.filter(itemId => itemId !== defectItemId) }
        : step,
    );

    await Promise.all([
      deleteDefect(TestToDefect, testRunData.objectId, [defectItemId]),
      updateTestRun(testRunEntity, { steps: needUpdateSteps }),
    ]);
    onDataChange();
  };

  // 状态变更
  const handleStatusChange = async (stepId, status) => {
    onLoading();
    const needUpdateSteps = steps.map(step => (step.id === stepId ? { ...step, status } : step));
    await updateTestRun(testRunEntity, { steps: needUpdateSteps });
    await onDataChange();
    setStatusChangeBySteps(true);
  };

  useUpdateEffect(() => {
    if (statusChangeBySteps && handleStatusChangeBySteps) {
      if (statusConfig?.[testRunData?.status]?.type === 'PASSED') {
        handleStatusChangeBySteps(statusConfig?.[testRunData?.status]);
      }
      setStatusChangeBySteps(false);
    }
  }, [handleStatusChangeBySteps]);

  // 实际结果变更
  const handleActualResultChange = async (stepId, actualResult) => {
    const needUpdateSteps = steps.map(step =>
      step.id === stepId ? { ...step, actualResult } : step,
    );

    await updateTestRun(testRunEntity, { steps: needUpdateSteps });
  };

  // 执行步骤评论变更
  const onCommentChange = async (val, stepId) => {
    const needUpdateSteps = steps.map(step =>
      step.id === stepId ? { ...step, comment: val } : step,
    );

    await updateTestRun(testRunEntity, { steps: needUpdateSteps });
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
          <img
            className={cx('defect-icon')}
            src={generateStaticFileUrl((item?.itemType as any)?.icon)}
          />
          <span className={cx('defect-key')}>{item.key}</span>
          <span>{item.name}</span>
          <Popconfirm
            okText="确定"
            cancelText="取消"
            getPopupContainer={() =>
              document.querySelector('[data-element-id="test-run-container"]')
            }
            title="当前操作会删除与该缺陷的关联关系，是否继续执行？"
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

  if (!steps.length)
    return <Empty style={{ marginTop: 60 }} description="当前测试执行无用例步骤" />;

  return (
    <div className={cx('step-list')}>
      <div className={cx('header', 'row')}>
        <span className={cx('position')}>#</span>
        <span className={cx('action')}>步骤</span>
        <span className={cx('status')}>步骤结果</span>
      </div>
      {steps.map((step, index) => (
        <div className={cx('step')} key={step.id}>
          <div className={cx('row')}>
            <span className={cx('position')}>
              <span
                className={cx('position-tip')}
                style={{ backgroundColor: statusConfig[step.status ?? 'TODO']?.color }}
              >
                {index + 1}
              </span>
            </span>
            <span className={cx('action')}>{renderFieldValue(step.action)}</span>
            <span className={cx('status')}>
              <StatusBadge
                showBg
                status={step.status}
                onReady={setStatusConfig}
                onStatusChange={status => handleStatusChange(step.id, status.key)}
              />
            </span>
          </div>
          <div className={cx('fields')}>
            <div className={cx('field')}>
              <span className={cx('label')}>预期：</span>
              <span className={cx('data')}>{renderFieldValue(step.result)}</span>
            </div>
            <div className={cx('field')}>
              <span className={cx('label')}>实际结果：</span>
              <span className={cx('input')}>
                <Input
                  placeholder="请输入实际结果"
                  value={step.actualResult}
                  maxLength={500}
                  onKeyDownEnter={value => handleActualResultChange(step.id, value)}
                  onChange={value => handleActualResultChange(step.id, value)}
                />
              </span>
            </div>
            <div className={cx('field')}>
              <span className={cx('label')}>数据：</span>
              <span className={cx('data')}>{renderFieldValue(step.data)}</span>
            </div>
          </div>
          <div className={cx('step-defects')}>
            <div className={cx('label')}>缺陷（{renderStepLength(step.defectItemIds)}）</div>
            {renderStepDefectList(step.id)}
            <AddDefectButton
              // plainStyle
              className={cx('add-btn')}
              testId={testRunData.objectId}
              currentDefectIds={step.defectItemIds}
              allRelationDefectIds={allRelationDefectItemIds}
              onSave={defectItemIds => handleDefectAdd(step.id, defectItemIds)}
              onLoading={onLoading}
            />
          </div>
          <div className={cx('comment')}>
            <ExecutionEditor
              value={step.comment}
              isStep={true}
              onCommentChange={val => onCommentChange(val, step.id)}
              {...props}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default React.memo(TestStep);
