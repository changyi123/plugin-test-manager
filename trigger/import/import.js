const { data, appFieldsData } = triggerParams;

console.log('import-22222', appFieldsData);

// uuid
function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min; //含最大值，含最小值
}

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ (getRandomIntInclusive(0, 100) & (15 >> (c / 4)))).toString(16),
  );
}

const APP_KEY = 'test_manager';

const TEST_MANAGER_TEST = `${APP_KEY}_Test`;

const TEST_MANAGER_REPO = `${APP_KEY}_Repository`;

const clone = d => JSON.parse(JSON.stringify(d));

// eslint-disable-next-line no-control-regex
// const isTwoChar = d => /[^\x00-\xff]/g.test(d);

// const getCharNum = d =>
//   d?.split?.('').reduce((prev, cur) => {
//     prev = prev + (isTwoChar(cur) ? 2 : 1);

//     return prev;
//   }, 0) ?? 0;

// 根据事项数据获取 workspaceKey
const getWorkspaceKey = async () => {
  const objectId = clone(data).find(d => d.workspace)?.workspace;

  const workspace = await apis.getData(false, 'Workspace', {
    objectId,
  });

  return workspace?.toJSON()?.key;
};

const workspaceKey = await getWorkspaceKey();

const replaceRn = datas => datas?.replace(/^[\r\n]+/g, '');

const splitSteps = datas => replaceRn(datas)?.split(/(?=【\d+】)/g) ?? [];

// 步骤每项的开始标志
// const stepStartToken = '【\\d+】|\\d+\\.+';
// const stepStartToken = '【\\d+】';
// 步骤换行符标志
// const stepEOLToken = '[\\r\\n]';
// 提取步骤 index
// const pickStepIndex = data => {
//   return +data.replace(/【?(\d+)】?\.*.*?$/, '$1');
// };
const pickStepIndex = data => {
  return +data.replace(/【(\d+)】(.|[\r\n])*?$/, '$1');
};
// const getActionAndResultData = datas => datas.replace(/^(【\d+】|\d+\.+)/, '');
const getStepData = datas => datas.replace(/^【\d+】/g, '');

// const splitData = datas => datas?.split?.(/[\r\n]+/g);

// const isStrictEOLModeReg = new RegExp(`(^|(${stepEOLToken}))${stepStartToken}`, 'g');
// const isStrictEOLModeReg = /(^|([\r\n]))【\d+】/g;

const getIsStrict = step => (replaceRn(step) ? /(^|([\r\n]))【\d+】/g.test(replaceRn(step)) : true);

const isStrictEOLMode = datas =>
  getIsStrict(datas.action) && getIsStrict(datas.result) && getIsStrict(datas.data);

const getStepsData = datas => {
  const stepsMap = new Map();

  // 严格换行模式
  const isStrictMode = isStrictEOLMode(datas);

  splitSteps(datas.action ?? '')?.forEach((action, index) => {
    const _index = isStrictMode ? pickStepIndex(action) : index;
    stepsMap.set(_index, {
      action: getStepData(action),
      result: stepsMap.get(_index)?.result ?? '',
      data: stepsMap.get(_index)?.data ?? '',
      id: stepsMap.get(_index)?.id || uuidv4(),
    });
  });

  splitSteps(datas.result ?? '')?.forEach((result, index) => {
    const _index = isStrictMode ? pickStepIndex(result) : index;
    stepsMap.set(_index, {
      action: stepsMap.get(_index)?.action ?? '',
      result: getStepData(result),
      data: stepsMap.get(_index)?.data ?? '',
      id: stepsMap.get(_index)?.id || uuidv4(),
    });
  });

  splitSteps(datas.data ?? '')?.forEach((_data, index) => {
    const _index = isStrictMode ? pickStepIndex(_data) : index;
    stepsMap.set(_index, {
      data: getStepData(_data),
      action: stepsMap.get(_index)?.action ?? '',
      result: stepsMap.get(_index)?.result ?? '',
      id: stepsMap.get(_index)?.id || uuidv4(),
    });
  });

  return [...stepsMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(v => v[1])
    .filter(d => d.data || d.action || d.result);
};

// 创建测试用例数据，返回测试用例
const createTestMangerTest = async () => {
  const itemParseObj = await apis.getParseModel(false, 'Item');
  const testInstance = await apis.getParseObject(false, TEST_MANAGER_TEST);
  const mathData = Math.floor(Date.now() / 1000) * 10e5;

  const isNotHaveMap = appFieldsData.length;
  const _appFieldsData = isNotHaveMap ? appFieldsData : data;

  const _data = _appFieldsData
    .map((_data, index) => ({
      workspaceKey,
      type: 'TestDetail',
      reference: itemParseObj.createWithoutData(isNotHaveMap ? _data.itemId : _data.id),
      detail: {
        precondition: _data.precondition,
        steps: isNotHaveMap ? getStepsData(clone(_data)) : [],
      },
      sortIndex: mathData + index,
    }))
    .map(row => {
      const newTestInstance = testInstance.clone();
      newTestInstance.set(row);

      return newTestInstance;
    });

  const newData = await apis.saveAllObject(_data);

  return newData;
};

const handleRroupPath = datas => {
  const getPath = (gro, _datas, path = []) => {
    path.push(gro.name);

    if (gro.parentId) {
      path = getPath(
        _datas.find(d => d.objectId === gro.parentId),
        _datas,
        path,
      );
    }

    return path;
  };

  return datas.map(d => ({
    ...d,
    path: getPath(d, datas).reverse().join('/'),
  }));
};

// 根据空间 key 查询用例库数据
const getRepoData = async () => {
  const repoData = await apis.getAllData(false, TEST_MANAGER_REPO, {
    workspaceKey,
  });

  const newRepoData = repoData
    .map(d => {
      const _data = d?.toJSON();

      return _data
        ? {
            name: _data.name,
            objectId: _data.objectId,
            testDetailIds: _data?.testDetailIds ?? [],
            parentId: _data.parent?.objectId ?? null,
            workspaceKey: _data.workspaceKey,
          }
        : null;
    })
    .filter(d => d !== null);

  return handleRroupPath(newRepoData);
};

const getParent = (RepoParseObj, datas, repoData) => {
  const getParPath = path => (path ? `${path ?? ''}/` : '');
  const _data = datas.find(d => `${getParPath(d?.path)}${repoData.name}` === repoData.path);

  return _data?.objectId && RepoParseObj.createWithoutData(_data.objectId);
};

const createRepoGroup = async (datas, i) => {
  const RepoParseObj = await apis.getParseModel(false, TEST_MANAGER_REPO);
  const newRepoData = await getRepoData();
  const mathData = Math.floor(Date.now() / 1000) * 10e5 + i * 1000;

  const repos = datas.map((gro, index) => {
    const parent = i === 0 ? undefined : getParent(RepoParseObj, newRepoData, gro);

    const repo = new RepoParseObj({
      parent: parent,
      workspaceKey,
      name: gro.name,
      sortIndex: mathData + index,
    });

    return repo;
  });

  return await apis.saveAllObject(repos);
};

const isSameGroup = (datas, group) =>
  datas?.some(d => d?.index === group?.index && d?.path === group?.path);

const filterImportGroupData = datas =>
  datas?.reduce((prev, cur) => {
    if (!isSameGroup(prev, cur)) {
      prev.push(cur);
    }

    return prev;
  }, []);

const getGroupPath = group => group?.split('/').filter(d => `${d}`.trim()) ?? [];

const getImportGroupData = () =>
  appFieldsData
    .map(d =>
      getGroupPath(d.group)
        .reduce((prev, cur, index) => {
          prev[index] = {
            name: cur,
            parent: index === 0 ? null : prev[index - 1].name,
            path: index === 0 ? cur : `${prev[index - 1].path}/${cur}`,
            index,
          };

          return prev;
        }, [])
        .filter(g => g.name),
    )
    .filter(Boolean)
    .flat();

const getToCreateGroupData = async () => {
  const newRepoData = await getRepoData();

  return filterImportGroupData(getImportGroupData())?.filter(
    d => !newRepoData.some(g => g?.path === d?.path),
  );
};

// const getAddId = (datas, field) => {
//   const testMap = datas.reduce((prev, cur) => {
//     const _cur = cur?.toJSON();
//     if (_cur) {
//       prev.set(_cur.reference?.objectId, _cur.objectId);
//     }

//     return prev;
//   }, new Map());

//   return testMap.get(field.itemId);
// };

const handleFieldsData = async testManagerTestData => {
  const TestParseObj = await apis.getParseModel(false, TEST_MANAGER_TEST);
  const RepoParseObj = await apis.getParseModel(false, TEST_MANAGER_REPO);
  const repoDatas = await getRepoData();
  const testRepoMap = new Map();

  appFieldsData.forEach(field => {
    const repoData = repoDatas.find(gro => gro.path === getGroupPath(field.group).join('/'));

    repoData && testRepoMap.set(field.itemId, RepoParseObj.createWithoutData(repoData.objectId));
  });

  const needToUpdateRepoTest = testManagerTestData
    .map(item => {
      const repoMap = testRepoMap.get(item.toJSON().reference?.objectId);
      if (repoMap) {
        const testParse = new TestParseObj({
          objectId: item?.id,
        });

        testParse.set('repository', repoMap);
        return testParse;
      }

      return null;
    })
    .filter(d => d !== null);

  // const newRepoObj = appFieldsData
  //   .map(field => {
  //     const repoData = repoDatas.find(gro => gro.path === getGroupPath(field.group).join('/'));

  //     if (!repositoryMap.has(repoData?.objectId)) {
  //       const repository = new TestParseObj({
  //         objectId: item?.objectId,
  //       });

  //       repositoryMap.set(repoData?.objectId, repository);
  //     }

  //     const getDetailIds = () => {
  //       const ids = (repoData?.testDetailIds ?? []).concat(
  //         repositoryMap.get(repoData?.objectId).toJSON()?.testDetailIds ?? [],
  //       );

  //       return ids?.concat([getAddId(testManagerTestData, field)]);
  //     };

  //     repositoryMap.get(repoData?.objectId).set('testDetailIds', getDetailIds());

  //     return repoData?.objectId ? repositoryMap.get(repoData?.objectId) : null;
  //   })
  //   .filter(d => d !== null);

  return await apis.saveAllObject(needToUpdateRepoTest);
};

const createRepoGroupList = async datas => {
  for (let i = 0; i < 8; i++) {
    if (datas.get(i)) {
      await createRepoGroup(datas.get(i), i);
    }
  }
};

// 导入成功后，创建事项数据后的回调函数
const importCallBack = async () => {
  // 创建测试用例数据
  const testManagerTestData = await createTestMangerTest();

  // 得到需要创建的用例库数据
  const toCreateGroupData = await getToCreateGroupData();

  if (toCreateGroupData.length) {
    const newToCreateGroupData = toCreateGroupData.reduce((prev, cur) => {
      prev.set(cur.index, (prev.get(cur.index) || []).concat([cur]));
      return prev;
    }, new Map());

    // 创建用例库
    await createRepoGroupList(newToCreateGroupData);
  }

  // 绑定测试用例到用例库
  await handleFieldsData(testManagerTestData);

  // const href = `osc/workspaces/${workspaceKey}`
  // window.open(href)

  return {
    code: 200,
    message: '成功',
  };
};

return importCallBack();
