import useSWR, { SWRResponse } from 'swr';
import Parse from '@/lib/parse';

export const useCurrentUser = (): SWRResponse<Parse.User<Parse.Attributes>, any> => {
  const useFetcher = async _query => {
    const currentUser = await Parse.User.current();
    // 用户信息存于 window 上，供 common 中方法获取
    window.currentUser = currentUser.toJSON();
    return currentUser;
  };
  return useSWR('currentUser', useFetcher);
};

export const useGetUserById = (ids): SWRResponse<any[], any> => {
  const useFetcher = async () =>
    await new Parse.Query(Parse.User).containedIn('objectId', ids).find();
  return useSWR('userInfo', useFetcher);
};
