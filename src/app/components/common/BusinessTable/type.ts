import { TestType } from '@/lib/constants';

/** table 表头 cell 的类型 */
export type TitleCellOption = {
  titleCellOption: {
    /** table 的类型 */
    testType: TestType;
    /** table 空间 */
    workspaceKey: string;
  };
};
