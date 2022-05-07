const _ = require('lodash');
const fetch = require('node-fetch');
const asyncPool = require('tiny-async-pool');
const xlsx = require('xlsx');

// api 依赖数据
// iECTM demp

const requestParams = {
  workspaceId: 'iECTM',
  cookie:
    'USER_REALM_KEY="eyJyZWFsbVV1aWQiOiJvc2MiLCJjbGllbnRJZCI6Im9uZS1zc28ifQ=="; PRE-GW-SESSION=963e1b3281984449b638e66fd6e1e451',
  baseUrl: 'http://devops.inspur.com/api/icase/osc',
};

/** Test api methods */
const apis = {
  // 获取所有用例
  async getAllTestList() {
    const allTestListResp = await fetch(
      `${requestParams.baseUrl}/${requestParams.workspaceId}/testCases?page=1&pageSize=999`,
      {
        headers: {
          cookie: requestParams.cookie,
          accept: 'application/json, text/plain, */*',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          csrftoken: 'undefined',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
        body: null,
        method: 'GET',
      },
    );

    // 所有的测试用例
    const {
      payload: { list: allTestList },
    } = await allTestListResp.json();

    return allTestList;
  },
  // 获取用例分组
  async getTestGroups() {
    const testGroupsResp = await fetch(
      `${requestParams.baseUrl}/${requestParams.workspaceId}/testCases/testCaseGroups`,
      {
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          csrftoken: 'undefined',
          cookie: requestParams.cookie,
          Referer: 'http://devops.inspur.com/osc/demp/icase',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
        body: null,
        method: 'GET',
      },
    );

    const { payload: testGroups } = await testGroupsResp.json();

    return testGroups;
  },
  // 获取用例详情
  async getTestDetail(testId) {
    const resp = await fetch(
      `${requestParams.baseUrl}/${requestParams.workspaceId}/testCases/${testId}`,
      {
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          csrftoken: 'undefined',
          cookie: requestParams.cookie,
          Referer: 'http://devops.inspur.com/osc/demp/icase',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
        body: null,
        method: 'GET',
      },
    );

    const { payload } = await resp.json();

    return payload;
  },
};

/**
 * 获取分组名
 * @returns {Map({[id]: groupName})} 分组名
 */
const generateGroupIdNameMap = async () => {
  function arrayToTree(treeArray) {
    const r = [],
      tmpMap = {};

    for (let i = 0, l = treeArray.length; i < l; i++) {
      // 以每条数据的id作为obj的key值，数据作为value值存入到一个临时对象里面
      tmpMap[treeArray[i].id] = treeArray[i];
    }

    for (let i = 0, l = treeArray.length; i < l; i++) {
      const key = tmpMap[treeArray[i].parentId];

      // 循环每一条数据的pid，假如这个临时对象有这个key值，就代表这个key对应的数据有children，需要Push进去
      if (key) {
        if (!key.children) {
          key.children = [];
          key.children.push(treeArray[i]);
        } else {
          key.children.push(treeArray[i]);
        }
      } else {
        // 如果没有这个Key值，那就代表没有父级,直接放在最外层
        r.push(treeArray[i]);
      }
    }
    return r;
  }

  const reverseTreeNodes = (nodes, currentNode, cb) => {
    const nodeKeyMap = {};
    traverseTreeNodes(nodes, node => {
      Object.assign(nodeKeyMap, { [node.id]: node });
    });

    // 逆向遍历查找 node 节点 name
    while (currentNode) {
      if (currentNode) {
        cb(currentNode);
        currentNode = nodeKeyMap[currentNode.parentId];
      }
    }
  };

  const traverseTreeNodes = (nodes, cb) => {
    if (!nodes?.[0]) return;
    nodes.forEach(node => {
      const newNode = cb?.(node);
      if (newNode) {
        node = newNode;
      }
      traverseTreeNodes(node.children, cb);
    });
    return nodes;
  };

  const testGroups = await apis.getTestGroups();

  const groupIdNameMap = new Map();
  const groupTree = arrayToTree(testGroups);
  traverseTreeNodes(groupTree, node => {
    const groupNames = [];
    reverseTreeNodes(groupTree, node, n => {
      groupNames.unshift(n.name);
    });
    groupIdNameMap.set(node.id, groupNames.join('/'));
  });

  return groupIdNameMap;
};

/** 合并用例详情数据 */
const assignTestDetailData = async testList => {
  const getUsefulTestDetailData = data => {
    const retainedData = _.pick(data, ['preCondition', 'status', 'levelId', 'comments']);
    // 步骤
    const action = data.steps.reduce(
      (acc, step) => (acc += `【${step.stepNo}】${step.description}`),
      '',
    );
    // 结果
    const result = data.steps.reduce(
      (acc, step) => (acc += `【${step.stepNo}】${step.expectedResult}`),
      '',
    );

    const attachments = data.others;

    const createHistory = data.histories[0]?.action === '创建于' ? data.histories[0] : {};

    // 创建时间
    const createdAt = createHistory.createTime;
    // 创建人
    const createdBy = createHistory.createByName;

    return Object.assign({}, retainedData, { action, result, createdAt, createdBy, attachments });
  };

  const testDetailDict = _.keyBy(testList, 'id');
  const allTestDetailIds = Object.keys(testDetailDict);

  for await (const testDetail of asyncPool(10, allTestDetailIds, apis.getTestDetail)) {
    const originalTest = testDetailDict[testDetail.id];

    testDetailDict[testDetail.id] = {
      ...originalTest,
      ...getUsefulTestDetailData(testDetail),
    };
  }

  return Object.values(testDetailDict);
};

const run = async () => {
  const allTestList = await apis.getAllTestList();
  const assignTestDetailList = await assignTestDetailData(allTestList);

  // 分组名，带层级
  const groupIdNameMap = await generateGroupIdNameMap();

  let sortedTestList = [];

  for (const [groupId, groupName] of groupIdNameMap.entries()) {
    const currentGroupTestList = assignTestDetailList.filter(test => test.groupId === groupId);

    const results = currentGroupTestList
      .sort((a, b) => b.id - a.id)
      .map(test => ({
        ...test,
        groupName,
      }));

    sortedTestList = sortedTestList.concat(results);
  }

  // console.log(JSON.stringify(sortedTestList));

  const commentNum = sortedTestList.filter(test => Boolean(test.comments));
  const attachmentNum = sortedTestList.filter(test => Boolean(test.attachments?.[0]));

  console.log('commentNum', commentNum);
  console.log('attachmentNum', attachmentNum);
};

run().catch(err => console.log(err));
