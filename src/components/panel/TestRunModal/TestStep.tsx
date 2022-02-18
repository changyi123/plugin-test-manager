import React from 'react';
import { Button } from '@osui/ui';
import { TabsComponentBaseProps } from './type';
import { StatusBadge } from '@/components/common/Status';
import { PlusOutlined } from '@/icons';

import cx from './TestStep.less';

type TestStepProps = TabsComponentBaseProps;

const TestStep: React.FC<TestStepProps> = ({ testRunData }) => {
  const steps = testRunData.runDetail?.steps ?? [];
  const [statusConfig, setStatusConfig] = React.useState({});
  const renderFieldValue = value => (value ? value : '-');

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
            <span className={cx('action')}>{step.action}</span>
            <span className={cx('status')}>
              <StatusBadge status={step.status} onReady={setStatusConfig} />
            </span>
          </div>
          <div className={cx('fields')}>
            <div>
              <span className={cx('label')}>预期：</span>
              <span className={cx('data')}>{renderFieldValue(step.result)}</span>
            </div>
            <div>
              <span className={cx('label')}>实际结果：</span>
              <span className={cx('data')}>{renderFieldValue(step.actualResult)}</span>
            </div>
            <div>
              <span className={cx('label')}>数据：</span>
              <span className={cx('data')}>{renderFieldValue(step.data)}</span>
            </div>
          </div>
          <div className={cx('defects')}>
            <span className={cx('label')}>缺陷（{step.defectItemIds?.length ?? 0}）</span>
            <Button type="link" className={cx('add-btn')}>
              <span>
                <PlusOutlined />
                添加缺陷
              </span>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default React.memo(TestStep);
