import './style.less';

import { components } from 'proxima-sdk';
import React, { useEffect, useState } from 'react';
import { uuidv4 } from 'src/trigger/lib/helper';

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
  name,
  onChange,
  style,
  ...props
}) => {
  const [editorValue, setEditorValue] = useState<Record<string, any>[] | any>(
    value ?? defaultEditorValue,
  );

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

  const handleSave = value => {
    // 获取收集到的字符串文本
    const stringText = collectEditorText(value);
    // 将字符串文本作为新对象插入到富文本数据的第一行
    const newValue = [{ stringText }, ...value];
    setEditorValue(newValue);
    onChange && onChange(newValue);
  };

  return (
    <div className="comment-editor" style={style}>
      <Field
        name={nameId}
        placeholder={placeholder}
        value={editorValue}
        onChange={handleSave}
        selectedButtons={TEST_MANAGER_EDITOR_BUTTONS_FIELDS}
        watchChange={false}
        readonly={readonly}
        editMode={false}
        hiddenLabel
        hideMention
        {...props}
      />
    </div>
  );
};

export default Editor;
