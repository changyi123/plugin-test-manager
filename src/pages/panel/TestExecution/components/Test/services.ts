import { Test } from '@/lib/models';
import { hasArrayItem } from '@/lib/utils/helper';
import { TestType, TestRelationType } from '@/lib/constants';
import {
  createTestRelation,
  createTestEntities,
  getTestEntitiesByRelation,
  getTestEntityByItemId,
} from '@/lib/api/common';
import { FetchAllTestStepByTestId } from '@/lib/api/runs';
import series from 'async/series';

/**
 * 创建测试运行
 */
export const createTestRunService = async (params: {
  workspaceKey: string;
  testDetailIds: string[];
}) => {
  const { workspaceKey, testDetailIds } = params;
  const entities = testDetailIds.map(id => ({
    type: TestType.TestRun,
    workspaceKey,
    fields: {
      runReferenceDetail: Test.createWithoutData(id),
    },
  }));
  return createTestEntities(entities);
};

// 创建测试执行
export const createTestExecutionService = async (params: {
  workspaceKey: string;
  testPlan: Parse.Object;
  testExecution: Parse.Object;
  relTestDetailIds?: string[];
}) => {
  /**
   *  s1. 查找所有的关联的测试用例
   *  s2. 创建测试执行事项
   *  s3. 创建测试运行实体
   *  s4. 处理关联关系，测试计划关联测试执行，测试执行关联测试运行
   */

  const { workspaceKey, testPlan, testExecution } = params;
  let relTestDetailIds = params.relTestDetailIds || [];

  // 没有 relTestDetails 则创建全部
  if (!hasArrayItem(relTestDetailIds)) {
    const res = await getTestEntitiesByRelation(
      TestRelationType.PlanRelDetail,
      { from: testPlan },
      // TODO: fetch all
      { queryParams: { limit: 9999 } },
    );
    relTestDetailIds = res.list.map(item => item.objectId);
  }

  const testRunEntities = await createTestRunService({
    workspaceKey,
    testDetailIds: relTestDetailIds,
  });

  const testPlanExecutionRelations = [
    {
      from: testPlan,
      to: testExecution,
      relationType: TestRelationType.PlanRelExecution,
    },
  ];

  // 测试执行&运行关联关系
  const testExecutionRunRelations = testRunEntities.map(runEntity => ({
    relationType: TestRelationType.ExecutionRelRun,
    from: testExecution,
    to: runEntity,
  }));

  // todo: 创建测试运行
  const relations = [].concat(testPlanExecutionRelations, testExecutionRunRelations);

  await createTestRelation(relations);

  return testExecution;
};

// 将测试用例添加至测试计划
export const addTestDetailToPlanService = async (params: {
  testPlan: Parse.Object;
  testDetailIds: string[];
}) => {
  const relations = params.testDetailIds.map(testDetailId => ({
    relationType: TestRelationType.PlanRelDetail,
    from: params.testPlan,
    to: testDetailId,
  }));
  return createTestRelation(relations);
};

// 将测试run添加至测试执行
export const addTestRunToExecution = async (params: {
  testExecution: Parse.Object;
  testDetailIds: string[];
}) => {
  return new Promise((resolve, reject) => {
    const callTestPromises = params.testDetailIds.map(
      item => callback => createTestRunByItemId(item, callback),
    );

    series(callTestPromises)
      .then((res: Array<Parse.Object>) => {
        const relations = res?.map(testRunObj => ({
          relationType: TestRelationType.ExecutionRelRun,
          from: params.testExecution,
          to: testRunObj.id,
        }));
        console.log('relations', relations);
        return createTestRelation(relations);
      })
      .then(res => {
        console.log('resaddTestRunToExecution-------', res);
        resolve({});
      })
      .catch(() => {
        reject({});
      });
  });
  // const relations = params.testDetailIds.map(testDetailId => ({
  //   relationType: TestRelationType.ExecutionRelRun,
  //   from: params.testExecution,
  //   to: testDetailId,
  // }));
  // return createTestRelation(relations);
};

export const createTestRunByItemId = async (
  itemId: string,
  callback?: (nil: null, data: any) => void,
) => {
  return new Promise((resolve, reject) => {
    console.log('laidao as dasd asd按时的撒旦阿萨德');
    getTestEntityByItemId(itemId).then(testEntity => {
      console.log('testEntity----------', testEntity);
      return FetchAllTestStepByTestId(itemId)
        .then(({ data: testRuns }) => {
          console.log('testRuns---------', testEntity?.toJSON(), testRuns, {
            type: TestType.TestRun,
            workspaceKey: testEntity?.toJSON()?.workspaceKey,
            fields: {
              runDetail: {
                runs: testRuns || {},
              },
              runReferenceDetail: Test.createWithoutData(testRuns?.objectId),
            },
          });
          return createTestEntities([
            {
              type: TestType.TestRun,
              workspaceKey: testEntity?.toJSON()?.workspaceKey,
              fields: {
                runDetail: {
                  runs: testRuns || {},
                },
                runReferenceDetail: Test.createWithoutData(testRuns?.data?.objectId),
              },
            },
          ]);
        })
        .then((data: Array<Parse.Object>) => {
          console.log('data-----------', data);
          resolve(data[0]);
          callback && callback(null, data[0]);
        })
        .catch(e => {
          reject({ ...e });
        });
    });
  });
};
