import './index.less';

import { Tooltip } from 'antd';
import classNames from 'classnames';
import React from 'react';
import { cloneElement, CSSProperties, memo, useCallback, useEffect, useRef, useState } from 'react';

const isTextOverflow = element => {
  return new Promise(resolve => {
    window.requestAnimationFrame(() => {
      resolve((element && element.clientHeight < element.scrollHeight) || false);
    });
  });
};
const overlayStyle: CSSProperties = {
  wordBreak: 'break-word',
  whiteSpace: 'pre-wrap',
};

const getCurrentNodeContainer = target => target.parentNode;
const getPopupContainer = () => document.getElementById('test-manager');
interface OverflowTooltip {
  className?: string;
  title?: string | React.ReactElement;
  children: any; // TODO: 可参考 PropTypes 的 ReactNodeLike，暂时先用any
  // 是否禁用，在一些需要react-whether去判断的场景有用
  disabled?: boolean;
  maxline?: 1 | 2 | 3 | 4 | 5;
  mountOnCurrentNode?: boolean;
  overlayClassName?: string;
  style?: CSSProperties;
  placement?:
    | 'top'
    | 'left'
    | 'right'
    | 'bottom'
    | 'topLeft'
    | 'topRight'
    | 'bottomLeft'
    | 'bottomRight'
    | 'leftTop'
    | 'leftBottom'
    | 'rightTop'
    | 'rightBottom';
}

const OverflowTooltip: React.FC<OverflowTooltip> = props => {
  const {
    className,
    title,
    children,
    disabled,
    placement,
    maxline,
    overlayClassName,
    mountOnCurrentNode,
    style,
  } = props;
  const [visible, setVisible] = useState(false);
  const elRef = useRef();
  const getContainer = mountOnCurrentNode ? getCurrentNodeContainer : getPopupContainer;
  const updateVisible = useCallback(
    visible => {
      setVisible(visible);
    },
    [setVisible],
  );

  const handleVisibleChange = useCallback(
    async visible => {
      const overflow = await isTextOverflow(elRef.current);
      if (visible && overflow && !disabled) {
        updateVisible(visible);
        setVisible(visible);
      }
      // 如果在关闭前 overflow改变了，就关闭不了了，所以这个分支单独拿出来
      if (!visible) {
        updateVisible(visible);
      }
    },
    [disabled, updateVisible],
  );

  useEffect(() => {
    if (disabled) {
      setVisible(false);
    }
  }, [disabled]);

  if (!children) {
    return null;
  }
  const childElement = <span>{children}</span>;
  const content = cloneElement(childElement, {
    ref: elRef,
    className: classNames(`tooltip-overflow tooltip-maxline-${maxline}`, className),
    style,
  });
  return (
    <Tooltip
      placement={placement}
      overlayStyle={overlayStyle}
      overlayClassName={overlayClassName}
      title={title}
      open={visible}
      onOpenChange={handleVisibleChange}
      getPopupContainer={getContainer}
    >
      {content}
    </Tooltip>
  );
};
OverflowTooltip.defaultProps = {
  className: '',
  title: '',
  disabled: false,
  placement: 'top',
  mountOnCurrentNode: false,
  maxline: 1,
};

export default memo(OverflowTooltip);
