import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input, DatePicker } from '@osui/ui';
import css from './FieldsInput.less';
import moment from 'moment';

const { TextArea } = Input;

interface IFieldsInputProps {
  value?: string;
  change?: (val: string) => void;
}

interface IFieldsDatepickerProps {
  value?: number;
  change?: (val: number) => void;
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
          {val || '-'}
        </div>
      )}

      {edit && (
        <TextArea
          autoSize={true}
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

export const FieldsTimepicker: React.FC<IFieldsDatepickerProps> = ({ value, change }) => {
  const [edit, setEdit] = useState<boolean>(false);
  const [val, setVal] = useState<number>(value);
  const inputRef = useRef(null);
  const onChange = e => {
    change && change(e.valueOf());
    setVal(e.valueOf());
    setEdit(!edit);
  };

  const handleClose = useCallback(
    (open: boolean) => {
      if (!open) {
        setEdit(!edit);
      }
    },
    [edit],
  );

  useEffect(() => {
    if (edit) {
      inputRef.current.focus();
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
          {val ? moment(val).format('YYYY-MM-DD HH:mm:ss') : '-'}
        </div>
      )}

      {edit && (
        <DatePicker
          value={val ? moment(val) : null}
          ref={inputRef}
          showTime
          onBlur={() => setEdit(false)}
          allowClear={false}
          onChange={onChange}
          onOpenChange={handleClose}
        />
      )}
    </div>
  );
};

export default FieldsInput;
