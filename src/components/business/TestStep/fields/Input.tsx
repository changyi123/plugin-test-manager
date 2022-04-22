import React from 'react';
import { useHover } from 'ahooks';
import classnames from 'classnames';
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

  React.useImperativeHandle(inheritedProps, () => ref.current);

  React.useEffect(() => {
    const handlePaste = e => {
      let data = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
      const regex = /<(?!(\/\s*)?(a|b|i|em|s|strong|u)[>,\s])([^>])*>/g;
      data = data.replace(regex, '');
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
    if (ref.current.innerHTML.length >= maxLength && !escapedKeyCodes.includes(e.key)) {
      e.preventDefault();
    }

    if (e.key === 'Enter' && e.altKey) {
      onKeyDownEnter?.(ref.current.innerHTML);
      e.preventDefault();
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
      contentEditable={true}
      onKeyDown={handleKeyDown}
      placeholder={placeholder ?? `请输入`}
      suppressContentEditableWarning={true}
      className={classnames('test-step-field', 'input', isHover && 'hover', className)}
    >
      {value}
    </div>
  );
};

export default React.forwardRef(Input);
