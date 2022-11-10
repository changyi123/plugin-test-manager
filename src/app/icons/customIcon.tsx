import React from 'react';
import Icon from '@ant-design/icons';
import { IconComponentProps } from '@ant-design/icons/lib/components/Icon';

import MoreSVG from './svg/more.svg';
import CloseMoreSVG from './svg/close-more.svg';
import ScreenOffSVG from './svg/screen-off.svg';
import PlusSVG from './svg/plus.svg';
import DragHandlerSVG from './svg/drag-handler.svg';
import FileOpenSVG from './svg/file-open.svg';
import FileCloseSVG from './svg/file-close.svg';
import FullScreenSVG from './svg/full-screen.svg';
import DropDownSVG from './svg/drop-down.svg';
import { components } from 'proxima-sdk';

const { LinkIcon, ResetIcon, User } = components.Components.Icons;

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
export const FileOpen = CustomIconHOC(FileOpenSVG);
export const FileClose = CustomIconHOC(FileCloseSVG);
export const FullScreen = CustomIconHOC(FullScreenSVG);
export const DropDown = CustomIconHOC(DropDownSVG);
export const LinkItemIcon = CustomIconHOC(LinkIcon);
export const DeleteIcon = CustomIconHOC(ResetIcon);
export const UserIcon = CustomIconHOC(User);
