import { useSDK } from '@projectproxima/plugin-sdk';
import useSWR, { SWRResponse } from 'swr';

import Parse from '@/lib/parse';

export const useCurrentUser = (): SWRResponse<Parse.User<Parse.Attributes>, any> => {
  const { context } = useSDK();
  const useFetcher = async _query => {
    let currentUser = context.currentUser;
    if (!currentUser) {
      currentUser = await Parse.User.current().then(user => user.toJSON());
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
