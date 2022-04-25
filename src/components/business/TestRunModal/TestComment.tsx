import React, { useMemo } from 'react';
import { EditorField } from '@projectproxima/components';
import { Button, Input, Space } from 'antd';

import cx from './TestComment.less';

const defaultValue = [
  {
    type: 'p',
    children: [
      {
        text: '',
      },
    ],
  },
];

const TestComment: React.FC<any> = () => {
  // 当前编辑器中显示的文本
  const [commentValue, setCommentValue] = React.useState(defaultValue);
  const [showEditor, setShowEditor] = React.useState(false);
  const [placeholder] = React.useState('在此输入评论内容');
  const changeHandle = value => setCommentValue(value);

  const Editor = useMemo(() => {
    return (
      <EditorField
        editMode
        name="comment-editor"
        value={commentValue}
        placeholder={placeholder}
        hiddenLabel
        onChange={changeHandle}
        watchChange
      />
    );
  }, [commentValue, placeholder]);
  return (
    <>
      <div className={cx('commont-box')}>
        {!showEditor ? (
          <Input
            placeholder="编写评论"
            onFocus={() => {
              setShowEditor(true);
            }}
          />
        ) : (
          <>
            {Editor}
            <Space style={{ marginTop: '12px' }}>
              <Button>保存</Button>
              <Button
                onClick={() => {
                  setShowEditor(false);
                }}
              >
                取消
              </Button>
            </Space>
          </>
        )}
      </div>
    </>
  );
};

export default TestComment;
