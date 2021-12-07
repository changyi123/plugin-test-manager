import { TestExecution, Test, Item, TestConfig, Workspace } from '../models';
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
    const query = new Parse.Query(Test);
    const reference = Item.createWithoutData(resource);
    query.equalTo('reference', reference);
    query.first().then(
      res => {
        const step = res?.toJSON();
        step?.steps?.forEach((item, index) => {
          item.id = `${step.objectId}_${index}`;
          item.objectId = `${step.objectId}_${index}`;
          item.isEdit = false;
        });
        resolve({
          success: true,
          data: step,
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
  testStepId?: string,
  resource?: string, // 关联测试用例Id
): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const step = Test.createWithoutData(testStepId);
    const reference = Item.createWithoutData(resource);
    testSteps.forEach((item, index) => {
      item.id = `${resource}_${index}`;
      item.objectId = `${resource}_${index}`;
    });
    step.set({
      steps: testSteps,
      reference,
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

export interface TestConfig {
  test?: string;
  testPrecondition?: string;
  testSet?: string;
  testPlan?: string;
  testExecution?: string;
}

export const saveOrUpdateTestConfig = (
  workspaceId: string,
  config: TestConfig,
): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const configQuery = new Parse.Query(TestConfig);
    const workspace = Workspace.createWithoutData(workspaceId);
    configQuery.equalTo('workspace', workspace);
    configQuery.first({
      success: configObject => {
        configObject.set('itemTypeMap', config);
        configObject.save().then(
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
      },
      error: err => {
        reject({
          success: false,
          msg: err,
        });
      },
    });
  });
};

export const fetchTestConfig = (workspaceId: string): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const configQuery = new Parse.Query(TestConfig);
    const workspace = Workspace.createWithoutData(workspaceId);
    configQuery.equalTo('workspace', workspace);
    configQuery.first({
      success: configObject => {
        resolve({
          success: true,
          data: configObject.toJSON(),
        });
      },
      error: err => {
        reject({
          success: false,
          msg: err,
        });
      },
    });
  });
};

// export const fetchItemFromItemType = (itemTypeId: string, itemName?: string): Promise<ICommonRes> => {
//   return new Promise((resolve, reject) => {
//     const configQuery = new Parse.Query(TestConfig);
//     const workspace = Workspace.createWithoutData(workspaceId);
//     configQuery.equalTo('workspace', workspace);
//     configQuery.first({
//       success: configObject => {
//         resolve({
//           success: true,
//           data: configObject.toJSON(),
//         });
//       },
//       error: err => {
//         reject({
//           success: false,
//           msg: err,
//         });
//       },
//     });
//   });
// }
