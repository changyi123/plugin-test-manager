import React, { useCallback, useEffect, useState } from 'react';
import { Button, Space } from 'antd';
import { components } from 'proxima-sdk';
import useI18n from '@/lib/hooks/useI18n';

const { Field } = components.Components.Common.Editor;

import cx from './index.less';

interface EditorProps {
  className?: string;
  value?: Record<string, any>[];
  onSubmit?: (val?: Record<string, any>) => void;
  name?: string;
  isReset?: boolean;
  setIsReset?: (val: boolean) => void;
}

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

const Editor: React.FC<EditorProps> = ({ value, name, onSubmit, isReset, setIsReset }) => {
  const { t } = useI18n();
  const [editorValue, setEditorValue] = useState<Record<string, any>[] | undefined>(
    value ?? defaultEditorValue,
  );
  const [showEditor, setShowEditor] = useState(false);

  const submitEditor = useCallback(async () => {
    setShowEditor(false);
    await onSubmit(editorValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorValue]);

  useEffect(() => {
    if (isReset) {
      setEditorValue(value ?? defaultEditorValue);
      setShowEditor(false);
      setIsReset(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReset]);

  return (
    <div className={cx('test-editor-container')}>
      <div onClick={() => setShowEditor(true)}>
        <Field
          name={name ?? 'comment-editor'}
          value={editorValue}
          placeholder={t('common.pleaseEnterContent')}
          hiddenLabel
          onChange={setEditorValue}
          watchChange
          readonly={false}
          editMode={showEditor}
          hideEditBtn
          hideMention
        />
      </div>
      {showEditor && (
        <Space style={{ marginTop: '12px' }}>
          <Button type="primary" onClick={submitEditor}>
            {t('common.save')}
          </Button>
          <Button
            onClick={() => {
              setEditorValue(value ?? defaultEditorValue);
              setShowEditor(false);
            }}
          >
            {t('common.cancel')}
          </Button>
        </Space>
      )}
    </div>
  );
};

export default Editor;
