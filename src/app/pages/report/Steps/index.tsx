import React, { useMemo } from 'react';

import useI18n from '@/lib/hooks/useI18n';

import cx from './index.less';

type CreateReportStepsProps = {
  setCurrent?: (val: string) => void;
  current: string;
};

const CreateReportSteps: React.FC<CreateReportStepsProps> = ({ current }) => {
  const { t } = useI18n();

  const items = useMemo(
    () => [
      {
        key: '1',
        label: t('report.selectTemplate'),
      },
      {
        key: '2',
        label: t('report.selectRange'),
      },
    ],
    [t],
  );
  return (
    <div className={cx('steps')}>
      {items.map(item => (
        <div key={item.key} className={cx('step', current === item.key ? 'active' : '')}>
          <span className={cx('num')}>{item.key}</span>
          <span className={cx('label')}>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default React.memo(CreateReportSteps);
