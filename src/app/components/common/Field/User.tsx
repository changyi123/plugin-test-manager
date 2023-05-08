import { UserCell } from '@giteeteam/apps-team-components';
import { UserProps } from '@giteeteam/apps-team-components/dist/cells/user';
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
  return <UserCell displayDeletedUser readonly={readonly} value={value} {...restUserCellProps} />;
};

export default UserField;
