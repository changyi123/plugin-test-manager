import type { UserProps } from '@giteeteam/apps-team-components/dist/cells/user';
import { UserReadView } from 'apps-team-components-v1';
import React from 'react';

import { UserPointerInfo } from '@/lib/types/Test';
import { toArray } from '@/lib/utils/helper';

type PickedUserCellProps = Partial<Pick<UserProps, 'onChange' | 'readonly'>>;

type UserFieldProps = {
  userInfo: UserPointerInfo | UserPointerInfo[];
} & PickedUserCellProps;

const UserField: React.FC<UserFieldProps> = ({
  userInfo,
  readonly = true,
  ...restUserCellProps
}) => {
  const value = toArray(userInfo).filter(Boolean);
  return <UserReadView readonly={readonly} value={value} {...restUserCellProps} />;
};

export default UserField;
