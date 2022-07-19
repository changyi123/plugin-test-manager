import React, { useMemo } from 'react';
import { updateTestRun } from '@/lib/api/runs';
import { EditorField } from '@projectproxima/components';
import Editor from '@/components/common/Editor';
import { TabsComponentBaseProps } from './type';

import cx from './ExecutionEditor.less';

const defaultEditorValue = [
  {
    type: 'p',
    children: [
      {
        text: '',
      },
    ],
  },
];

interface ExecutionEditorProps extends TabsComponentBaseProps {
  value?: string;
  isExecution?: boolean;
}

const ExecutionEditor: React.FC<ExecutionEditorProps> = props => {
  const { testRunData, testRunEntity, onDataChange, value, isExecution } = props;
  const executeResultDesc = useMemo(
    () => (isExecution ? testRunData?.runDetail?.executeResultDesc : value ?? undefined),
    [testRunData, value, isExecution],
  );

  const submitExecuteResultDesc = async val => {
    await updateTestRun(testRunEntity, {
      runDetail: {
        ...testRunData.runDetail,
        executeResultDesc: val,
      },
    });

    onDataChange();
  };

  const readonlyEditor = useMemo(() => {
    return (
      <>
        <EditorField
          name="readonly-editor"
          value={executeResultDesc ?? defaultEditorValue}
          placeholder=""
          readonly
          hiddenLabel
          hideEditBtn
        />
      </>
    );
  }, [executeResultDesc]);

  return (
    <>
      {executeResultDesc && <div className={cx('commont-box')}>{readonlyEditor}</div>}
      <Editor onSubmit={submitExecuteResultDesc} />
    </>
  );
};

export default ExecutionEditor;
