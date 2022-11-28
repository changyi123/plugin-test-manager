import { TestType, BuiltinItemTypeMapping } from '@/lib/constants';
import { Board, Workspace } from '@/lib/models';

/** 获取默认测试配置数据 */
export const generateDefaultTestConfig = async (
  workspace: Record<string, any>,
  isolatedSystem = false,
) => {
  const board = await new Board({
    // 空间内面板
    filterSource: 'inWorkspace',
    icon: 'Panel1',
    iql: '\'类型\' in ["缺陷"]',
    name: '缺陷管理',
    // 限制创建的类型
    itemTypes: [],
    // 面板所属空间
    workspace: Workspace.createWithoutData(workspace.objectId),
    hidden: true,
  }).save();

  return {
    displayDefectBoard: true,
    defectBoard: board,
    workspaceKey: workspace.key,
    global: false,
    itemTypeMap: isolatedSystem ? BuiltinItemTypeMapping : {},
    defectsMapping: [],
    // 默认所有事项都加上空间隔离
    isolateTestType: [TestType.Plan, TestType.TestDefect, TestType.Case, TestType.Execution],
    tableFields: {
      [TestType.Case]: {
        serachFields: ['key'],
      },
    },
  };
};
