import React, { useMemo } from 'react';
import { updateTestRun } from '@/lib/api/runs';
import Editor from '@/components/common/Editor';
import { TabsComponentBaseProps } from './type';

import cx from './ExecutionEditor.less';

interface ExecutionEditorProps extends TabsComponentBaseProps {
  value?: Record<string, any>[];
  isStep?: boolean;
  name?: string;
  onCommentChange?: (val: Record<string, any>[]) => void;
}

const ExecutionEditor: React.FC<ExecutionEditorProps> = props => {
  const { testRunData, testRunEntity, onDataChange, value, name, isStep, onCommentChange } = props;
  const executeResultDesc = useMemo(
    () => (isStep ? value : testRunData?.runDetail?.executeResultDesc ?? undefined),
    [testRunData, value, isStep],
  );

  const submitExecuteResultDesc = async val => {
    await updateTestRun(testRunEntity, {
      runDetail: {
        ...testRunData.runDetail,
        executeResultDesc: val,
      },
    });

    await onDataChange();
  };

  return (
    <div className={cx(`${isStep ? 'step-editor-box' : ''}`)}>
      {!!isStep && <div className={cx('step-desc')}>步骤概述</div>}
      <Editor
        onSubmit={isStep ? onCommentChange : submitExecuteResultDesc}
        name={name ?? 'readonly-editor'}
        value={executeResultDesc}
      />
    </div>
  );
};

export default ExecutionEditor;
