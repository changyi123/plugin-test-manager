import useSWR, { SWRResponse } from 'swr';
import Parse from '@/lib/parse';

export const useCurrentUser = (): SWRResponse<Parse.User<Parse.Attributes>, any> => {
  const useFetcher = async _query => await Parse.User.current();
  return useSWR('currentUser', useFetcher);
};

export const useGetUserById = (ids): SWRResponse<any[], any> => {
  const useFetcher = async () =>
    await new Parse.Query(Parse.User).containedIn('objectId', ids).find();
  return useSWR('userInfo', useFetcher);
};
