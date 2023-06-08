import { useAtomValue } from 'jotai';
import React from 'react';

import { genChartGroupPageUrl } from '@/lib/testReport';

import { reportTemplateConnectLocation } from '../store';
import cx from './TemplateConfig.less';

const TemplateConfig: React.FC = () => {
  const [containerHeight, setContainerHeight] = React.useState(0);
  const containerDomRef = React.useRef<HTMLDivElement>(null);
  const reportTemplateData = useAtomValue(reportTemplateConnectLocation);

  const chartGroupUrl = reportTemplateData?.chartGroup.objectId
    ? genChartGroupPageUrl({
        isTemplate: true,
        chartGroupId: reportTemplateData.chartGroup.objectId,
      })
    : '';

  React.useEffect(() => {
    setContainerHeight(containerDomRef.current?.parentElement.clientHeight ?? 0);
  }, []);

  return (
    <div ref={containerDomRef} className={cx('container')} style={{ height: containerHeight }}>
      <iframe
        width="100%"
        height="100%"
        src={chartGroupUrl}
        className={cx('iframe')}
        title="report_template_editor"
      />
    </div>
  );
};

export default React.memo(TemplateConfig);
