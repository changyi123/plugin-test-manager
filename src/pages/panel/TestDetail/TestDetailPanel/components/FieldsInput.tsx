import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@osui/ui';
import css from './FieldsInput.less';

const { TextArea } = Input;

interface IFieldsInputProps {
  value?: string;
  change?: (val: string) => void;
}

const FieldsInput: React.FC<IFieldsInputProps> = ({ value, change }) => {
  const [edit, setEdit] = useState<boolean>(false);
  const [val, setVal] = useState<string>(value);
  const inputRef = useRef(null);
  const onChange = e => {
    setVal(e.target.value);
  };

  const handleSaveField = useCallback(() => {
    change && change(val);
    setEdit(!edit);
  }, [edit, change, val]);

  useEffect(() => {
    if (edit) {
      inputRef.current.focus({
        cursor: 'end',
      });
    }
  }, [edit]);

  return (
    <div className={css('fields-input')}>
      {!edit && (
        <div
          onClick={e => {
            e.stopPropagation();
            setEdit(!edit);
          }}
        >
          {val}
        </div>
      )}

      {edit && (
        <TextArea
          ref={inputRef}
          value={val}
          maxLength={200}
          onBlur={handleSaveField}
          onChange={onChange}
        />
      )}
    </div>
  );
};

export default FieldsInput;
