import React from 'react';
import { useHover } from 'ahooks';
import classnames from 'classnames';
import { StepFieldProps } from '../type';
import { escapeHtmlString } from '@/lib/utils/helper';

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

  React.useImperativeHandle(inheritedProps, () => ref.current);

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
    if (ref.current.innerHTML.length >= maxLength && !escapedKeyCodes.includes(e.key)) {
      e.preventDefault();
    }
    // 阻止 enter 回车
    if (e.key === 'Enter') {
      e.preventDefault();
      onKeyDownEnter?.(ref.current.innerHTML);
    }
  };

  const handleBlur = () => {
    onChange?.(ref.current.innerHTML);
  };

  return (
    <div
      ref={ref}
      {...restProps}
      spellCheck={false}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder ?? `请输入`}
      suppressContentEditableWarning={true}
      contentEditable={'plaintext-only' as any}
      className={classnames('test-step-field', 'input', isHover && 'hover', className)}
    >
      {escapeHtmlString(value)}
    </div>
  );
};

export default React.forwardRef(Input);
