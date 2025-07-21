import React, { useRef, useState } from 'react';

interface UseCellRenderParams<T = any> {
  ref: React.Ref<any>;
  // 基础div
  RenderCell: React.FC<T>;
  // 原组件
  ActionCell: React.FC<T>;
  cellWrapperClassnames?: string;
}

function useCellComponent<T = any>({
  ref,
  RenderCell,
  ActionCell,
  cellWrapperClassnames,
}: UseCellRenderParams<T>): React.FC<T & { readonly?: boolean; uimOptionsVisibility?: any }> {
  const timeoutCurrent = useRef<ReturnType<typeof setTimeout>>();
  const [needToRenderAction, setRenderAction] = useState<boolean>(false);

  // eslint-disable-next-line react/display-name
  return props => {
    // const { readonly } = props; // todo 这个作用是什么？
    return needToRenderAction ? (
      <div ref={ref} className={cellWrapperClassnames}>
        <ActionCell {...props} />
      </div>
    ) : (
      <div
        className={cellWrapperClassnames}
        onMouseOver={() => {
          timeoutCurrent.current = setTimeout(() => {
            clearTimeout(timeoutCurrent.current);
            setRenderAction(true);
          }, 50);
        }}
      >
        <RenderCell {...props} />
      </div>
    );
  };
}

export default useCellComponent;
