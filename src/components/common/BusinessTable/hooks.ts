import { useAntdTable } from 'ahooks';
import {
  AntdTableOptions,
  Data,
  Params,
  Service,
  AntdTableResult,
} from 'ahooks/lib/useAntdTable/types';

type UseBusinessTable = <TData extends Data, TParams extends Params>(
  service: Service<TData, TParams>,
  options?: AntdTableOptions<TData, TParams>,
) => AntdTableResult<TData, TParams>;

export const useBusinessTable: UseBusinessTable = (...args) => {
  return useAntdTable(...args);
};
