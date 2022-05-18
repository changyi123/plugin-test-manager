const nodeFetch = require('node-fetch');
const _ = require('lodash');

/** 新旧 Test 数据对比脚本 */

const fetch = async (...args) => {
  return new Promise(resolve => {
    nodeFetch(...args)
      .then(data => data.json())
      .then(resolve);
  });
};

const workspaceKeys = ['5G-RMS', 'iCore', 'iECIM', 'iECTM', 'iEKS', 'iEPNM', 'zsjczl'];

const runner = async () => {
  let workspace;

  // 根据执行任务名获取执行
  const getRunNameListByExecName = async (execName, planId) => {
    const res = await fetch(
      'http://devops.inspur.com/api/project/parse/classes/test_manager_TestRelation',
      {
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
          cookie:
            'agroup=s%3ActcvEDnI4NHF8IUC4CpdlttZHxInNFWm.h26rLG08TebyGUBqQtHXFYJ7K%2FxIZ6Em8tYBiOd2JNo; Authorization=bd8c6ede3c404b1866c458312f66b8f8; USER_REALM_KEY="eyJyZWFsbVV1aWQiOiJvc2MiLCJjbGllbnRJZCI6Im9uZS1zc28ifQ=="; PRE-GW-SESSION=daff832d220e4f6792b22709dd46c3b4',
          Referer: `http://devops.inspur.com/project/osc/workspaces/${workspace}/plugin/test_manager_DgnZWjNgn7_test-plan?hiddenSider=true&hiddenHeader=true`,
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
        body: `{"where":{"relationType":"ExecutionRelRun","from":{"$in":[{"__type":"Pointer","className":"test_manager_TestRelation","objectId":"${execId}"}]}},"include":"to.status,to.sortIndex,to.runReferenceDetail.reference","keys":"to,from.objectId,to.status,to.sortIndex,to.runReferenceDetail.reference","count":1,"limit":9999,"_method":"GET","_ApplicationId":"proxima-core","_ClientVersion":"js3.4.0","_InstallationId":"9987e418-d547-4d06-9a25-90d905769e45"}`,
        method: 'POST',
      },
    );

    return newRuns.map(item => item.to.runReferenceDetail?.reference?.name);
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
          cookie:
            'agroup=s%3ActcvEDnI4NHF8IUC4CpdlttZHxInNFWm.h26rLG08TebyGUBqQtHXFYJ7K%2FxIZ6Em8tYBiOd2JNo; Authorization=bd8c6ede3c404b1866c458312f66b8f8; USER_REALM_KEY="eyJyZWFsbVV1aWQiOiJvc2MiLCJjbGllbnRJZCI6Im9uZS1zc28ifQ=="; PRE-GW-SESSION=daff832d220e4f6792b22709dd46c3b4',
          Referer:
            'http://devops.inspur.com/project/osc/workspaces/iEKS/plugin/test_manager_DgnZWjNgn7_test-plan?hiddenSider=true&hiddenHeader=true',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
        body: `{"where":{"objectId":{"$select":{"key":"to","query":{"where":{"relationType":"PlanRelDetail","from":{"$in":["${planId}"]}},"className":"test_manager_TestRelation"}}},"reference":{"$select":{"key":"objectId","query":{"where":{"workspace":{"$select":{"key":"objectId","query":{"where":{"key":"${workspace}"},"className":"Workspace"}}}},"className":"Item"}}}},"include":"reference,reference","count":1,"limit":9999,"order":"sortIndex,createdAt","_method":"GET","_ApplicationId":"proxima-core","_ClientVersion":"js3.4.0","_InstallationId":"9987e418-d547-4d06-9a25-90d905769e45"}`,
        method: 'POST',
      },
    );
    return results.map(item => item.reference?.name);
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
          cookie:
            'agroup=s%3ActcvEDnI4NHF8IUC4CpdlttZHxInNFWm.h26rLG08TebyGUBqQtHXFYJ7K%2FxIZ6Em8tYBiOd2JNo; Authorization=bd8c6ede3c404b1866c458312f66b8f8; USER_REALM_KEY="eyJyZWFsbVV1aWQiOiJvc2MiLCJjbGllbnRJZCI6Im9uZS1zc28ifQ=="; PRE-GW-SESSION=daff832d220e4f6792b22709dd46c3b4',
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
          cookie:
            'agroup=s%3ActcvEDnI4NHF8IUC4CpdlttZHxInNFWm.h26rLG08TebyGUBqQtHXFYJ7K%2FxIZ6Em8tYBiOd2JNo; Authorization=bd8c6ede3c404b1866c458312f66b8f8; USER_REALM_KEY="eyJyZWFsbVV1aWQiOiJvc2MiLCJjbGllbnRJZCI6Im9uZS1zc28ifQ=="; PRE-GW-SESSION=daff832d220e4f6792b22709dd46c3b4',
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

    let oldTestNameList = [];

    const suitsMap = planList.reduce((acc, { projectTestPlanCaseSuites, name, ...prop }) => {
      if (Array.isArray(projectTestPlanCaseSuites)) {
        const suitNameList = projectTestPlanCaseSuites?.map(item => item.name);
        acc[name] = suitNameList;
        oldTestNameList = oldTestNameList.concat(suitNameList);
      } else {
        oldTestNameList = oldTestNameList.concat(name);
      }

      return acc;
    }, {});

    if (isDetailDiff) {
      const newTestNameList = await getDetailNameListByPlanId(newPlanId);
      const less = _.difference(oldTestNameList, newTestNameList);
      const more = _.difference(newTestNameList, oldTestNameList);

      if (less.length > 0 || more.length > 0) {
        console.log('计划: ' + planName + '\t新版比旧版少的用例：', less);
        console.log('计划: ' + planName + '\t新版比旧版多的用例：', more);
      }
    }

    for (const [execName, oldRunNameList] of Object.entries(suitsMap)) {
      if (!isDetailDiff) {
        const newRunNameList = await getRunNameListByExecName(execName, newPlanId);

        const less = _.difference(oldRunNameList, newRunNameList);
        const more = _.difference(newRunNameList, oldRunNameList);
        if (less.length > 0 || more.length > 0) {
          console.log('执行任务: ' + execName + '\t新版比旧版少的执行：', less);
          console.log('执行任务: ' + execName + '\t新版比旧版多的执行：', more);
        }
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
          cookie:
            'agroup=s%3ActcvEDnI4NHF8IUC4CpdlttZHxInNFWm.h26rLG08TebyGUBqQtHXFYJ7K%2FxIZ6Em8tYBiOd2JNo; Authorization=bd8c6ede3c404b1866c458312f66b8f8; USER_REALM_KEY="eyJyZWFsbVV1aWQiOiJvc2MiLCJjbGllbnRJZCI6Im9uZS1zc28ifQ=="; PRE-GW-SESSION=daff832d220e4f6792b22709dd46c3b4',
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
      console.log('空间：', workspace, '计划：', planName);
      console.log('\n');
      await diffExecutionOrDetail(id, true);
    }
  }
};

runner();
