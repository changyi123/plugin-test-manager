import { TestType } from '@/lib/constants';

/** table 表头 cell 的类型 */
export type TitleCellOption = {
  titleCellOption: {
    /** table 的类型 */
    testType: TestType;
    /** table 空间 */
    workspaceKey: string;
    /** 是否是配置页面 */
    isSettingPage?: boolean;
    /** 是否选中全部空间配置 */
    isCheckedGlobalConfig?: boolean;
    /** 返回数据是否包含系统字段 */
    includeSystemField?: boolean;
    isHideIcon?: boolean;
    /** 使用默认的列重置 */
    restoreWithDefaultColumnKey?: boolean;
  };
};

export type BusinessTableActionType = {
  refresh: () => void;
  expandChangePage?: (num: number) => void;
  toggleSelection: (visible?: boolean) => void;
  selectedRowKeys: any[];
  resetSelectedRowKeys: () => void;
  tableColumns: any[];
  total?: number;
  selectAll?: boolean;
  unSelectedRowKeys?: any[];
  dataSource?: any[];
};
