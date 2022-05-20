import { TestType } from '@/lib/constants';

/** table 表头 cell 的类型 */
export type TitleCellOption = {
  titleCellOption: {
    /** table 的类型 */
    testType: keyof typeof TestType;
    /** table 空间 */
    workspaceKey: string;
  };
};
