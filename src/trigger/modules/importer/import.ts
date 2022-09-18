import {
  getParseModel,
  getParseObject,
  saveAllObject,
  getAllData,
  getData,
} from '@giteeteam/apps-team-api';

// uuid
function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min; //含最大值，含最小值
}

function uuidv4() {
  return ([1e7].toString() + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (+c ^ (getRandomIntInclusive(0, 100) & (15 >> (+c / 4)))).toString(16),
  );
}

// const APP_KEY = 'test_manager';

const TEST_MANAGER_TEST = `Test`;

const TEST_MANAGER_REPO = `Repository`;

const clone = d => JSON.parse(JSON.stringify(d));

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
const getStepData = datas => datas.replace(/^【\d+】/g, '');

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

export const runImport = async () => {
  const { data, appFieldsData } = global.triggerParams;
  // eslint-disable-next-line no-console
  console.log('import-22222', appFieldsData);

  // 根据事项数据获取 workspaceKey
  const getWorkspaceKey = async () => {
    const objectId = clone(data).find(d => d.workspace)?.workspace;

    const workspace = await getData(false, 'Workspace', {
      objectId,
    });

    return workspace?.get('key');
  };

  const workspaceKey = await getWorkspaceKey();

  // 根据空间 key 查询用例库数据
  const getRepoData = async () => {
    const repoData = await getAllData(true, TEST_MANAGER_REPO, {
      workspaceKey,
    });

    const newRepoData = repoData
      .map(data => {
        const _data = data?.toJSON();
        return _data
          ? {
              name: _data.name,
              objectId: _data.objectId,
              testDetailIds: _data?.testDetailIds ?? [],
              parentKey: _data.parent?.objectId ?? null,
              workspaceKey: _data.workspaceKey,
            }
          : null;
      })
      .filter(d => d !== null);

    return handleRepoPath(newRepoData);
  };

  // 创建测试用例数据，返回测试用例
  const createTestMangerTest = async () => {
    const itemParseObj = getParseModel(false, 'Item');
    const testInstance = getParseObject(true, TEST_MANAGER_TEST);
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

    const newData = await saveAllObject(_data);

    return newData;
  };

  const handleRepoPath = datas => {
    const getPath = (gro, _datas, path: any[] = []) => {
      path.push(gro.name);

      if (gro.parentKey) {
        path = getPath(
          _datas.find(d => d.objectId === gro.parentKey),
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

  const getParent = (RepoParseObj, datas, repoData) => {
    const getParPath = path => (path ? `${path ?? ''}/` : '');
    const _data = datas.find(d => `${getParPath(d?.path)}${repoData.name}` === repoData.path);

    return _data?.objectId && RepoParseObj.createWithoutData(_data.objectId);
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

  const handleFieldsData = async testManagerTestData => {
    const TestParseObj = getParseModel(true, TEST_MANAGER_TEST);
    const RepoParseObj = getParseModel(true, TEST_MANAGER_REPO);
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

    return await saveAllObject(needToUpdateRepoTest);
  };

  const createRepoGroup = async (datas, i) => {
    const RepoParseObj = getParseModel(true, TEST_MANAGER_REPO);
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

    return await saveAllObject(repos);
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

    return {
      code: 200,
      message: '成功',
    };
  };

  return await importCallBack();
};
