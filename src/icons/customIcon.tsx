import React from 'react';
import Icon from '@ant-design/icons';
import { IconComponentProps } from '@ant-design/icons/lib/components/Icon';

import MoreSVG from './svg/more.svg';
import ScreenOffSVG from './svg/screen-off.svg';

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
