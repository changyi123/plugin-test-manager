import React from 'react';

import useI18n from '@/lib/hooks/useI18n';

import cx from './index.less';

const ReportStatus: React.FC<{ status?: string; style?: React.CSSProperties }> = ({
  style,
  status,
}) => {
  const { t } = useI18n();

  return (
    <div style={style} className={cx('report-status', status)}>
      {t(`report.${status}`)}
    </div>
  );
};

export default React.memo(ReportStatus);
