import { getReqInfoFromVMRuntime } from './lib/apiUtil';
import { iqlSearch } from './lib/coreApi';

interface QueryPlanRelatedDataParams {
  // 三种查询方式（按优先级）
  versionKeys?: string[]; // 版本事项key列表（优先级最高）
  requirementKeys?: string[]; // 需求事项key列表（优先级中等）
  planKeys?: string[]; // 测试计划key列表（优先级最低）

  includeExecutions?: boolean; // 是否包含测试执行任务
  includeRuns?: boolean; // 是否包含测试执行
  includeDefects?: boolean; // 是否包含缺陷
}

/**
 * 根据版本事项/需求事项/测试计划查询所有相关数据（执行任务、测试执行、缺陷）
 *
 * 支持三种查询方式（按优先级）：
 * 1. versionKeys: 版本事项key列表，使用 hierarchicalQuery 查找测试计划，同时返回版本事项数据
 * 2. requirementKeys: 需求事项key列表，使用 hierarchicalQuery 查找测试计划，同时返回需求事项数据
 * 3. planKeys: 直接提供测试计划key列表
 *
 * @param params 查询参数
 * @returns 返回完整的关联数据
 */
const runScript = async () => {
  const reqInfo = getReqInfoFromVMRuntime<{
    body: QueryPlanRelatedDataParams;
  }>();

  console.log('原始请求信息:', JSON.stringify(reqInfo, null, 2));

  const body = reqInfo?.triggerParams?.body || reqInfo?.body;
  if (!body) {
    console.error('无法获取请求体数据:', reqInfo);
    return {
      success: false,
      message: '请求参数解析失败',
      data: {
        versions: [],
        requirements: [],
        plans: [],
        executions: [],
        runs: [],
        defects: [],
      },
    };
  }

  // 确保类型正确性
  const params: QueryPlanRelatedDataParams = body as QueryPlanRelatedDataParams;
  
  const { 
    versionKeys,
    requirementKeys, 
    planKeys, 
    includeExecutions = true, 
    includeRuns = true, 
    includeDefects = true 
  } = params;

  // 参数验证 - 至少需要提供一种查询方式
  if (
    (!versionKeys || versionKeys.length === 0) &&
    (!requirementKeys || requirementKeys.length === 0) &&
    (!planKeys || planKeys.length === 0)
  ) {
    return {
      success: false,
      message: '至少需要提供 versionKeys、requirementKeys 或 planKeys 中的一种查询方式',
      data: {
        versions: [],
        requirements: [],
        plans: [],
        executions: [],
        runs: [],
        defects: [],
      },
    };
  }

  try {
    const result = {
      versions: [],
      requirements: [],
      plans: [],
      executions: [],
      runs: [],
      defects: [],
    };

    console.log('=== 开始查询测试计划相关数据 ===');
    console.log('输入参数:', JSON.stringify(body, null, 2));

    // 确定查询方式和获取测试计划ID列表
    let finalPlanIds = [];
    let queryMethod = '';

    if (versionKeys && versionKeys.length > 0) {
      // 优先级1：版本事项查询
      queryMethod = 'version';
      console.log(`\n--- 查询方式：版本事项 [${versionKeys.join(', ')}] ---`);

      // 先查询版本事项数据
      const versionIql = `key in [${versionKeys.map(key => `'${key}'`).join(',')}]`;
      console.log('查询版本事项 IQL:', versionIql);

      const versionResult = await iqlSearch({
        iql: versionIql,
        displayContext: 'test_manager',
        limit: 9999,
      });

      if (versionResult?.payload?.items) {
        result.versions = versionResult.payload.items;
        console.log(`✅ 查询到 ${result.versions.length} 个版本事项`);
      }

      // 然后查询版本下的需求事项
      const versionReqIqls = versionKeys
        .map(key => `item in hierarchicalQuery('${key}', 0, 1)`)
        .join(' or ');
      const versionReqIql = `(${versionReqIqls}) and 'test_manager_type' != 'TestPlan'`;
      console.log('版本->需求层级查询 IQL:', versionReqIql);

      const versionReqResult = await iqlSearch({
        iql: versionReqIql,
        displayContext: 'test_manager',
        limit: 9999,
      });

      if (versionReqResult?.payload?.items) {
        result.requirements = versionReqResult.payload.items;
        console.log(`✅ 从版本事项查询到 ${result.requirements.length} 个需求事项`);
      }

      // 最后查询版本下的测试计划（包含直接在版本下的计划和通过需求的计划）
      const versionPlanIqls = versionKeys
        .map(key => `item in hierarchicalQuery('${key}', 0, 2)`)
        .join(' or ');
      const versionPlanIql = `(${versionPlanIqls}) and 'test_manager_type' = 'TestPlan'`;
      console.log('版本->计划层级查询 IQL:', versionPlanIql);

      const versionPlanResult = await iqlSearch({
        iql: versionPlanIql,
        displayContext: 'test_manager',
        limit: 9999,
      });

      if (versionPlanResult?.payload?.items) {
        finalPlanIds = versionPlanResult.payload.items.map(plan => plan.id);
        console.log(`✅ 从版本事项查询到 ${finalPlanIds.length} 个测试计划:`, finalPlanIds);
      } else {
        console.log('⚠️ 版本事项下未找到测试计划');
      }
    } else if (requirementKeys && requirementKeys.length > 0) {
      // 优先级2：需求事项查询
      queryMethod = 'requirement';
      console.log(`\n--- 查询方式：需求事项 [${requirementKeys.join(', ')}] ---`);

      // 先查询需求事项数据
      const requirementIql = `key in [${requirementKeys.map(key => `'${key}'`).join(',')}]`;
      console.log('查询需求事项 IQL:', requirementIql);

      const requirementResult = await iqlSearch({
        iql: requirementIql,
        displayContext: 'test_manager',
        limit: 9999,
      });

      if (requirementResult?.payload?.items) {
        result.requirements = requirementResult.payload.items;
        console.log(`✅ 查询到 ${result.requirements.length} 个需求事项`);
      }

      // 然后查询需求下的测试计划
      const reqPlanIqls = requirementKeys
        .map(key => `item in hierarchicalQuery('${key}', 0, 1)`)
        .join(' or ');
      const reqPlanIql = `(${reqPlanIqls}) and 'test_manager_type' = 'TestPlan'`;
      console.log('需求->计划层级查询 IQL:', reqPlanIql);

      const reqPlanResult = await iqlSearch({
        iql: reqPlanIql,
        displayContext: 'test_manager',
        limit: 9999,
      });

      if (reqPlanResult?.payload?.items) {
        finalPlanIds = reqPlanResult.payload.items.map(plan => plan.id);
        console.log(`✅ 从需求事项查询到 ${finalPlanIds.length} 个测试计划:`, finalPlanIds);
      } else {
        console.log('⚠️ 需求事项下未找到测试计划');
      }
    } else if (planKeys && planKeys.length > 0) {
      // 优先级3：直接提供测试计划key
      queryMethod = 'direct';
      console.log(`\n--- 查询方式：直接提供测试计划key ---`);
      console.log('测试计划key列表:', planKeys);

      const directPlanIql = `'test_manager_type' = 'TestPlan' and key in [${planKeys
        .map(key => `'${key}'`)
        .join(',')}]`;
      console.log('计划key->计划查询 IQL:', directPlanIql);

      const directPlanResult = await iqlSearch({
        iql: directPlanIql,
        displayContext: 'test_manager',
        limit: 9999,
      });

      if (directPlanResult?.payload?.items) {
        finalPlanIds = directPlanResult.payload.items.map(plan => plan.id);
        console.log(`✅ 从测试计划key查询到 ${finalPlanIds.length} 个测试计划:`, finalPlanIds);
      } else {
        console.log('⚠️ 未找到对应的测试计划');
      }
    }

    // 如果没有找到测试计划，直接返回
    if (finalPlanIds.length === 0) {
      console.log('⚠️ 未找到任何测试计划，终止查询');
      return {
        success: true,
        message: '未找到相关测试计划',
        data: result,
        queryMethod,
        statistics: {
          versionCount: 0,
          requirementCount: 0,
          planCount: 0,
          executionCount: 0,
          runCount: 0,
          defectCount: 0,
        },
      };
    }

    // 0. 查询测试计划详情
    console.log('\n--- 第0步：查询测试计划详情 ---');
    const planIql = `'test_manager_type' = 'TestPlan' and id in [${finalPlanIds
      .map(id => `'${id}'`)
      .join(',')}]`;
    console.log('查询测试计划详情 IQL:', planIql);

    const planResult = await iqlSearch({
      iql: planIql,
      displayContext: 'test_manager',
      limit: 9999,
    });

    console.log('测试计划查询结果:', {
      success: !!planResult?.payload,
      itemCount: planResult?.payload?.items?.length || 0,
      hasError: !!planResult?.error,
    });

    if (planResult?.payload?.items) {
      result.plans = planResult.payload.items;
      console.log(`✅ 查询到 ${result.plans.length} 个测试计划`);
      console.log(
        '测试计划详情:',
        result.plans.map(plan => ({ id: plan.id, key: plan.key, name: plan.name })),
      );
    } else {
      console.log('⚠️ 未查询到任何测试计划');
      if (planResult?.error) {
        console.error('测试计划查询错误:', planResult.error);
      }
    }

    // 1. 查询测试执行任务
    let executionIds = [];
    if (includeExecutions) {
      console.log('\n--- 第1步：查询测试执行任务 ---');
      const executionIql = `'test_manager_linkItems' in [${finalPlanIds
        .map(id => `'${id}'`)
        .join(
          ',',
        )}] and 'test_manager_linkType' = 'ExecutionLinkPlan' and 'test_manager_type' = 'TestExecution'`;
      console.log('查询测试执行任务 IQL:', executionIql);

      const executionResult = await iqlSearch({
        iql: executionIql,
        displayContext: 'test_manager',
        limit: 9999,
      });

      console.log('测试执行任务查询结果:', {
        success: !!executionResult?.payload,
        itemCount: executionResult?.payload?.items?.length || 0,
        hasError: !!executionResult?.error,
      });

      if (executionResult?.payload?.items) {
        result.executions = executionResult.payload.items;
        executionIds = result.executions.map(exec => exec.id);
        console.log(`✅ 查询到 ${result.executions.length} 个测试执行任务`);
        console.log(
          '测试执行任务详情:',
          result.executions.map(exec => ({
            id: exec.id,
            key: exec.key,
            name: exec.name,
            linkItems: exec.values?.r_test_manager_linkItems,
          })),
        );
        console.log('提取的执行任务ID列表:', executionIds);
      } else {
        console.log('⚠️ 未查询到任何测试执行任务');
        if (executionResult?.error) {
          console.error('测试执行任务查询错误:', executionResult.error);
        }
      }
    } else {
      console.log('\n--- 第1步：跳过查询测试执行任务 ---');
    }

    // 2. 查询测试执行
    let defectIds = [];
    if (includeRuns && executionIds.length > 0) {
      console.log('\n--- 第2步：查询测试执行 ---');
      const runIql = `'test_manager_type' = 'TestRun' and 'test_manager_linkItems' in [${executionIds
        .map(id => `'${id}'`)
        .join(',')}] and 'test_manager_linkType' = 'RunLinkExecution'`;
      console.log('查询测试执行 IQL:', runIql);

      const runResult = await iqlSearch({
        iql: runIql,
        displayContext: 'test_manager',
        limit: 9999,
      });

      console.log('测试执行查询结果:', {
        success: !!runResult?.payload,
        itemCount: runResult?.payload?.items?.length || 0,
        hasError: !!runResult?.error,
      });

      if (runResult?.payload?.items) {
        result.runs = runResult.payload.items;
        console.log(`✅ 查询到 ${result.runs.length} 个测试执行`);
        console.log(
          '测试执行详情:',
          result.runs.map(run => ({
            id: run.id,
            key: run.key,
            name: run.name,
            linkItems: run.values?.r_test_manager_linkItems,
            status: run.values?.r_test_manager_status,
            hasRunDetail: !!run.values?.r_test_manager_runDetail,
          })),
        );

        // 3. 提取缺陷ID
        if (includeDefects) {
          console.log('\n--- 第3步：从测试执行中提取缺陷ID ---');
          const defectIdSet = new Set();
          result.runs.forEach((run, index) => {
            try {
              const runDetailStr = run.values?.r_test_manager_runDetail;
              console.log(`处理第${index + 1}个测试执行 [${run.id}]:`);
              console.log('  - runDetail原始数据:', runDetailStr);

              if (runDetailStr) {
                const runDetail = JSON.parse(runDetailStr);
                console.log('  - 解析后的runDetail:', runDetail);

                if (runDetail.defectItemIds && Array.isArray(runDetail.defectItemIds)) {
                  console.log(`  - 发现缺陷ID: ${runDetail.defectItemIds.join(', ')}`);
                  runDetail.defectItemIds.forEach(defectId => defectIdSet.add(defectId));
                } else {
                  console.log('  - 无缺陷关联');
                }
              } else {
                console.log('  - runDetail为空');
              }
            } catch (error) {
              console.warn(`  - ⚠️ 解析runDetail失败:`, error.message);
            }
          });

          defectIds = Array.from(defectIdSet);
          console.log(`✅ 最终提取到 ${defectIds.length} 个唯一缺陷ID:`, defectIds);
        }
      } else {
        console.log('⚠️ 未查询到任何测试执行');
        if (runResult?.error) {
          console.error('测试执行查询错误:', runResult.error);
        }
      }
    } else if (!includeRuns) {
      console.log('\n--- 第2步：跳过查询测试执行 ---');
    } else if (executionIds.length === 0) {
      console.log('\n--- 第2步：由于没有执行任务，跳过查询测试执行 ---');
    }

    // 4. 查询缺陷
    if (includeDefects && defectIds.length > 0) {
      console.log('\n--- 第4步：查询缺陷 ---');
      const defectIql = `id in [${defectIds.map(id => `'${id}'`).join(',')}]`;
      console.log('查询缺陷 IQL:', defectIql);

      const defectResult = await iqlSearch({
        iql: defectIql,
        displayContext: 'test_manager',
        limit: 9999,
      });

      console.log('缺陷查询结果:', {
        success: !!defectResult?.payload,
        itemCount: defectResult?.payload?.items?.length || 0,
        hasError: !!defectResult?.error,
      });

      if (defectResult?.payload?.items) {
        result.defects = defectResult.payload.items;
        console.log(`✅ 查询到 ${result.defects.length} 个缺陷`);
        console.log(
          '缺陷详情:',
          result.defects.map(defect => ({
            id: defect.id,
            key: defect.key,
            name: defect.name,
            status: defect.status?.name,
            itemType: defect.itemType?.name,
          })),
        );
      } else {
        console.log('⚠️ 未查询到任何缺陷');
        if (defectResult?.error) {
          console.error('缺陷查询错误:', defectResult.error);
        }
      }
    } else if (!includeDefects) {
      console.log('\n--- 第4步：跳过查询缺陷 ---');
    } else if (defectIds.length === 0) {
      console.log('\n--- 第4步：由于没有缺陷ID，跳过查询缺陷 ---');
    }

    const summary = `成功查询到: 版本事项${result.versions.length}个, 需求事项${result.requirements.length}个, 测试计划${result.plans.length}个, 执行任务${result.executions.length}个, 测试执行${result.runs.length}个, 缺陷${result.defects.length}个`;
    console.log('\n=== 查询完成 ===');
    console.log(summary);
    console.log('最终统计:', {
      versionCount: result.versions.length,
      requirementCount: result.requirements.length,
      planCount: result.plans.length,
      executionCount: result.executions.length,
      runCount: result.runs.length,
      defectCount: result.defects.length,
    });

    return {
      success: true,
      message: summary,
      data: result,
      queryMethod, // 记录使用的查询方式
      statistics: {
        versionCount: result.versions.length,
        requirementCount: result.requirements.length,
        planCount: result.plans.length,
        executionCount: result.executions.length,
        runCount: result.runs.length,
        defectCount: result.defects.length,
      },
    };
  } catch (error) {
    console.error('\n=== 查询异常 ===');
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);
    console.error('错误对象:', error);

    return {
      success: false,
      message: `查询失败: ${error.message || '未知错误'}`,
      data: {
        versions: [],
        requirements: [],
        plans: [],
        executions: [],
        runs: [],
        defects: [],
      },
      error: error.toString(),
    };
  }
};

export { runScript };
