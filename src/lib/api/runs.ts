import Parse from '@/lib/parse';
import { Test, Item, Workspace, ItemType, ItemLink, ItemLinkType } from '../models';
import { ICommonRes } from './detail';
import { TestType, TestRelationType } from '@/lib/constants';
import {
  createTestEntities,
  createTestRelation,
  getTestEntitiesByRelation,
} from '@/lib/api/common';
import { pointerTransfer } from '@/lib/utils/helper';
import series from 'async/series';
import { useRequest } from 'ahooks';
import { IRunDetail } from '@/pages/run';
import { Status } from '@/lib/types/Test';
import { getItemByIQL } from '@/lib/api/proxima';

export const GetTestRunsById = (itemId: string): Promise<{ list: any; total: number }> => {
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
          testRunQuery.equalTo('type', TestType.TestRun);
          testRunQuery.equalTo('runReferenceDetail', runReferenceDetail);
          testRunQuery.find().then(async testRunRes => {
            // const testRuns = testRunRes?.map(item => item.toJSON());
            const { list: data } = await getTestEntitiesByRelation(
              TestRelationType.ExecutionRelRun,
              { to: testRunRes },
              { fillItemData: true },
            );
            const dataBak = [];
            data.forEach((item, index) => {
              item.referenceId = item.reference?.objectId;
              item.referenceKey = item.reference?.key;
              item.referenceName = item.reference?.name;
              item.key = index + 1;
              item.status = testRunRes[index].toJSON().status;
              item.testRunId = testRunRes[index].toJSON().objectId;
              dataBak.push(item);
            });
            // console.log('dataBak', dataBak);
            // console.log(
            //   'data---------',
            //   testRunRes.map(item => item.toJSON()),
            // );
            resolve({
              list: dataBak,
              total: dataBak.length,
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
      .catch(() => {});
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

export const checkHasDepsLink = async (
  itemId: string,
  extendItemId: string,
  links?: string[],
  callback?: (nil: any, data: any) => void,
): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    if (itemId === extendItemId) {
      reject({
        success: false,
        message: '不能关联本身',
      });
    }
    const query = new Parse.Query(Test);
    const reference = Item.createWithoutData(extendItemId);
    query.equalTo('reference', reference).equalTo('type', TestType.TestDetail);
    query.first().then(
      res => {
        const step = res?.toJSON() || [];
        const callTestIds = [];
        const depLinks = links ?? [itemId];
        let hasDepLink = false;
        step?.steps?.forEach((item, index) => {
          item.id = `${step.objectId}_${index}`;
          if (item.callTestId) {
            callTestIds.push(item.callTestId);
          }
          if (depLinks.includes(item.callTestId)) {
            hasDepLink = true;
          }
        });
        if (hasDepLink) {
          const query = new Parse.Query(Test);
          const reference = Item.createWithoutData(extendItemId);
          query.equalTo('reference', reference);
          query
            .include('reference')
            .first()
            .then(
              res => {
                const TestDetail = res.toJSON();
                const { name } = TestDetail?.reference;
                callback &&
                  callback(
                    {
                      success: false,
                      message: `与 ${name} 存在循环依赖`,
                    },
                    null,
                  );
                reject({
                  success: false,
                  message: `与 ${name} 存在循环依赖`,
                });
              },
              () => {
                callback &&
                  callback(
                    {
                      success: false,
                      message: `存在循环依赖`,
                    },
                    null,
                  );
                reject({
                  success: false,
                  message: '存在循环依赖',
                });
              },
            );
          return;
        }
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
          item => callback => checkHasDepsLink(extendItemId, item, depLinks, callback),
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
          .catch(error => {
            reject({
              success: false,
              message: error.message,
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
  // 1.创建一个事项
  // 2.根据测试用例的itemId拿到全部测试步骤
  // 3.创建TestRun和TestExecution
  // 4.创建TestRun和TestExecution的关联关系
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
              runs: {
                steps: testRuns.data.steps || [],
              },
            },
            runReferenceDetail: Test.createWithoutData(testRuns?.data?.objectId),
          },
        },
        {
          type: TestType.TestExecution,
          workspaceKey: workspaceKeyBak,
          fields: {
            reference: Item.createWithoutData(
              (itemForTestExecution as any)?.toJSON()?.reference?.objectId,
            ),
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

  return {
    run,
    loading: globalLoading,
    data: testRelationObj,
    // error,
  };
};

export const CreateTestExecutionWithItemModal = (
  itemId: string,
  testExecutionEntity: Parse.Object,
) => {
  return new Promise((resolve, reject) => {
    FetchAllTestStepByTestId(itemId)
      .then(testRuns => {
        return createTestEntities([
          {
            type: TestType.TestRun,
            workspaceKey: testRuns?.data?.reference?.workspace?.key,
            fields: {
              runDetail: {
                runs: {
                  steps: testRuns?.data?.steps || [],
                },
              },
              runReferenceDetail: Test.createWithoutData(testRuns?.data?.objectId),
            },
          },
        ]);
      })
      .then(([testRunEntity]) => {
        return createTestRelation([
          {
            relationType: TestRelationType.ExecutionRelRun,
            from: testExecutionEntity,
            to: testRunEntity,
          },
        ]);
      })
      .then(() => {
        resolve({});
      })
      .catch(err => {
        console.error('err.aaaaamessage', err.message);
        reject({});
      });
  });
};

export const GetTestExecutionList = (name?: string): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const testExeQuery = new Parse.Query(Test);
    testExeQuery.equalTo('type', TestType.TestExecution);
    if (name) {
      const itemQuery = new Parse.Query(Item);
      itemQuery.contains('name', name);
      testExeQuery.matchesQuery('reference', itemQuery);
      testExeQuery.include('reference');
    }
    testExeQuery.find().then(
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

export const GetTestRunDetail = (testId: string): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const testRun = new Parse.Query(Test);
    testRun.equalTo('type', TestType.TestRun);
    testRun.equalTo('objectId', testId);
    testRun.include('runReferenceDetail');
    testRun.first().then(
      async res => {
        const itemId = res?.toJSON()?.runReferenceDetail?.reference?.objectId;
        const {
          items: [item],
        } = await getItemByIQL({ itemId });
        const testRunDetail = res.toJSON();
        const defectList = [];
        let notRepeatNum = 0;
        const obj = {};
        testRunDetail?.runDetail?.defectIds?.forEach((item: string) => {
          defectList.push({
            label: '全局',
            value: item,
          });
          if (!obj[item]) {
            obj[item] = true;
            notRepeatNum++;
          }
        });
        testRunDetail?.runDetail?.runs?.steps?.forEach((item, index) => {
          item?.defectIds?.forEach((item2: string) => {
            defectList.push({
              label: `步骤${index + 1}`,
              value: item2,
            });
            if (!obj[item2]) {
              obj[item2] = true;
              notRepeatNum++;
            }
          });
        });
        resolve({
          success: true,
          data: {
            ...res.toJSON(),
            defectList,
            notRepeatNum,
            itemDetail: item,
          },
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

export const updateTestStep = (
  detail: IRunDetail,
  testStepId?: string,
  checkStatus?: boolean,
): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    const step = Test.createWithoutData(testStepId);
    const updateObj: {
      runDetail: IRunDetail;
      status?: string;
    } = {
      runDetail: detail,
    };
    // if (checkStatus && detail?.runs?.steps?.length) {
    //   // 有一个失败
    //   const hasFail = detail?.runs?.steps.some(item => item.status === 'fail');
    //   // 全部pass
    //   const allPass = detail?.runs?.steps.filter(item => item.status === 'pass');
    //   // 全部todo
    //   const allTodo = detail?.runs?.steps.filter(item => item.status === 'todo');

    //   if (hasFail) {
    //     updateObj.status = 'fail';
    //   } else if (allPass.length === detail?.runs?.steps?.length) {
    //     updateObj.status = 'pass';
    //   } else if (allTodo.length === detail?.runs?.steps?.length) {
    //     updateObj.status = 'todo';
    //   } else {
    //     updateObj.status = 'ing';
    //   }
    // }
    step.set(updateObj);
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

export const toggleTestRunStatus = (testId: string, status: Status): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    Test.createWithoutData(testId)
      .fetch()
      .then(testRun => {
        // const statusType = status.type;
        const refDetail = testRun.get('runReferenceDetail');
        const { runDetail } = testRun.toJSON();
        const runDetailBak = { ...runDetail };
        // if (runDetail?.runs?.steps) {
        //   const steps = [];
        //   runDetail?.runs?.steps?.forEach(item => {
        //     // 成功，全成功 || todo，全todo
        //     if (statusType === 'PASSED' || statusType === 'TODO') {
        //       item.status = status;
        //       // 失败，todo全失败，其他状态不变
        //     } else if (statusType === 'FAILED') {
        //       item.status = status.key;
        //     }
        //     // 执行中，状态不变
        //     steps.push(item);
        //   });
        //   runDetailBak.runs.steps = steps;
        // }
        testRun.set({
          status: status.key,
          runDetail: runDetailBak?.runs ? runDetailBak : undefined,
        });
        // 同步修改关联的 detail 状态
        refDetail.set({
          status: status.key,
        });
        return Parse.Object.saveAll([testRun, refDetail]);
      })
      .then(() => {
        resolve({
          success: true,
        });
      })
      .catch(() => {
        reject({
          success: false,
        });
      });
  });
};

export const InitStepByTestId = (testId: string) => {
  return new Promise((resolve, reject) => {
    const query = new Parse.Query(Test);
    query.equalTo('objectId', testId);
    query.include('runReferenceDetail');
    query
      .first()
      .then(res => {
        if (!res) {
          reject('没有数据');
        }
        const testRun = res.toJSON();
        const itemId = testRun?.runReferenceDetail?.reference?.objectId;
        return FetchAllTestStepByTestId(itemId);
      })
      .then(testRuns => {
        const runDetail: any = {
          runs: {
            steps: testRuns.data.steps || [],
          },
        };
        return updateTestStep(runDetail, testId);
      })
      .then(() => {
        resolve({});
      })
      .catch(error => {
        reject({
          error,
        });
      });
  });
};

interface IItemLink {
  destination: string;
  source: string;
  linkType: string;
}

export const createItemLink = (links: IItemLink | Array<IItemLink>) => {
  const itemLinks = Array.isArray(links) ? links : [links];
  const linkObjs = itemLinks.map(
    link =>
      new ItemLink({
        destination: pointerTransfer(Item, link.destination),
        source: pointerTransfer(Item, link.source),
        linkType: pointerTransfer(ItemLinkType, link.linkType),
      }),
  );

  return Parse.Object.saveAll(linkObjs);
};

export const deleteItemLink = (links: string[] | string) => {
  const itemLinks = Array.isArray(links) ? links : [links];
  const linkObjs = itemLinks.map(
    id =>
      new ItemLink({
        objectId: id,
      }),
  );
  return Parse.Object.destroyAll(linkObjs);
};

export const addDefect = async (linkTypeKey: string, testId: string, defectItemIds: string[]) => {
  // 获取事项关联类型id
  const linkTypeQuery = new Parse.Query(ItemLinkType);
  linkTypeQuery.equalTo('key', linkTypeKey);
  const linkTypeRes = await linkTypeQuery.first();
  const linkType = linkTypeRes.id;

  const testRunQuery = new Parse.Query(Test);
  testRunQuery.equalTo('objectId', testId);
  testRunQuery.include('runReferenceDetail');
  const res = await testRunQuery.first();
  const run = res.toJSON();
  // 测试用例的事项ID
  const testItemId = run?.runReferenceDetail?.reference?.objectId;
  const { list } = await getTestEntitiesByRelation(
    TestRelationType.ExecutionRelRun,
    { to: res },
    { fillItemData: true },
  );
  const testExcItemId = list[0]?.reference?.objectId;
  const itemLink: Array<IItemLink> = [];
  defectItemIds.forEach(item => {
    // 测试用例与缺陷关联
    itemLink.push({
      linkType,
      source: testItemId,
      destination: item,
    });
    // 测试执行与缺陷关联
    itemLink.push({
      linkType,
      source: testExcItemId,
      destination: item,
    });
  });
  return createItemLink(itemLink);
};

export const deleteDefect = async (
  linkTypeKey: string,
  testId: string,
  defectItemIds: string[],
) => {
  // 获取事项关联类型id
  const linkTypeQuery = new Parse.Query(ItemLinkType);
  linkTypeQuery.equalTo('key', linkTypeKey);
  const linkTypeRes = await linkTypeQuery.first();
  const linkType = linkTypeRes.id;

  const testRunQuery = new Parse.Query(Test);
  testRunQuery.equalTo('objectId', testId);
  testRunQuery.include('runReferenceDetail');
  const res = await testRunQuery.first();
  const run = res.toJSON();
  // 测试用例的事项ID
  const testItemId = run?.runReferenceDetail?.reference?.objectId;
  const { list } = await getTestEntitiesByRelation(
    TestRelationType.ExecutionRelRun,
    { to: res },
    { fillItemData: true },
  );
  const testExcItemId = list[0]?.reference?.objectId;
  const itemLink: Array<IItemLink> = [];
  defectItemIds.forEach(item => {
    // 测试用例与缺陷关联
    itemLink.push({
      linkType,
      source: testItemId,
      destination: item,
    });
    // 测试执行与缺陷关联
    itemLink.push({
      linkType,
      source: testExcItemId,
      destination: item,
    });
  });
  const itemLinkQuery = [];
  itemLink.forEach(item => {
    const query = new Parse.Query(ItemLink);
    query.equalTo('linkType', pointerTransfer(ItemLinkType, linkType));
    query.equalTo('destination', pointerTransfer(Item, item.destination));
    query.equalTo('source', pointerTransfer(Item, item.source));
    itemLinkQuery.push(query);
  });
  const mainQuery = Parse.Query.or(...itemLinkQuery);
  const results = await mainQuery.find();

  const deleteDefectItemIds: string[] = [];
  itemLink.forEach(item => {
    const deleteItem = results.find(item2 => {
      const { linkType, source, destination } = item2.toJSON();
      if (
        linkType.objectId === item.linkType &&
        source.objectId === item.source &&
        destination.objectId === item.destination
      ) {
        return item2;
      }
    });
    if (deleteItem) {
      deleteDefectItemIds.push(deleteItem.id);
    }
  });
  return deleteItemLink(deleteDefectItemIds);
};

export const fetchDefectList = async (
  itemIds: string[],
): Promise<{
  items: any;
}> => {
  const items = await getItemByIQL({ itemId: itemIds });
  const ItemTypeKeys = [];
  items?.items?.forEach(item => {
    if (item?.itemType?.key) {
      ItemTypeKeys.push(item?.itemType?.key);
    }
  });
  return new Promise((resolve, reject) => {
    const query = new Parse.Query(ItemType);
    query.containedIn('key', ItemTypeKeys);
    query.find().then(
      res => {
        const resArray = res?.map(item => item.toJSON());
        items?.items?.forEach(item => {
          resArray?.forEach(item2 => {
            if (item?.itemType?.key === item2.key) {
              item.itemType.icon = item2.icon;
            }
          });
        });

        resolve({
          items: items.items,
        });
      },
      err => {
        reject(err);
      },
    );
  });
};

export const FetchItemLinkRelation = (itemId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const query = new Parse.Query(ItemLink);
    query.equalTo('source', pointerTransfer(Item, itemId));
    query.include(['destination.workspace', 'destination.itemType', 'destination.status']);
    query.find().then(
      res => {
        const resArray = res.map(item => item.toJSON());
        resolve(resArray);
      },
      err => {
        reject(err);
      },
    );
  });
};
