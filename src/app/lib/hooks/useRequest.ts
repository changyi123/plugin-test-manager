import { Service, Options, Result, Plugin } from 'ahooks/lib/useRequest/src/types';
import useRequest from 'ahooks/lib/useRequest';

type useNoExpiredRequests = <TData, TParams extends any[]>(
  service: Service<TData, TParams>,
  options?: { cacheKey: string } & Omit<Options<TData, TParams>, 'cacheKey'>,
  plugins?: Plugin<TData, TParams>[],
) => Result<TData, TParams>;
/**
 * 长效缓存请求
 */
export const useNoExpiredRequest: useNoExpiredRequests = (service, options, plugins) => {
  return useRequest(
    service,
    {
      refreshDeps: [],
      cacheKey: options.cacheKey,
      staleTime: -1,
      ...options,
    },
    plugins,
  );
};
