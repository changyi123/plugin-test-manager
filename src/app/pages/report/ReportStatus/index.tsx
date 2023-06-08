import React from 'react';

import useI18n from '@/lib/hooks/useI18n';

import cx from './index.less';

const ReportStatus: React.FC<{ status?: string }> = ({ status }) => {
  const { t } = useI18n();

  return <div className={cx('report-status', status)}>{t(`report.${status}`)}</div>;
};

export default React.memo(ReportStatus);
