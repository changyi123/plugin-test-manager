import React, { useCallback, useRef, useState } from 'react';
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

const getText = (values: any[]): string =>
  values.reduce((prev, cur) => {
    if (cur.type === 'img') {
      prev = prev.concat(cur.url ?? '');
    }

    prev = prev.concat(cur.text ?? '');

    if (cur.children) {
      prev = prev.concat(getText(cur.children));
    }

    return prev;
  }, '');

const Editor: React.FC<EditorProps> = ({ value, name, onSubmit }) => {
  const [editorValue, setEditorValue] = useState<Record<string, any>[]>(
    value ?? defaultEditorValue,
  );
  const [showEditor, setShowEditor] = useState(false);
  const ref = useRef(null);

  const submitEditor = useCallback(async () => {
    setEditorValue(editorValue);
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
          ref={ref}
          readonly={!showEditor}
          editMode={showEditor}
          hideEditBtn
        />
      </div>
      {showEditor && (
        <Space style={{ marginTop: '12px' }}>
          <Button type="primary" disabled={!getText(editorValue).trim()} onClick={submitEditor}>
            保存
          </Button>
          <Button
            onClick={() => {
              setEditorValue(editorValue);
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
