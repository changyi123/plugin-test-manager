import React, { useEffect, useMemo, useState } from 'react';

import Editor from '@/components/common/Editor';
import { updateTestRunDetail } from '@/lib/api/item';
import useI18n from '@/lib/hooks/useI18n';

import cx from './ExecutionEditor.less';
import { TabsComponentBaseProps } from './type';

interface ExecutionEditorProps extends TabsComponentBaseProps {
  value?: Record<string, any>[];
  isStep?: boolean;
  name?: string;
  onCommentChange?: (val: Record<string, any>[]) => void;
}

const ExecutionEditor: React.FC<ExecutionEditorProps> = props => {
  const { t } = useI18n();
  const { testRunData, testRunEntity, onDataChange, value, name, isStep, onCommentChange } = props;
  const [isReset, setIsReset] = useState(false);
  const executeResultDesc = useMemo(
    () => (isStep ? value : testRunData?.runDetail?.executeResultDesc ?? undefined),
    [testRunData, value, isStep],
  );

  useEffect(() => {
    if (testRunData) {
      setIsReset(true);
    }
  }, [testRunData]);

  const submitExecuteResultDesc = async val => {
    await updateTestRunDetail(testRunEntity, {
      runDetail: {
        ...testRunData.runDetail,
        executeResultDesc: val,
      },
    });

    await onDataChange();
  };

  return (
    <div className={cx(`${isStep ? 'step-editor-box' : ''}`)}>
      {!!isStep && (
        <div className={cx('step-desc')}>
          {t('components.business.testRunModal.executionEditor.stepDesc')}
        </div>
      )}
      <Editor
        onSubmit={isStep ? onCommentChange : submitExecuteResultDesc}
        name={name ?? 'readonly-editor'}
        value={executeResultDesc}
        isReset={isReset}
        setIsReset={setIsReset}
      />
    </div>
  );
};

export default ExecutionEditor;
