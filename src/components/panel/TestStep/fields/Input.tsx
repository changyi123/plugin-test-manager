import React from 'react';
import { useHover } from 'ahooks';
import classnames from 'classnames';
import { StepFieldProps } from '../type';

const Input: React.ForwardRefRenderFunction<HTMLDivElement, StepFieldProps> = (
  { value, onNext, onChange, placeholder, ...restProps },
  inheritedProps,
) => {
  const ref = React.useRef<HTMLDivElement>();

  React.useImperativeHandle(inheritedProps, () => ref.current);

  const isHover = useHover(ref);

  const handleKeyDown = e => {
    // 阻止 enter 回车
    if (e.key === 'Enter') {
      e.preventDefault();
      onNext?.();
    }
  };

  const handleOnBlur = () => {
    onChange?.(ref.current.innerHTML);
  };

  return (
    <div
      ref={ref}
      {...restProps}
      contentEditable
      spellCheck={false}
      onBlur={handleOnBlur}
      placeholder={placeholder ?? `请输入`}
      onKeyDown={handleKeyDown}
      suppressContentEditableWarning={true}
      className={classnames('test-step-field', 'input', isHover && 'hover')}
    >
      {value}
    </div>
  );
};

export default React.forwardRef(Input);
