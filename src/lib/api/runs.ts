import Parse from '@/lib/parse';
import { Test, Item, Workspace } from '../models';
import { ICommonRes } from './detail';
import { TestType } from '@/lib/constants';
import series from 'async/series';
import { useRequest } from 'ahooks';

export const GetTestRunsById = (objectId: string): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const query = new Parse.Query(Test);
    const reference = Item.createWithoutData(objectId);
    query.equalTo('reference', reference);
    query.equalTo('type', '1');
    query
      .first()
      .then(
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
    query.equalTo('reference', reference).equalTo('type', TestType.TestRun);
    console.log('id', id);
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
            console.log('res-------------------', res, stepBackList);
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

export const CreateTestExecutionWithTestRun = () => {
  const { run, data: testRuns } = useRequest(() => FetchAllTestStepByTestId('beAxtdQda1'), {
    manual: true,
  });

  const { data, loading, error } = useRequest(
    () =>
      SaveOrUpdateTest(
        {
          run_detail: {
            runs: testRuns,
          },
        },
        TestType.TestRun,
      ),
    {
      ready: !!testRuns,
    },
  );

  return {
    run,
    loading,
    data,
    error,
  };
};
