import React from 'react';
import Icon from '@ant-design/icons';
import { IconComponentProps } from '@ant-design/icons/lib/components/Icon';

import MoreSVG from './svg/more.svg';
import CloseMoreSVG from './svg/close-more.svg';
import ScreenOffSVG from './svg/screen-off.svg';
import PlusSVG from './svg/plus.svg';
import DragHandlerSVG from './svg/drag-handler.svg';

const CustomIconHOC = (
  component: IconComponentProps['component'],
  posProps?: Omit<IconComponentProps, 'component'>,
) => {
  const CustomIcon: React.FC<Omit<IconComponentProps, 'component'>> = props => (
    <Icon component={component} {...(posProps as any)} {...(props as any)} />
  );
  return CustomIcon;
};

export const CustomMore = CustomIconHOC(MoreSVG);
export const CustomScreenOff = CustomIconHOC(ScreenOffSVG);
export const CustomPlus = CustomIconHOC(PlusSVG);
export const CloseMore = CustomIconHOC(CloseMoreSVG);
export const DragHandler = CustomIconHOC(DragHandlerSVG);
