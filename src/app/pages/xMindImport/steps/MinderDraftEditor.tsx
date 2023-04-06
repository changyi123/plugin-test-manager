import React from 'react';
import { StepComponentProp } from '../type';
import { getLang } from '@/lib/utils/locale';
import MinderEditor from 'test-manager-minder';

import cx from './MinderDraftEditor.less';

const MinderDraftEditor: React.FC<StepComponentProp> = ({ sharedState }) => {
  const actionRef = React.useRef(null);
  const lang = getLang()?.replace(/-\w+/g, '');

  console.log('sharedState.minderData', sharedState.minderData);

  return (
    <div className={cx('container')}>
      <MinderEditor
        lang={lang}
        actionRef={actionRef}
        data={sharedState.minderData}
        priorityOptions={sharedState.priorityOptions}
      />
    </div>
  );
};

export default MinderDraftEditor;
