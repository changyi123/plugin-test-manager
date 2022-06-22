import React from 'react';
import { toArray } from '@/lib/utils/helper';
import { UserInfo } from '@/lib/types/Test';
import { UserCell } from '@projectproxima/components';
import { UserProps } from '@projectproxima/components/dist/cells/user';

type PickedUserCellProps = Partial<Pick<UserProps, 'onChange' | 'readonly'>>;

type UserFieldProps = {
  userInfo: UserInfo | UserInfo[];
} & PickedUserCellProps;

const UserField: React.FC<UserFieldProps> = ({ userInfo, ...restUserCellProps }) => {
  const userData = toArray(userInfo);
  return <UserCell userData={userData} {...restUserCellProps} />;
};

export default UserField;
