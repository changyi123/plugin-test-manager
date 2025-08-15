import { useHover, useMemoizedFn, useUnmount } from 'ahooks';
import classnames from 'classnames';
import React from 'react';

import useI18n from '@/lib/hooks/useI18n';
import { getEditorOrStringText } from '@/lib/utils/helper';

import { StepFieldProps } from '../type';

const Input: React.ForwardRefRenderFunction<
  HTMLDivElement,
  StepFieldProps & {
    maxLength?: number;
  }
> = (
  {
    value,
    onKeyDownEnter,
    onChange,
    placeholder,
    className,
    maxLength = Number.MAX_SAFE_INTEGER,
    ...restProps
  },
  inheritedProps,
) => {
  const ref = React.useRef<HTMLDivElement>();
  const textContentDataRef = React.useRef(value);
  const isInputDataRef = React.useRef(false);
  const { t } = useI18n();

  React.useImperativeHandle(inheritedProps, () => ref.current);

  React.useEffect(() => {
    const handlePaste = e => {
      let data = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text/plain');
      // const regex = /<(?!(\/\s*)?(a|b|i|em|s|strong|u)[>,\s])([^>])*>/g;
      // data = data.replace(regex, '');
      const div = document.createElement('div');
      div.innerHTML = data;
      data = div.innerText;
      document.execCommand('insertHTML', false, data);
      e.preventDefault();
    };
    ref.current.addEventListener('paste', handlePaste);
  }, []);

  const isHover = useHover(ref);

  const escapedKeyCodes = [
    'Backspace',
    'Shift',
    'Control',
    'Alt',
    'ArrowUp',
    'ArrowDown',
    'ArrowRight',
    'ArrowLeft',
  ];

  const handleKeyDown = e => {
    if (!escapedKeyCodes.includes(e.key) && textContentDataRef.current?.length >= maxLength) {
      e.preventDefault();
    }

    if (e.key === 'Enter' && e.altKey) {
      onKeyDownEnter?.(textContentDataRef.current);
      e.preventDefault();
    }
  };

  const handleInput = e => {
    isInputDataRef.current = true;
    textContentDataRef.current = e.target.textContent;
  };

  const handleBlur = useMemoizedFn(() => {
    if (isInputDataRef.current) {
      onChange?.(textContentDataRef.current);
    }
  });

  useUnmount(() => {
    // 销毁时触发一次 blur 事件，提交表单的值
    handleBlur();
  });

  return (
    <div
      ref={ref}
      {...restProps}
      spellCheck={false}
      onBlur={handleBlur}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      {...(!restProps.readonly
        ? {
            contentEditable: true,
            suppressContentEditableWarning: true,
          }
        : {})}
      placeholder={placeholder ?? t('components.business.testStep.pleaseInput')}
      className={classnames(
        'test-step-field',
        !restProps.readonly && 'input',
        isHover && 'hover',
        className,
      )}
    >
      {getEditorOrStringText(value)}
    </div>
  );
};

export default React.forwardRef(Input);
