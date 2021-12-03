import { TestExecution, TestStep } from '../models';
import Parse from '@/lib/parse';
import { TestStep as ITestStep } from '@/pages/detail/components/detail';

interface ICommonRes {
  success: boolean;
  msg?: string;
  data?: any;
}

export const PostAddTestExecution = (req: ITestStep): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const query = new TestExecution();
    query.save(req).then(
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
          msg: err,
        });
      },
    );
  });
};

export const PostEditTestExecution = (req: ITestStep): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const { objectId, action, data, result } = req;
    const execution = TestExecution.createWithoutData(objectId);
    execution.set({
      action,
      data,
      result,
    });
    execution.save().then(
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
          msg: err,
        });
      },
    );
  });
};

export const fetchTestExecution = (resource: string): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const query = new Parse.Query(TestExecution);
    query.equalTo('resource', resource);
    query.find().then(
      res => {
        resolve({
          success: true,
          data: res.map(item => {
            const obj = item.toJSON();
            obj.id = obj.objectId;
            obj.isExpand = true;
            return obj;
          }),
        });
      },
      err => {
        reject({
          success: false,
          data: { ...err },
          msg: err,
        });
      },
    );
  });
};

export const deleteTestExecution = (id: string): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    TestExecution.createWithoutData(id)
      .destroy()
      .then(
        () => {
          resolve({
            success: true,
          });
        },
        err => {
          reject({
            success: false,
            msg: err,
          });
        },
      );
  });
};

export const fetchTestSteps = (resource: string): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const query = new Parse.Query(TestStep);
    query.equalTo('objectId', resource);
    query.find().then(
      res => {
        const stepsArray = [];
        res.forEach(item => {
          const obj = item.toJSON();
          obj?.steps?.forEach((item2, index2) => {
            item2.id = `${obj.objectId}_${index2}`;
            item2.objectId = `${obj.objectId}_${index2}`;
            item2.isEdit = false;
            stepsArray.push(item2);
          });
        });
        resolve({
          success: true,
          data: stepsArray,
        });
      },
      err => {
        reject({
          success: false,
          data: { ...err },
          msg: err,
        });
      },
    );
  });
};

export const saveOrUpdateTestStep = (
  testSteps: Array<ITestStep>,
  resource?: string,
  id?: string,
): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const step = TestStep.createWithoutData(id || 'YBkC6luOfw');
    step.set({
      steps: testSteps,
      resource: resource || 'WDDKjgIg8G',
    });
    step.save().then(
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
          msg: err,
        });
      },
    );
  });
};
