// 测试用例导入前置操作，用于数据处理

import { getAllData, getData, getParseModel, saveAllObject } from '@giteeteam/apps-team-api';

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

const TEST_MANAGER_REPO = `test_manager_Repository`;

const clone = d => JSON.parse(JSON.stringify(d));

const replaceRn = datas => {
  try {
    return datas?.replace(/^[\r\n]+/g, '');
  } catch (err) {
    console.info('______________error_____________', datas);
    console.error(err);
  }
};

const regexpList = ['【\\d+】', '\\d+\\. ', '\\d+、'];
const indexRegexpList = [/【(\d+)】(.|[\r\n])*?$/, /(\d+)(.|[\r\n])*?$/, /(\d+)(.|[\r\n])*?$/];

const splitSteps = datas => {
  try {
    const stepsString = replaceRn(datas) ?? '';
    let steps = [];
    for (const regexp of regexpList) {
      if (new RegExp(`^${regexp}`, 'g').test(stepsString)) {
        steps = stepsString.split(new RegExp(`(?=${regexp})`, 'g'));
        break;
      }
    }
    return steps;
  } catch (err) {
    console.info('______________error_____________', err, datas);
    return [];
  }
};

const testStep = datas =>
  regexpList.some(regexp => new RegExp(`(^|([\r\n]))${regexp}`, 'g').test(datas));

const pickStepIndex = data => {
  let index = 0;
  let i = 0;
  for (const regexp of regexpList) {
    if (new RegExp(regexp, 'g').test(data)) {
      index = +data.replace(indexRegexpList[i], '$1');
      break;
    }
    i++;
  }
  return index;
};

const getStepData = datas => {
  let data = datas;
  for (const regexp of regexpList) {
    if (new RegExp(`^${regexp}`, 'g').test(data)) {
      data = datas.replace(new RegExp(`^${regexp}`, 'g'), '');
      break;
    }
  }
  return data;
};

const getIsStrict = step => (replaceRn(step) ? testStep(replaceRn(step)) : true);

const getSortIndex = (index = 0, time = 0) =>
  Math.floor(Date.now() / 1000 + time) * 10e5 + index * 1000;

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

export const runBeforeImport = async () => {
  const appFieldsData = global.triggerParams?.appFieldsData?.map((item, index) => ({
    ...item,
    __indexKey: index,
  }));

  const data = global.triggerParams?.data?.map((item, index) => ({
    ...item,
    __indexKey: index,
  }));

  // 获取测试管理的自定义数据
  const getItemDataList = () => {
    const isNotHaveMap = appFieldsData.length;
    const itemsDataList = (isNotHaveMap ? appFieldsData : data).reverse().map((item, index) => ({
      ...item,
      values: {
        ...item.values,
        r_test_manager_type: 'TestCase',
        r_test_manager_detail: JSON.stringify({
          precondition: item.precondition,
          steps: isNotHaveMap ? getStepsData(clone(item)) : [],
        }),
        r_test_manager_sortIndex: getSortIndex(index),
      },
    }));

    return itemsDataList;
  };

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
  const getRepositoryData = async () => {
    const addRepositoryPath = datas => {
      const getPath = (gro, _datas, path: any[] = []) => {
        if (gro) {
          path.push(gro.name);

          if (gro.parentKey && gro.parentKey !== 'root') {
            path = getPath(
              _datas.find(d => d.objectId === gro.parentKey),
              _datas,
              path,
            );
          }
        }

        return path;
      };
      return datas.map(d => ({
        ...d,
        path: getPath(d, datas).reverse().join('/'),
      }));
    };

    const existedRepositoryData = await getAllData(false, TEST_MANAGER_REPO, {
      workspaceKey,
    })
      .then(data =>
        data
          .map(item => {
            const data = item?.toJSON();
            return (
              data && {
                name: data.name,
                objectId: data.objectId,
                testDetailIds: data?.testDetailIds ?? [],
                parentKey: data.parent?.objectId ?? null,
                workspaceKey: data.workspaceKey,
              }
            );
          })
          .filter(Boolean),
      )
      .then(data => addRepositoryPath(data));

    return existedRepositoryData;
  };

  const isSameGroup = (datas, repository) =>
    datas?.some(d => d?.index === repository?.index && d?.path === repository?.path);

  const filterImportGroupData = datas =>
    datas?.reduce((prev, cur) => {
      if (!isSameGroup(prev, cur)) {
        prev.push(cur);
      }

      return prev;
    }, []);

  const getGroupPath = repository =>
    `${repository ?? ''}`?.split('/').filter(d => `${d}`.trim()) ?? [];

  const getImportGroupData = () => {
    return appFieldsData
      .map(d =>
        getGroupPath(d.group)
          .reduce((acc, cur, index) => {
            acc[index] = {
              name: cur,
              parent: index === 0 ? null : acc[index - 1].name,
              path: index === 0 ? cur : `${acc[index - 1].path}/${cur}`,
              index,
            };

            return acc;
          }, [])
          .filter(g => g.name),
      )
      .filter(Boolean)
      .flat();
  };

  const getToCreateGroupData = async () => {
    const repositoryData = await getRepositoryData();
    return filterImportGroupData(getImportGroupData())?.filter(
      d => !repositoryData.some(g => g?.path === d?.path),
    );
  };

  const addNewRepositoryFieldValue = async itemData => {
    const repositoryData = await getRepositoryData();
    const testRepoMap = new Map();

    appFieldsData.forEach(item => {
      const repoData = repositoryData.find(gro => gro.path === getGroupPath(item.group).join('/'));

      repoData && testRepoMap.set(item.__indexKey, repoData.objectId);
    });

    return itemData.map(item => ({
      ...item,
      values: {
        ...item.values,
        r_test_manager_repository: testRepoMap.get(item.__indexKey),
      },
    }));
  };

  const createRepoGroup = async (datas, i) => {
    const RepositoryModel = getParseModel(false, TEST_MANAGER_REPO);
    const repositoryData = await getRepositoryData();

    const getParentRepository = (datas, repoData) => {
      const getParPath = path => (path ? `${path ?? ''}/` : '');
      const repositoryData = datas.find(
        d => `${getParPath(d?.path)}${repoData.name}` === repoData.path,
      );

      return repositoryData?.objectId && RepositoryModel.createWithoutData(repositoryData.objectId);
    };

    const repositoryObjects = datas.map((gro, index) => {
      const parent = i === 0 ? undefined : getParentRepository(repositoryData, gro);

      const repositoryObject = new RepositoryModel({
        parent: parent,
        workspaceKey,
        name: gro.name,
        sortIndex: getSortIndex(index, i),
      });

      return repositoryObject;
    });

    return await saveAllObject(repositoryObjects);
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
    console.time('[test-case-import] process');
    // 获取创建的事项数据
    const itemDataList = getItemDataList();
    let newItemDataList = [];

    // 得到需要创建的用例库数据
    console.time('[test-case-import] group create');
    const toCreateGroupData = await getToCreateGroupData();

    if (toCreateGroupData.length) {
      const newToCreateGroupData = toCreateGroupData.reduce((prev, cur) => {
        prev.set(cur.index, (prev.get(cur.index) || []).concat([cur]));
        return prev;
      }, new Map());

      // 创建用例库
      await createRepoGroupList(newToCreateGroupData);
      console.timeEnd('[test-case-import] group create');
    }

    // 绑定测试用例事项用例库，并更新事项数据
    newItemDataList = await addNewRepositoryFieldValue(itemDataList);
    console.info('_________itemDataList____________', newItemDataList);

    console.timeEnd('[test-case-import] process');

    try {
      console.info('[test-case-import] new ItemData', newItemDataList);
      return {
        newItemDataList: newItemDataList.sort((a, b) => a.__indexKey - b.__indexKey),
        assignKeys: ['values'],
      };
    } catch (err) {
      return {
        newItemDataList: [],
        assignKeys: [],
      };
    }
  };

  return await importCallBack();
};
