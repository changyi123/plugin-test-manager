import Icon from '@ant-design/icons';
import { IconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { components } from 'proxima-sdk';
import React from 'react';

import AddSearchSvg from './svg/add-search.svg';
import CloseMoreSVG from './svg/close-more.svg';
import DeleteSearchSvg from './svg/delete-search.svg';
import DragHandlerSVG from './svg/drag-handler.svg';
import DropDownSVG from './svg/drop-down.svg';
import EditSvg from './svg/edit.svg';
import FileCloseSVG from './svg/file-close.svg';
import FileOpenSVG from './svg/file-open.svg';
import FullScreenSVG from './svg/full-screen.svg';
import MoreSVG from './svg/more.svg';
import PageSvg from './svg/page.svg';
import PlusSVG from './svg/plus.svg';
import ScreenOffSVG from './svg/screen-off.svg';
import SettingSvg from './svg/setting.svg';

const Icons = components.Components.Icons;

const { Link, delete: ResetIcon, User, Unfold, History, Refresh } = Icons.Icons;
const { SingleColorIcon } = Icons;

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
export const CustomPage = CustomIconHOC(PageSvg);
export const CustomScreenOff = CustomIconHOC(ScreenOffSVG);
export const CustomPlus = CustomIconHOC(PlusSVG);
export const CloseMore = CustomIconHOC(CloseMoreSVG);
export const DragHandler = CustomIconHOC(DragHandlerSVG);
export const FileOpen = CustomIconHOC(FileOpenSVG);
export const FileClose = CustomIconHOC(FileCloseSVG);
export const FullScreen = CustomIconHOC(FullScreenSVG);
export const DropDown = CustomIconHOC(DropDownSVG);
export const Setting = CustomIconHOC(SettingSvg);
export const DeleteSearch = CustomIconHOC(DeleteSearchSvg);
export const AddSearch = CustomIconHOC(AddSearchSvg);
export const EditIcon = CustomIconHOC(EditSvg);
export const LinkItem = CustomIconHOC(Link);
export const LinkItemIcon = CustomIconHOC(Link);
export const DeleteIcon = CustomIconHOC(ResetIcon);
export const UserIcon = CustomIconHOC(User);
export const UnfoldIcon = CustomIconHOC(Unfold);
export const HistoryIcon = CustomIconHOC(History);
export const RefreshIcon = CustomIconHOC(Refresh);
export const LockIcon = props => <SingleColorIcon type="Lock" {...props} />;
export const UnlockIcon = props => <SingleColorIcon type="Unlock" {...props} />;
