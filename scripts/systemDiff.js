const nodeFetch = require('node-fetch');
const _ = require('lodash');
const xlsx = require('xlsx');

let count = 0;
/** 新旧 Test 数据对比脚本 */
let result = [];

const splitToken = '<<------*&';

const cookie =
  'agroup=s%3ActcvEDnI4NHF8IUC4CpdlttZHxInNFWm.h26rLG08TebyGUBqQtHXFYJ7K%2FxIZ6Em8tYBiOd2JNo; Authorization=bd8c6ede3c404b1866c458312f66b8f8; USER_REALM_KEY="eyJyZWFsbVV1aWQiOiJvc2MiLCJjbGllbnRJZCI6Im9uZS1zc28ifQ=="; PRE-GW-SESSION=f89c438b62684419a2c62e9118aee247';

// 是否对比用例
const detailDiff = false;

// 状态映射
const statusMapping = ['TODO', 'FAILED', 'FAILED', 'FAILED', 'EXECUTING', 'PASSED'];

const fetch = async (...args) => {
  return new Promise(resolve => {
    nodeFetch(...args)
      .then(data => data.json())
      .then(resolve);
  });
};

let p_name;

// const workspaceKeys = ['5G-RMS', 'iCore', 'iECIM', 'iECTM', 'iEKS', 'iEPNM', 'zsjczl'];
const workspaceKeys = ['iEKS'];

const runner = async () => {
  let workspace;

  const writeXlsx = data => {
    const ws = xlsx.utils.json_to_sheet(data, { dateNF: 'yyyy/mm/dd HH:mm:ss' });
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'SheetJS');

    return new Promise(resolve => {
      xlsx.writeFileAsync(`错误.xlsx`, wb, {}, () => {
        resolve('export success');
      });
    });
  };

  // 根据执行任务名获取执行
  const getRunsByExecName = async (execName, planId) => {
    const res = await fetch(
      'http://devops.inspur.com/api/project/parse/classes/test_manager_TestRelation',
      {
        headers: {
          accept: '*/*',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'content-type': 'text/plain',
          'x-parse-session-token':
            'eyJhZG1pbiI6ZmFsc2UsImNvbXBhbnkiOiJvc2MiLCJjb21wYW55SWRlbnRpdHkiOiJDT01QQU5ZX01FTUJFUiIsImRpc3BsYXlOYW1lIjoi5qKB5by65Z2kIiwiZW1haWwiOiJsaWFuZ3FpYW5na3VuQG9zY2hpbmEuY24iLCJpZCI6IjUzIiwic0FNQWNjb3VudE5hbWUiOiJsaWFuZ3FrIiwic3RhdHVzIjoiU1VDQ0VTUyIsInVTTkNyZWF0ZWQiOiI1MyIsInVzZXJQcmluY2lwYWxOYW1lIjoibGlhbmdxaWFuZ2t1bkBvc2NoaW5hLmNuIiwidXNlcm5hbWUiOiJsaWFuZ3FrIn0=',
          cookie,
          Referer: `http://devops.inspur.com/project/osc/workspaces/${workspace}/plugin/test_manager_DgnZWjNgn7_test-plan?hiddenSider=true&hiddenHeader=true`,
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
        body: `{"where":{"relationType":"PlanRelExecution","from":{"__type":"Pointer","className":"test_manager_Test","objectId":"${planId}"},"to":{"$inQuery":{"where":{"reference":{"$inQuery":{"where":{"name":"${execName}","workspace":{"$select":{"key":"objectId","query":{"where":{"key":"${workspace}"},"className":"Workspace"}}}},"className":"Item"}}},"className":"test_manager_Test"}}},"include":"to.reference","keys":"to,from.objectId,to.reference","count":1,"limit":9999,"_method":"GET","_ApplicationId":"proxima-core","_ClientVersion":"js3.4.0","_InstallationId":"9987e418-d547-4d06-9a25-90d905769e45"}`,
        method: 'POST',
      },
    );
    const [execId] = res.results.map(item => item.to.objectId);

    const { results: newRuns } = await fetch(
      'http://devops.inspur.com/api/project/parse/classes/test_manager_TestRelation',
      {
        headers: {
          accept: '*/*',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'content-type': 'text/plain',
          'x-parse-session-token':
            'eyJhZG1pbiI6ZmFsc2UsImNvbXBhbnkiOiJvc2MiLCJjb21wYW55SWRlbnRpdHkiOiJDT01QQU5ZX01FTUJFUiIsImRpc3BsYXlOYW1lIjoi5qKB5by65Z2kIiwiZW1haWwiOiJsaWFuZ3FpYW5na3VuQG9zY2hpbmEuY24iLCJpZCI6IjUzIiwic0FNQWNjb3VudE5hbWUiOiJsaWFuZ3FrIiwic3RhdHVzIjoiU1VDQ0VTUyIsInVTTkNyZWF0ZWQiOiI1MyIsInVzZXJQcmluY2lwYWxOYW1lIjoibGlhbmdxaWFuZ2t1bkBvc2NoaW5hLmNuIiwidXNlcm5hbWUiOiJsaWFuZ3FrIn0=',
          cookie,
          Referer: `http://devops.inspur.com/project/osc/workspaces/${workspace}/plugin/test_manager_DgnZWjNgn7_test-plan?hiddenSider=true&hiddenHeader=true`,
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
        body: `{"where":{"relationType":"ExecutionRelRun","from":{"$in":[{"__type":"Pointer","className":"test_manager_TestRelation","objectId":"${execId}"}]}},"include":"to.status,to.sortIndex,to.runReferenceDetail.reference","keys":"to,from.objectId,to.status,to.sortIndex,to.runReferenceDetail.reference","count":1,"limit":9999,"_method":"GET","_ApplicationId":"proxima-core","_ClientVersion":"js3.4.0","_InstallationId":"9987e418-d547-4d06-9a25-90d905769e45"}`,
        method: 'POST',
      },
    );

    return newRuns.map(item => ({
      name: item.to.runReferenceDetail?.reference?.name,
      status: item.to.status,
    }));
  };

  // 获取计划下全部用例
  const getDetailNameListByPlanId = async planId => {
    const { results } = await fetch(
      'http://devops.inspur.com/api/project/parse/classes/test_manager_Test',
      {
        headers: {
          accept: '*/*',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'content-type': 'text/plain',
          'x-parse-session-token':
            'eyJhZG1pbiI6ZmFsc2UsImNvbXBhbnkiOiJvc2MiLCJjb21wYW55SWRlbnRpdHkiOiJDT01QQU5ZX01FTUJFUiIsImRpc3BsYXlOYW1lIjoi5qKB5by65Z2kIiwiZW1haWwiOiJsaWFuZ3FpYW5na3VuQG9zY2hpbmEuY24iLCJpZCI6IjUzIiwic0FNQWNjb3VudE5hbWUiOiJsaWFuZ3FrIiwic3RhdHVzIjoiU1VDQ0VTUyIsInVTTkNyZWF0ZWQiOiI1MyIsInVzZXJQcmluY2lwYWxOYW1lIjoibGlhbmdxaWFuZ2t1bkBvc2NoaW5hLmNuIiwidXNlcm5hbWUiOiJsaWFuZ3FrIn0=',
          cookie,
          Referer:
            'http://devops.inspur.com/project/osc/workspaces/iEKS/plugin/test_manager_DgnZWjNgn7_test-plan?hiddenSider=true&hiddenHeader=true',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
        body: `{"where":{"objectId":{"$select":{"key":"to","query":{"where":{"relationType":"PlanRelDetail","from":{"$in":["${planId}"]}},"className":"test_manager_TestRelation"}}},"reference":{"$select":{"key":"objectId","query":{"where":{"workspace":{"$select":{"key":"objectId","query":{"where":{"key":"${workspace}"},"className":"Workspace"}}}},"className":"Item"}}}},"include":"reference,reference","count":1,"limit":9999,"order":"sortIndex,createdAt","_method":"GET","_ApplicationId":"proxima-core","_ClientVersion":"js3.4.0","_InstallationId":"9987e418-d547-4d06-9a25-90d905769e45"}`,
        method: 'POST',
      },
    );
    return results.map(item => ({
      name: item.reference?.name,
      status: item.status,
    }));
  };

  /** 对比执行 */
  const diffExecutionOrDetail = async (planId, isDetailDiff) => {
    const {
      payload: { list: planList },
    } = await fetch(
      `http://devops.inspur.com/api/icase/osc/${workspace}/testPlans/${planId}/cases?myself=&moduleId=&page=1&keyword=`,
      {
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          csrftoken: 'undefined',
          cookie,
          Referer: `http://devops.inspur.com/osc/${workspace}/icase`,
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
        body: null,
        method: 'GET',
      },
    );

    const plan = await fetch(
      `http://devops.inspur.com/api/icase/osc/${workspace}/testPlans/${planId}`,
      {
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          csrftoken: 'undefined',
          cookie,
          Referer: `http://devops.inspur.com/osc/${workspace}/icase`,
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
        body: null,
        method: 'GET',
      },
    );

    const planName = plan.payload.planName;

    const {
      results: [{ objectId: newPlanId }],
    } = await fetch('http://devops.inspur.com/api/project/parse/classes/test_manager_Test', {
      headers: {
        accept: '*/*',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'content-type': 'text/plain',
        'x-parse-session-token':
          'eyJhZG1pbiI6ZmFsc2UsImNvbXBhbnkiOiJvc2MiLCJjb21wYW55SWRlbnRpdHkiOiJDT01QQU5ZX01FTUJFUiIsImRpc3BsYXlOYW1lIjoi5qKB5by65Z2kIiwiZW1haWwiOiJsaWFuZ3FpYW5na3VuQG9zY2hpbmEuY24iLCJpZCI6IjUzIiwic0FNQWNjb3VudE5hbWUiOiJsaWFuZ3FrIiwic3RhdHVzIjoiU1VDQ0VTUyIsInVTTkNyZWF0ZWQiOiI1MyIsInVzZXJQcmluY2lwYWxOYW1lIjoibGlhbmdxaWFuZ2t1bkBvc2NoaW5hLmNuIiwidXNlcm5hbWUiOiJsaWFuZ3FrIn0=',
        cookie:
          'agroup=s%3ActcvEDnI4NHF8IUC4CpdlttZHxInNFWm.h26rLG08TebyGUBqQtHXFYJ7K%2FxIZ6Em8tYBiOd2JNo; Authorization=bd8c6ede3c404b1866c458312f66b8f8; USER_REALM_KEY="eyJyZWFsbVV1aWQiOiJvc2MiLCJjbGllbnRJZCI6Im9uZS1zc28ifQ=="; PRE-GW-SESSION=daff832d220e4f6792b22709dd46c3b4',
        Referer: `http://devops.inspur.com/project/osc/workspaces/${workspace}/plugin/test_manager_DgnZWjNgn7_test-plan?hiddenSider=true&hiddenHeader=true`,
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
      body: `{"where":{"type":"TestPlan","workspaceKey":"${workspace}","reference":{"$select":{"key":"objectId","query":{"where":{"name":"${planName}","workspace":{"$select":{"key":"objectId","query":{"where":{"key":"${workspace}"},"className":"Workspace"}}}},"className":"Item"}}}},"include":"reference.workspace,reference.itemType","count":1,"limit":9999,"order":"sortIndex,createdAt","_method":"GET","_ApplicationId":"proxima-core","_ClientVersion":"js3.4.0","_InstallationId":"9987e418-d547-4d06-9a25-90d905769e45"}`,
      method: 'POST',
    });

    let oldRuns = [];

    const suitsMap = planList.reduce(
      (acc, { projectTestPlanCaseSuites, name, testStatus, ...prop }) => {
        // 测试套件
        if (Array.isArray(projectTestPlanCaseSuites)) {
          const suitNameList = projectTestPlanCaseSuites?.map(item => ({
            name: item.name,
            status: item.testStatus,
          }));
          acc[name] = suitNameList;
          oldRuns = oldRuns.concat(suitNameList);
        } else {
          const runInfo = {
            name,
            status: testStatus,
          };
          // 测试用例
          oldRuns = oldRuns.concat(runInfo);

          acc['默认执行任务'] = (acc['默认执行任务'] || []).concat(runInfo);
        }

        return acc;
      },
      {},
    );

    if (isDetailDiff) {
      const newRuns = await getDetailNameListByPlanId(newPlanId);
      const oldRunNameList = oldRuns.map(item => item.name);
      const newRunNameList = newRuns.map(item => item.name);
      const less = _.difference(oldRunNameList, newRunNameList);
      const more = _.difference(newRunNameList, oldRunNameList);

      if (less.length > 0 || more.length > 0) {
        console.log('计划: ' + planName + '\t新版添加用例：', less);
        console.log('计划: ' + planName + '\t新版减少用例：', more);
      }
    }

    for (const [execName, oldRuns] of Object.entries(suitsMap)) {
      if (!isDetailDiff) {
        const newRuns = await getRunsByExecName(execName, newPlanId);

        const oldRunNameList = oldRuns.map(item => item.name);
        const newRunNameList = newRuns.map(item => item.name);

        const lessNameList = _.difference(oldRunNameList, newRunNameList);
        const moreNameList = _.difference(newRunNameList, oldRunNameList);

        if (lessNameList.length > 0 || moreNameList.length > 0) {
          // console.log('执行任务: ' + execName + '\t新版添加执行：', lessNameList);
          // console.log('执行任务: ' + execName + '\t新版减少执行：', moreNameList);
        }

        const differenceRunStatuses = (oldRuns, newRuns, execName) => {
          const patchedOldRuns = oldRuns.map(item => ({
            ...item,
            status: statusMapping[item.status],
          }));

          const patchedNewRuns = newRuns.map(item => ({
            ...item,
            status: item.status ?? 'TODO',
          }));
          const oldRunStatusList = patchedOldRuns
            .map(
              item =>
                p_name + splitToken + execName + splitToken + item.name + splitToken + item.status,
            )
            .sort();
          const newRunStatusList = patchedNewRuns
            .map(
              item =>
                p_name + splitToken + execName + splitToken + item.name + splitToken + item.status,
            )
            .sort();

          const lessStatusList = _.differenceBy(oldRunStatusList, newRunStatusList, a =>
            a.toLowerCase(),
          );
          const moreStatusList = _.differenceBy(newRunStatusList, oldRunStatusList, a =>
            a.toLowerCase(),
          );

          if (lessStatusList.length > 0 || moreStatusList.length > 0) {
            const lessStatus = lessStatusList?.reduce((acc, str) => {
              const [p_name, execName, name, status] = str.split(splitToken);
              const token = (p_name + splitToken + execName + splitToken + name).toUpperCase();
              acc[token] = {
                status,
                p_name,
                execName,
                name,
              };
              return acc;
            }, {});

            const moreStatus = moreStatusList?.reduce((acc, str) => {
              const [p_name, execName, name, status] = str.split(splitToken);
              const token = (p_name + splitToken + execName + splitToken + name).toUpperCase();
              acc[token] = {
                status,
                p_name,
                execName,
                name,
              };
              return acc;
            }, {});

            Object.entries(moreStatus).forEach(([token, oldInfo]) => {
              // result += `${name} 旧版状态：${status} 新版错误状态：${lessStatus[name]} \n`;
              const nameMapping1 = {
                TODO: '待执行',
                PASSED: '已通过',
                EXECUTING: '待执行',
                FAILED: '待执行',
              };

              const nameMapping = {
                TODO: '未测',
                PASSED: '成功',
                EXECUTING: '待查',
                FAILED: '失败||无效||阻塞',
              };

              const info = lessStatus[token];
              console.log(token, info);
              if (info) {
                // count++;
                result = result.concat({
                  空间标识: workspace,
                  执行计划: p_name,
                  执行任务名: execName,
                  用例名: oldInfo.name,
                  旧版用例状态: nameMapping[info.status],
                  新版错误状态: nameMapping1[oldInfo.status],
                  新版应迁移的正确状态: nameMapping1[info.status],
                });
              }
            });

            // console.log(count);

            // console.log(
            //   `执行计划： ${p_name} \t 执行任务: ` +
            //     execName +
            //     '\n' +
            //     JSON.stringify(result, null, 4) +
            //     '\n',
            // );
          }
        };

        differenceRunStatuses(oldRuns, newRuns, execName);
      }
    }
  };

  // 获取旧空的计划 ID
  const getOldTestPlanIds = async () => {
    const {
      payload: { list },
    } = await fetch(
      `http://devops.inspur.com/api/icase/osc/${workspace}/testPlans?page=1&pageSize=15&planStatus=`,
      {
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          csrftoken: 'undefined',
          cookie,
          Referer: `http://devops.inspur.com/osc/${workspace}/icase`,
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
        body: null,
        method: 'GET',
      },
    );

    return list.map(item => ({
      id: item.id,
      planName: item.planName,
    }));
  };

  for (const workspaceKey of workspaceKeys) {
    workspace = workspaceKey;
    const plans = await getOldTestPlanIds(workspace);

    for (const { id, planName } of plans) {
      p_name = planName;
      console.log('空间：', workspace, '计划：', planName);
      console.log('\n');
      await diffExecutionOrDetail(id, detailDiff);
    }
  }

  writeXlsx(result);
};

runner();
