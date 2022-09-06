import React from 'react';
import { toArray } from '@/lib/utils/helper';
import { UserPointerInfo } from '@/lib/types/Test';
import { UserCell } from '@projectproxima/components';
import { UserProps } from '@projectproxima/components/dist/cells/user';

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
