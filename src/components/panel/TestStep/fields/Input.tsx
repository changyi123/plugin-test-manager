import React from 'react';
import { StepFieldProps } from '../type';

const Input: React.ForwardRefRenderFunction<HTMLDivElement, StepFieldProps> = (
  { value, onNext, onChange },
  inheritedProps,
) => {
  const ref = React.useRef<HTMLDivElement>();

  React.useImperativeHandle(inheritedProps, () => ref.current);

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
      contentEditable
      spellCheck={false}
      onBlur={handleOnBlur}
      onKeyDown={handleKeyDown}
      className="test-step-field input"
      suppressContentEditableWarning={true}
    >
      {value}
    </div>
  );
};

export default React.forwardRef(Input);
