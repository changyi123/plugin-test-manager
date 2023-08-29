import { buildResponse } from '../../lib/apiUtil';
import { BuiltInInitializationStages, Initialization } from '../../lib/initialization';

/** 配置初始化接口 */
export const initTestConfig = async () => {
  const workspaceKeys = global.body.workspaceKeys;
  const options = global.body.options;
  // 初始化配置
  const initializing = new Initialization(
    // 初始化测试管理配置，初始化图表配置
    [BuiltInInitializationStages.initTestConfig, BuiltInInitializationStages.initChartOption],
    {
      // 禁用更新测试类型映射
      disableUpdateItemTypeMap: true,
      // 禁用自动初始化检查
      disableAutoInitCheck: true,
      allowStageExecuteFailure: false,
      workspaceKeys: workspaceKeys,
      ...options,
    },
  );

  try {
    // 执行初始化
    await initializing.init();
    return {
      success: true,
    };
  } catch (err) {
    return buildResponse(err);
  }
};
