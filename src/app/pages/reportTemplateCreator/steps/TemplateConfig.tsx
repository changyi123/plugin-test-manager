import { useAtomValue } from 'jotai';
import React from 'react';

import { genChartGroupPageUrl } from '@/lib/testReport';

import { reportTemplateConnectLocation } from '../store';
import cx from './TemplateConfig.less';

const TemplateConfig: React.FC = () => {
  const reportTemplateData = useAtomValue(reportTemplateConnectLocation);
  const chartGroupUrl = reportTemplateData?.chartGroup.objectId
    ? genChartGroupPageUrl({
        chartGroupId: reportTemplateData.chartGroup.objectId,
      })
    : '';

  return (
    <div className={cx('container')}>
      <iframe className={cx('iframe')} title="report_template_editor" src={chartGroupUrl} />
    </div>
  );
};

export default React.memo(TemplateConfig);
