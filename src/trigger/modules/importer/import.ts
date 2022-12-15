import parallelLimit from 'async/parallelLimit';
import { getParseModel, saveAllObject, getAllData, getData } from '@giteeteam/apps-team-api';
import { updateItems } from '../../lib/coreApi';

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

const replaceRn = datas => datas?.replace(/^[\r\n]+/g, '');

const splitSteps = datas => `${replaceRn(datas) ?? ''}`?.split(/(?=【\d+】)/g) ?? [];

const pickStepIndex = data => {
  return +data.replace(/【(\d+)】(.|[\r\n])*?$/, '$1');
};
const getStepData = datas => datas.replace(/^【\d+】/g, '');

const getIsStrict = step => (replaceRn(step) ? /(^|([\r\n]))【\d+】/g.test(replaceRn(step)) : true);

const getSortIndex = (index = 0) => Math.floor(Date.now() / 1000) * 10e5 + index * 1000;

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
  const { data, appFieldsData, group } = global.triggerParams;
  // eslint-disable-next-line no-console
  console.log('import-22222', global.triggerParams);

  // 组装更新的数据
  const handleItemValues = () => {
    const isNotHaveMap = appFieldsData.length;
    const itemsData = isNotHaveMap ? appFieldsData : data;

    const needUpdateValues = itemsData
      .reverse()
      .map((item, index) => ({
        objectId: item.itemId ?? item.objectId,
        values: {
          r_test_manager_type: 'TestCase',
          r_test_manager_detail: JSON.stringify({
            precondition: item.precondition,
            steps: isNotHaveMap ? getStepsData(clone(item)) : [],
          }),
          r_test_manager_sortIndex: getSortIndex(index),
        },
      }))
      .filter(item => item.objectId);

    return needUpdateValues;
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
  const getRepoData = async () => {
    const repoData = await getAllData(false, TEST_MANAGER_REPO, {
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

  const handleRepoPath = datas => {
    const getPath = (gro, _datas, path: any[] = []) => {
      path.push(gro.name);

      if (gro.parentKey && gro.parentKey !== 'root') {
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

  const updateItemValue = async itemValues => {
    const repoDatas = await getRepoData();
    const testRepoMap = new Map();

    appFieldsData.forEach(item => {
      const repoData = repoDatas.find(gro => gro.path === getGroupPath(item.group).join('/'));

      repoData && testRepoMap.set(item.itemId, repoData.objectId);
    });

    const needToUpdateItemValues = itemValues.map(item => ({
      ...item,
      values: {
        ...item.values,
        r_test_manager_repository: testRepoMap.get(item.objectId),
      },
    }));

    const taskQueue = needToUpdateItemValues.map(item => {
      return async () =>
        updateItems(item.objectId, {
          values: {
            ...item.values,
            r_test_manager_repository: testRepoMap.get(item.objectId),
          },
        });
    });

    // TODO 更新事项 values
    const res = await parallelLimit(taskQueue, 10);

    return res;
  };

  const createRepoGroup = async (datas, i) => {
    const RepoParseObj = getParseModel(false, TEST_MANAGER_REPO);
    const newRepoData = await getRepoData();

    const repos = datas.map((gro, index) => {
      const parent = i === 0 ? undefined : getParent(RepoParseObj, newRepoData, gro);

      const repo = new RepoParseObj({
        parent: parent,
        workspaceKey,
        name: gro.name,
        sortIndex: getSortIndex(index),
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
    // 获取创建的事项数据
    const needUpdateValues = handleItemValues();

    if (!group) {
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

      // 绑定测试用例事项用例库，并更新事项数据
      await updateItemValue(needUpdateValues);
    } else {
      // 更新测试用例用例库数据
      const taskQueue = needUpdateValues
        .filter(d => d.objectId)
        .map(item => {
          return async () =>
            updateItems(item.objectId, {
              values: {
                ...item.values,
                r_test_manager_repository: group === 'root' ? '' : group,
              },
            });
        });

      await parallelLimit(taskQueue, 10);
    }

    return {
      code: 200,
      message: '成功',
    };
  };

  return await importCallBack();
};
