import React from 'react';
import { useHover } from 'ahooks';
import classnames from 'classnames';
import { StepFieldProps } from '../type';

const Input: React.ForwardRefRenderFunction<HTMLDivElement, StepFieldProps> = (
  { value, onNext, onChange },
  inheritedProps,
) => {
  const [isHover, setIsHover] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>();

  React.useImperativeHandle(inheritedProps, () => ref.current);

  useHover(ref, {
    onEnter: setIsHover.bind(null, true),
    onLeave: setIsHover.bind(null, false),
  });

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
      suppressContentEditableWarning={true}
      className={classnames('test-step-field', 'input', isHover && 'hover')}
    >
      {value}
    </div>
  );
};

export default React.forwardRef(Input);
