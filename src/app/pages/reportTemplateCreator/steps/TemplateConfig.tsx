import { useAtomValue } from 'jotai';
import React from 'react';

import { reportTemplateConnectLocation } from '../store';
import cx from './TemplateConfig.less';

const TemplateConfig: React.FC = () => {
  const reportTemplateData = useAtomValue(reportTemplateConnectLocation);

  console.info('reportTemplateData-------------', reportTemplateData);

  return (
    <div className={cx('container')}>
      <iframe title="report_template_editor" className={cx('iframe')}></iframe>;
    </div>
  );
};

export default React.memo(TemplateConfig);
