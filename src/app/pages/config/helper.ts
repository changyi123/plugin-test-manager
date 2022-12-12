import { TestType, BuiltinItemTypeMapping } from '@/lib/constants';
import { getPluginWebTriggerBaseUrl } from '@/lib/utils/helper';
import fetch from '@/lib/utils/fetch';

/** 获取默认测试配置数据 */
export const generateDefaultTestConfig = async (
  workspace: Record<string, any>,
  isolatedSystem = false,
) => {
  // const board = await new Board({
  //   // 空间内面板
  //   filterSource: 'inWorkspace',
  //   icon: 'Panel1',
  //   iql: '\'类型\' in ["缺陷"]',
  //   name: '缺陷管理',
  //   // 限制创建的类型
  //   itemTypes: [],
  //   // 面板所属空间
  //   workspace: Workspace.createWithoutData(workspace.objectId),
  //   hidden: true,
  // }).save();

  const [chartGroupMapValue] = await fetch.$post(
    `${getPluginWebTriggerBaseUrl()}/batch-create-chart-groups`,
    {
      workspaceKeys: [workspace.key],
    },
  );

  return {
    // displayDefectBoard: true,
    // defectBoard: board,
    workspaceKey: workspace.key,
    // 测试统计报表
    chartGroups: chartGroupMapValue?.chartGroups,
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
