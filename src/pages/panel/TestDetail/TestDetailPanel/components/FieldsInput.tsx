import React, { useState } from 'react';
import { Input } from '@osui/ui';
import css from './FieldsInput.less';

const { TextArea } = Input;

interface IFieldsInputProps {
  value?: string;
}

const FieldsInput: React.FC<IFieldsInputProps> = ({ value }) => {
  const [edit, setEdit] = useState<boolean>(false);
  const onChange = e => {
    console.log('Change:', e.target.value);
  };
  return (
    <div className={css('fields-input')}>
      {!edit && (
        <div
          onClick={e => {
            e.stopPropagation();
            setEdit(!edit);
          }}
        >
          {value}
        </div>
      )}

      {edit && <TextArea showCount maxLength={100} style={{ height: 120 }} onChange={onChange} />}
    </div>
  );
};

export default FieldsInput;
