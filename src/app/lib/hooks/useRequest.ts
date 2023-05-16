import useRequest from 'ahooks/lib/useRequest';
import { Options, Plugin, Result, Service } from 'ahooks/lib/useRequest/src/types';

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
