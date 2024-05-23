import { useMemoizedFn, usePagination, useUpdateEffect } from 'ahooks';
import type {
  AntdTableOptions,
  AntdTableResult,
  Data,
  Params,
  Service,
} from 'ahooks/lib/useAntdTable/types';
import { useEffect, useRef } from 'react';

const useTable = <TData extends Data, TParams extends Params>(
  service: Service<TData, TParams>,
  options: AntdTableOptions<TData, TParams> & { ignoreInit?: boolean } = {},
) => {
  const { manual = false, refreshDeps = [], ready = true, ignoreInit = false, ...rest } = options;

  const result = usePagination<TData, TParams>(service, {
    ready,
    manual: true,
    ...rest,
    onSuccess(...args) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      runSuccessRef.current = true;
      rest.onSuccess?.(...args);
    },
  });

  const { params = [], run } = result;

  const defaultDataSourceRef = useRef([]);
  const runSuccessRef = useRef(false);

  const onTableChange = (pagination: any, filters: any, sorter: any, extra: any) => {
    const [oldPaginationParams, ...restParams] = params || [];
    run(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      {
        ...oldPaginationParams,
        current: pagination.current,
        pageSize: pagination.pageSize,
        filters,
        sorter,
        extra,
      },
      ...restParams,
    );
  };

  // refresh & ready change on the same time
  const hasAutoRun = useRef(false);
  hasAutoRun.current = false;

  useUpdateEffect(() => {
    if (hasAutoRun.current) {
      return;
    }
    if (!ready) {
      return;
    }
    if (!manual) {
      hasAutoRun.current = true;
      result.pagination.changeCurrent(1);
    }
  }, [...refreshDeps]);

  // init
  const { defaultPageSize = 10 } = rest;
  useEffect(() => {
    if (ignoreInit) return;
    // if has cache, use cached params. ignore manual and ready.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    run(params.length ? params[0] : { pageSize: defaultPageSize, current: 1 });
    return;
  }, []);

  return {
    ...result,
    tableProps: {
      dataSource: result.data?.list || defaultDataSourceRef.current,
      loading: result.loading,
      onChange: useMemoizedFn(onTableChange),
      pagination: {
        current: result.pagination.current,
        pageSize: result.pagination.pageSize,
        total: result.pagination.total,
      },
    },
  } as AntdTableResult<TData, TParams>;
};

export default useTable;
