import Parse from '@/lib/parse';
import { Test, Item, Workspace } from '../models';
import { ICommonRes } from './detail';
import { TestType } from '@/lib/constants';
import series from 'async/series';

export const GetTestRunsById = (objectId: string): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const query = new Parse.Query(Test);
    const reference = Item.createWithoutData(objectId);
    query.equalTo('reference', reference);
    query.equalTo('type', '1');
    console.log('执行到这里了1232131231231');
    query
      .first()
      .then(
        res => {
          console.log('res来到这里？？', res);
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
        console.log('这里吗');
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
  type: 1 | 2 | 3 | 4,
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
        const callTestPromises = [];
        callTestIds.forEach(async item => {
          callTestPromises.push(callback => {
            FetchAllTestStepByTestId(item, callback);
          });
        });

        series(callTestPromises)
          .then(res => {
            console.log('res-------------------', res, step);
            resolve({
              success: true,
              data: step,
            });
            callback && callback(null, step);
          })
          .catch(err => console.log('eeeee', err));
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
