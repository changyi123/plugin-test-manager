import './style.less';

import { Button, Space } from 'antd';
import { components } from 'proxima-sdk';
import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import useI18n from '@/lib/hooks/useI18n';

import { TOOLBAR_BUTTONS_FIELDS } from './constant';

const { Field } = components.Components.Common.Editor;

interface EditorProps {
  className?: string;
  placeholder?: string;
  value?: Record<string, any>[] | string;
  onSubmit?: (val?: Record<string, any>) => void;
  name?: string;
  onChange?: (val: Record<string, any>[]) => void;
  isReset?: boolean;
  readonly?: boolean;
  style?: React.CSSProperties;
  setIsReset?: (val: boolean) => void;
}

export const collectEditorText = (nodes: any[]): string => {
  let textContent = '';

  const traverseNodes = (nodes: any[]) => {
    nodes.forEach(node => {
      if (node?.text) {
        textContent += node.text;
      }
      if (node?.children) {
        traverseNodes(node.children);
      }
    });
  };

  traverseNodes(nodes);
  return textContent;
};

const defaultEditorValue = [
  {
    stringText: '',
  },
  {
    type: 'p',
    children: [
      {
        text: '',
      },
    ],
  },
];

const TEST_MANAGER_EDITOR_BUTTONS_FIELDS = [
  TOOLBAR_BUTTONS_FIELDS.FONST_SIZE,
  TOOLBAR_BUTTONS_FIELDS.HEADER_GROUP,
  TOOLBAR_BUTTONS_FIELDS.BOLD,
  TOOLBAR_BUTTONS_FIELDS.COLOR_PICKER,
];

const Editor: React.FC<EditorProps> = ({
  readonly = false,
  placeholder,
  value,
  onChange,
  style,
}) => {
  const [editorValue, setEditorValue] = useState<Record<string, any>[] | any>(
    value ?? defaultEditorValue,
  );
  const [showEditor, setShowEditor] = useState(false);
  const { t } = useI18n();
  const nameId = uuidv4();

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

  const submitEditor = () => {
    setShowEditor(false);
    onChange && onChange(editorValue);
  };

  const handleSave = value => {
    // 获取收集到的字符串文本
    const stringText = collectEditorText(value);
    // 将字符串文本作为新对象插入到富文本数据的第一行
    const newValue = [{ stringText }, ...value];
    setEditorValue(newValue);
    onChange && onChange(newValue);
  };

  return (
    <div className="comment-editor">
      <div
        style={style}
        onClick={() => {
          !readonly && setShowEditor(true);
        }}
      >
        <Field
          name={nameId}
          placeholder={placeholder}
          value={editorValue}
          onChange={handleSave}
          selectedButtons={TEST_MANAGER_EDITOR_BUTTONS_FIELDS}
          watchChange={false}
          readonly={readonly}
          editMode={showEditor}
          hiddenLabel
          hideMention
          hideEditBtn
        />
      </div>
      {showEditor && !readonly && (
        <Space style={{ marginTop: '12px' }}>
          <Button type="primary" onClick={submitEditor}>
            {t('common.save')}
          </Button>
          <Button
            onClick={() => {
              let changData = null;
              if (typeof value === 'string' && value) {
                changData = [
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
                ];
              } else {
                changData = value ?? defaultEditorValue;
              }
              const stringText = collectEditorText(changData || defaultEditorValue);
              // 将字符串文本作为新对象插入到富文本数据的第一行
              const newValue = [{ stringText }, ...changData];
              setEditorValue(newValue);
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
