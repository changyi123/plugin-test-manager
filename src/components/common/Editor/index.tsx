import React, { useCallback, useState } from 'react';
import { useDebounceFn } from 'ahooks';
import { Button, Input, Space } from 'antd';
import { EditorField } from '@projectproxima/components';

import cx from './index.less';

interface EditorProps {
  className?: string;
  value?: Record<string, any>[];
  onSubmit?: (val?: Record<string, any>) => void;
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

const Editor: React.FC<EditorProps> = ({ className, value, onSubmit }) => {
  const [editorValue, setEditorValue] = useState<Record<string, any>[]>(
    value ?? defaultEditorValue,
  );
  const [showEditor, setShowEditor] = React.useState(false);

  const submitEditor = useCallback(() => {
    onSubmit(editorValue);
    setShowEditor(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorValue]);

  const { run: onChange } = useDebounceFn(setEditorValue, { wait: 500 });

  return (
    <div className={cx('test-editor-container', `${className ?? ''}`)}>
      {!showEditor ? (
        <>
          <Input placeholder="点击输入内容" onFocus={() => setShowEditor(true)} />
        </>
      ) : (
        <>
          <EditorField
            editMode
            name="comment-editor"
            value={editorValue}
            placeholder="请输入内容"
            hiddenLabel
            onChange={onChange}
            watchChange
          />
          <Space style={{ marginTop: '12px' }}>
            <Button type="primary" disabled={!getText(editorValue).trim()} onClick={submitEditor}>
              保存
            </Button>
            <Button
              onClick={() => {
                setEditorValue(defaultEditorValue);
                setShowEditor(false);
              }}
            >
              取消
            </Button>
          </Space>
        </>
      )}
    </div>
  );
};

export default Editor;
