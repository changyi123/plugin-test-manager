import dayjs from 'dayjs';
import { useToken } from 'proxima-sdk/hooks/Hooks';
import fetch from 'proxima-sdk/lib/Fetch';
import { Workspace } from 'proxima-sdk/schema/types/models';
import useSWR from 'swr';

type UseQueryProps = {
  workspace: Workspace;
  url: string;
  params: Record<string, any>;
  enableFetch?: boolean; // params参数是否为空，若为空，则不请求数据。因为每个图表的参数不一样，所以判断逻辑会不一样，顾将判断放到外部
  isNoDataFunc?: (data: any) => boolean;
  extendRequest?: any;
};

type useQueryResult = {
  result: any;
  isNoData: boolean;
  enableSave: boolean;
  isLoading: boolean;
};

const useQuery = ({
  url,
  params,
  enableFetch = true,
  isNoDataFunc,
  extendRequest,
}: UseQueryProps): useQueryResult => {
  const { sessionToken } = useToken();

  const { data, isValidating } = useSWR(
    [url, JSON.stringify(params), enableFetch],
    async () => {
      if (!enableFetch || !sessionToken) {
        return null;
      }

      try {
        params.timezone = dayjs().format('ZZ');
        let data = null;
        if (extendRequest) {
          data = await extendRequest(url, params);
        } else {
          data = await fetch.$post(url, params);
        }
        const enableSave = true;
        console.log('查看返回数据', data);
        return { data, enableSave };
      } catch {
        return null;
      }
    },
    {
      revalidateOnFocus: false,
    },
  );

  const result = data?.data;
  const enableSave = data?.enableSave;

  return {
    result,
    isNoData: isNoDataFunc && isNoDataFunc(result),
    enableSave,
    isLoading: isValidating,
  };
};

export default useQuery;
