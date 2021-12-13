import React, { useCallback, useState } from 'react';
import { Space, Input, Button } from '@osui/ui';
import { CopyOutlined } from '@ant-design/icons';

import css from './index.less';

export interface ICommentProps {
  placeholder?: string;
  value?: string;
}

const Comment: React.FC<ICommentProps> = ({ placeholder = '点击添加评论', value }) => {
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>(value);

  const handleCancel = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    e.stopPropagation();
    setInputValue(value);
    setIsEdit(false);
  };

  const handleConfirm = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    e.stopPropagation();
    setIsEdit(false);
  };

  return (
    <div className={css('comment__show')} onClick={() => setIsEdit(true)}>
      <Input.TextArea
        placeholder={placeholder}
        value={inputValue}
        allowClear
        onChange={e => setInputValue(e.target.value)}
      />

      {isEdit && (
        <div className={css('comment__footer')}>
          <Space>
            <Button onClick={e => handleConfirm(e)}>保存</Button>
            <Button onClick={e => handleCancel(e)}>取消</Button>
          </Space>
        </div>
      )}
    </div>
  );
};

export default Comment;
