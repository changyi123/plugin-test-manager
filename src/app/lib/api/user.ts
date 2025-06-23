import { useSDK } from '@giteeteam/plugin-sdk';
import useSWR, { SWRResponse } from 'swr';

import Parse from '@/lib/parse';

import fetch from '../utils/fetch';
import { isSuperAdmin } from '../utils/helper';

export const useCurrentUser = (): SWRResponse<Parse.User<Parse.Attributes>, any> => {
  const { context } = useSDK();
  const useFetcher = async _query => {
    let currentUser = context.currentUser;
    if (!currentUser) {
      currentUser = await Parse.User.current().then(user => user.toJSON());
    }

    currentUser = { ...currentUser };

    if (!currentUser.roleList) {
      const roles = await getUserRole(currentUser.id);

      currentUser.roleList = roles;
      currentUser.isAdmin = isSuperAdmin(roles);
    }

    // 用户信息存于 window 上，供 common 中方法获取
    window.currentUser = currentUser;
    return currentUser;
  };

  return useSWR('currentUser', useFetcher);
};

export const useGetUserById = (ids): SWRResponse<any[], any> => {
  const useFetcher = async () =>
    await new Parse.Query(Parse.User).containedIn('objectId', ids).find();
  return useSWR('userInfo', useFetcher);
};

export const getUserRole = async id => {
  const { results } = await fetch.$get(`/parse/api/roles/user/${id}`);
  return results;
};
