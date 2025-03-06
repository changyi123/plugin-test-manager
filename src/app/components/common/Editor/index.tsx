import { Button, Space } from 'antd';
import { components } from 'proxima-sdk';
import React, { useCallback, useEffect, useState } from 'react';

import useI18n from '@/lib/hooks/useI18n';

const { Field } = components.Components.Common.Editor;

import { TOOLBAR_BUTTONS_FIELDS } from '@/components/business/TestStep/fields/constant';

import cx from './index.less';

interface EditorProps {
  className?: string;
  value?: Record<string, any>[];
  onSubmit?: (val?: Record<string, any>) => void;
  name?: string;
  isReset?: boolean;
  setIsReset?: (val: boolean) => void;
  onChange?: (val?: Record<string, any>) => void;
  isNeedSomeButton?: boolean;
}

const TEST_MANAGER_EDITOR_BUTTONS_FIELDS = [
  TOOLBAR_BUTTONS_FIELDS.FONST_SIZE,
  TOOLBAR_BUTTONS_FIELDS.HEADER_GROUP,
  TOOLBAR_BUTTONS_FIELDS.BOLD,
  TOOLBAR_BUTTONS_FIELDS.COLOR_PICKER,
];

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

const Editor: React.FC<EditorProps> = ({
  value,
  name,
  onSubmit,
  isReset,
  setIsReset,
  onChange,
  isNeedSomeButton,
}) => {
  const { t } = useI18n();
  const [editorValue, setEditorValue] = useState<Record<string, any>[] | undefined>(
    value ?? defaultEditorValue,
  );
  const [showEditor, setShowEditor] = useState(false);

  // 数据转为富文本数组结构
  useEffect(() => {
    if (typeof value === 'string' && value) {
      setEditorValue([
        {
          stringText: value,
        },
        {
          type: 'p',
          children: [
            {
              text: value,
            },
          ],
        },
      ]);
    } else {
      setEditorValue(value ?? defaultEditorValue);
    }
  }, [value]);

  const submitEditor = useCallback(async () => {
    setShowEditor(false);
    onSubmit && (await onSubmit(editorValue));
    onChange && onChange(editorValue);
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
      <div
        onClick={() => {
          !showEditor && setShowEditor(true);
        }}
      >
        <Field
          name={name ?? 'comment-editor'}
          value={editorValue}
          placeholder={t('page.repository.repoDropDown.pleaseEnterContent')}
          hiddenLabel
          onChange={setEditorValue}
          selectedButtons={isNeedSomeButton ? TEST_MANAGER_EDITOR_BUTTONS_FIELDS : null}
          watchChange
          readonly={false}
          editMode={showEditor}
          hideEditBtn
          hideMention
          screenMode={showEditor ? 'view' : 'create'}
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
