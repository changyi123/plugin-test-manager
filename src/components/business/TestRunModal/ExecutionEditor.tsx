import React, { useMemo } from 'react';
import { updateTestRun } from '@/lib/api/runs';
import Editor from '@/components/common/Editor';
import { TabsComponentBaseProps } from './type';
// import { components } from 'proxima-sdk';

// const { Field } = components.Components.Editor.Common.Editor;

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
  value?: Record<string, any>[];
  isStep?: boolean;
  onCommentChange?: (val: Record<string, any>[]) => void;
}

const ExecutionEditor: React.FC<ExecutionEditorProps> = props => {
  const { testRunData, testRunEntity, onDataChange, value, isStep, onCommentChange } = props;
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

  // const readonlyEditor = useMemo(() => {
  //   return (
  //     <div className={cx('commont-box')}>
  //       <Field
  //         name="readonly-editor"
  //         value={executeResultDesc ?? defaultEditorValue}
  //         placeholder=""
  //         readonly
  //         hiddenLabel
  //         hideEditBtn
  //       />
  //     </div>
  //   );
  // }, [executeResultDesc]);

  return (
    <>
      {/* {readonlyEditor} */}
      <Editor onSubmit={isStep ? onCommentChange : submitExecuteResultDesc} />
    </>
  );
};

export default React.memo(ExecutionEditor);
