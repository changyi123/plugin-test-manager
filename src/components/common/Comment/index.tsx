import React, { useState } from 'react';
import { Space, Input, Button } from '@osui/ui';

import css from './index.less';

export interface ICommentProps {
  placeholder?: string;
  value?: string;
  save?: () => (value: string) => void;
}

const Comment: React.FC<ICommentProps> = ({ placeholder = '点击添加评论', value, save }) => {
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>(value);

  const handleCancel = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    e.stopPropagation();
    setInputValue(value);
    setIsEdit(false);
  };

  const handleConfirm = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    e.stopPropagation();
    save && save()(inputValue);
    setIsEdit(false);
  };

  return (
    <div className={css('comment__show')} onClick={() => setIsEdit(true)}>
      <Input.TextArea
        placeholder={placeholder}
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        maxLength={100}
      />

      {isEdit && (
        <div className={css('comment__footer')}>
          <Space>
            <Button type="primary" onClick={e => handleConfirm(e)}>
              保存
            </Button>
            <Button onClick={e => handleCancel(e)}>取消</Button>
          </Space>
        </div>
      )}
    </div>
  );
};

export default Comment;
