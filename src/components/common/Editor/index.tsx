import React, { useCallback, useState } from 'react';
import { Button, Space } from 'antd';
import { components } from 'proxima-sdk';

const { Field } = components.Components.Common.Editor;

import cx from './index.less';

interface EditorProps {
  className?: string;
  value?: Record<string, any>[];
  onSubmit?: (val?: Record<string, any>) => void;
  name?: string;
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

const Editor: React.FC<EditorProps> = ({ value, name, onSubmit }) => {
  const [editorValue, setEditorValue] = useState<Record<string, any>[] | undefined>(
    value ?? defaultEditorValue,
  );
  const [showEditor, setShowEditor] = useState(false);

  const submitEditor = useCallback(async () => {
    setShowEditor(false);
    await onSubmit(editorValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorValue]);

  return (
    <div className={cx('test-editor-container', `${showEditor ? '' : 'readonly'}`)}>
      <div onClick={() => setShowEditor(true)}>
        <Field
          name={name ?? 'comment-editor'}
          value={editorValue}
          placeholder="请输入内容"
          hiddenLabel
          onChange={setEditorValue}
          watchChange
          readonly={!showEditor}
          editMode={showEditor}
          hideEditBtn
        />
      </div>
      {showEditor && (
        <Space style={{ marginTop: '12px' }}>
          <Button type="primary" onClick={submitEditor}>
            保存
          </Button>
          <Button
            onClick={() => {
              setEditorValue(value ?? defaultEditorValue);
              setShowEditor(false);
            }}
          >
            取消
          </Button>
        </Space>
      )}
    </div>
  );
};

export default Editor;
