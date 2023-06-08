import { Modal } from 'antd';
import { useAtomValue } from 'jotai';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { genChartGroupPageUrl } from '@/lib/testReport';

import { ActionRefType } from '../index';
import { testReportWitchConnectWithLocationAtom } from '../store';
import cx from './TemplateConfig.less';

const TemplateConfig: React.FC<{ actionRef: React.MutableRefObject<ActionRefType> }> = ({
  actionRef,
}) => {
  const { t: scopedT } = useTranslation('', {
    keyPrefix: 'page.reportTemplateCreator.templateConfig',
  });
  const [containerHeight, setContainerHeight] = React.useState(0);
  const containerDomRef = React.useRef<HTMLDivElement>(null);
  const reportTemplateData = useAtomValue(testReportWitchConnectWithLocationAtom);

  React.useImperativeHandle(actionRef, () => ({
    goNextButtonClick: async () => {
      await new Promise<void>((resolve, reject) => {
        Modal.confirm({
          content: scopedT('message.nextButtonClickConfirm'),
          onOk: () => {
            resolve();
          },
          onCancel: () => {
            reject();
          },
        });
      });
    },
  }));

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
