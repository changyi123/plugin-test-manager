import Parse from '@/lib/parse';
import fetch from '@/lib/utils/fetch';
import { TestStep as ITestStep } from '@/pages/panel/components/detail';
import { TestExecution, Test, Item, TestConfig, Workspace, ItemType } from '../models';

export interface ICommonRes<T = any> {
  success: boolean;
  message?: string;
  data?: T;
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
          message: err,
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
          message: err,
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
          message: err,
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
            message: err,
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
        const step = res?.toJSON() || [];
        const callTestIds = [];
        step?.steps?.forEach((item, index) => {
          item.id = `${step.objectId}_${index}`;
          item.objectId = `${step.objectId}_${index}`;
          item.isEdit = false;
          item.isExpand = true;
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
          return;
        }
        const query = new Parse.Query(Item).containedIn('objectId', callTestIds);
        query.find().then(res => {
          const items = res?.map(item => item?.toJSON()) || [];
          items?.forEach(item => {
            step?.steps?.forEach(item2 => {
              if (item.objectId === item2.callTestId) {
                item2.itemObject = item;
              }
            });
          });
          console.log('step', step);
          resolve({
            success: true,
            data: step,
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
          message: err,
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
              message: err,
            });
          },
        );
      },
      error: err => {
        reject({
          success: false,
          message: err,
        });
      },
    });
  });
};

export const GetTestConfigFromWorkspaceId = (workspaceId: string): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const configQuery = new Parse.Query(TestConfig);
    const workspace = Workspace.createWithoutData(workspaceId);
    configQuery.equalTo('workspace', workspace);
    configQuery
      .first()
      .then(configObject => {
        if (!configObject) {
          reject({
            success: false,
            message: '暂无找到当前空间测试用例的映射关系',
          });
          return;
        }
        console.log('configObject.toJSON()', configObject);
        resolve({
          success: true,
          data: configObject.toJSON(),
        });
      })
      .catch(err => {
        reject({
          success: false,
          message: err,
        });
      });
  });
};

export const GetItemTypeFromId = (itemTypeId: string): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const itemTypeQuery = ItemType.createWithoutData(itemTypeId);
    itemTypeQuery
      .fetch()
      .then(itemTypeObject => {
        resolve({
          success: true,
          data: itemTypeObject.toJSON(),
        });
      })
      .catch(err => {
        reject({
          success: false,
          message: err,
        });
      });
  });
};

export interface Item {
  key?: string;
  name?: string;
  objectId?: string;
  tenant?: string;
}

export const GetItemFromItemType = (itemTypeName: string, name?: string): Promise<Array<Item>> => {
  return new Promise((resolve, reject) => {
    const baseIql = '(所属空间 is not empty) order by  创建时间 desc';
    fetch
      .post('/parse/api/search', {
        from: 0,
        iql: name
          ? `(标题 ~ '${name}') and ('事项类型' = ${itemTypeName}) and ${baseIql}`
          : `('事项类型' = ${itemTypeName}) and ${baseIql}`,
        size: 50,
      })
      .then(res => {
        const { data } = res;
        resolve(data?.payload?.items || []);
      })
      .catch(err => {
        reject({
          success: false,
          message: err,
        });
      });
  });
};
