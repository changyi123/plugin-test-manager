import Parse from '@/lib/parse';
import { Test, Item, Workspace, ItemType } from '../models';
import { ICommonRes } from './detail';
import { TestType, TestRelationType } from '@/lib/constants';
import {
  createTestEntities,
  createTestRelation,
  getTestEntitiesByRelation,
} from '@/lib/api/common';
import series from 'async/series';
import { useRequest } from 'ahooks';

export const GetTestRunsById = (itemId: string): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const query = new Parse.Query(Test);
    const reference = Test.createWithoutData(itemId);
    query.equalTo('reference', reference);
    query.equalTo('type', TestType.TestDetail);
    query
      .first()
      .then(
        res => {
          const runReferenceDetail = Test.createWithoutData(res.id);
          const testRunQuery = new Parse.Query(Test);
          testRunQuery.equalTo('reference', reference);
          testRunQuery.equalTo('type', TestType.TestRun);
          testRunQuery.equalTo('runReferenceDetail', runReferenceDetail);
          testRunQuery.find().then(async testRunRes => {
            // const testRuns = testRunRes?.map(item => item.toJSON());
            const data = await getTestEntitiesByRelation(
              TestRelationType.ExecutionRelRun,
              { to: testRunRes[0] },
              { fillItemData: true },
            );
            console.log('data---------', data);
            resolve({
              success: true,
              data: testRunRes?.map(item => item.toJSON()),
            });
          });
        },
        err => {
          reject({
            success: false,
            data: { ...err },
            message: err,
          });
        },
      )
      .catch(() => {
        // console.log('这里吗');
      });
  });
};

export const GetWorkspaceList = (): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const query = new Parse.Query(Workspace).include('workspaceScheme.itemTypeScheme').limit(999);
    query.find().then(
      res => {
        resolve({
          success: true,
          data: res?.map(item => item.toJSON()),
        });
      },
      err => {
        reject({
          success: false,
          data: { ...err },
          message: err,
        });
      },
    );
  });
};

export const SaveOrUpdateTest = (
  obj: any,
  type: TestType,
  id?: string,
  resource?: string, // 关联测试用例Id
): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const testObj = Test.createWithoutData(id);
    const reference = Item.createWithoutData(resource);
    testObj.set({
      ...obj,
      reference,
      type,
    });
    testObj.save().then(
      res => {
        resolve({
          success: true,
          data: { ...res },
        });
      },
      err => {
        reject({
          success: false,
          data: { ...err },
          message: err,
        });
      },
    );
  });
};

export const FetchAllTestStepByTestId = (
  id: string,
  callback?: (nil: null, data: any) => void,
): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const query = new Parse.Query(Test);
    const reference = Item.createWithoutData(id);
    query.equalTo('reference', reference).equalTo('type', TestType.TestDetail);
    query.first().then(
      res => {
        const step = res?.toJSON() || [];
        const callTestIds = [];
        step?.steps?.forEach((item, index) => {
          item.id = `${step.objectId}_${index}`;
          if (item.callTestId) {
            callTestIds.push(item.callTestId);
          }
        });
        // 如果没有继承测试用例
        if (!callTestIds.length) {
          resolve({
            success: true,
            data: step,
          });
          callback && callback(null, step);
          return;
        }
        const callTestPromises = callTestIds.map(
          item => callback => FetchAllTestStepByTestId(item, callback),
        );

        series(callTestPromises)
          .then(res => {
            const stepBackList = [];
            step?.steps?.forEach(item => {
              if (item.callTestId && item.callTestId === res[0]?.reference?.objectId) {
                res[0]?.steps?.forEach(item => {
                  stepBackList.push(item);
                });
                return;
              }
              stepBackList.push(item);
            });
            step.steps = stepBackList;
            resolve({
              success: true,
              data: step,
            });
            callback && callback(null, step);
          })
          .catch(() => {});
      },
      err => {
        reject({
          success: false,
          data: { ...err },
          message: err,
        });
      },
    );
  });
};

interface CreateTestExecutionReq {
  workspaceId: string;
  workspaceKey: string;
  itemId: string;
  itemTypeId: string;
  name: string;
}

let workspaceKeyBak = '';
let itemIdBak = '';

export const CreateTestExecutionWithTestRun = () => {
  let globalLoading = false;
  const {
    run,
    data: itemForTestExecution,
    loading: startLoading,
  } = useRequest(
    ({ workspaceId, workspaceKey, itemId, name, itemTypeId }: CreateTestExecutionReq) => {
      workspaceKeyBak = workspaceKey;
      itemIdBak = itemId;
      const workspaceObj = Workspace.createWithoutData(workspaceId);
      const itemTypeObj = ItemType.createWithoutData(itemTypeId);
      const itemQuery = new Item();
      itemQuery.set({
        itemType: itemTypeObj,
        workspace: workspaceObj,
        name,
      });
      return itemQuery.save();
    },
    {
      manual: true,
    },
  );
  if (startLoading) {
    globalLoading = true;
  }

  const { data: testRuns } = useRequest(() => FetchAllTestStepByTestId(itemIdBak), {
    ready: !!itemForTestExecution,
  });

  const { data: testRunObj } = useRequest(
    () =>
      createTestEntities([
        {
          type: TestType.TestRun,
          workspaceKey: workspaceKeyBak,
          fields: {
            runDetail: {
              runs: testRuns.data,
            },
            reference: Item.createWithoutData(itemIdBak),
            runReferenceDetail: Test.createWithoutData(testRuns?.data?.objectId),
          },
        },
        {
          type: TestType.TestExecution,
          workspaceKey: workspaceKeyBak,
          fields: {
            reference: itemForTestExecution,
          },
        },
      ]),
    {
      ready: !!testRuns,
    },
  );

  const { data: testRelationObj, loading } = useRequest(
    () =>
      createTestRelation([
        {
          relationType: TestRelationType.ExecutionRelRun,
          from: testRunObj[1],
          to: testRunObj[0],
        },
      ]),
    {
      ready: !!testRunObj,
    },
  );
  if (!loading && testRelationObj) {
    globalLoading = false;
  }
  console.log('testRuns', testRuns);

  return {
    run,
    loading: globalLoading,
    data: testRelationObj,
    // error,
  };
};
