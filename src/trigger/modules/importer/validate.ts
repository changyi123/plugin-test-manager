import { i18n } from '@giteeteam/apps-api';
import { axios, getData, getParseQuery } from '@giteeteam/apps-team-api';
import dayjs from 'dayjs';
import { InfinityLimit } from '../../../common/constant';

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

// 判断数据是否超过 1000 条
const isMoreThanThousands = d => d?.length > 999;

// 去除首位空格
const trimData = datas => `${datas ?? ''}`.trim();

const isFilterGroup = (group, limit = 8) =>
  `${group ?? ''}`?.split('/').filter(d => trimData(d)).length > limit;

const filterGroupNum = group =>
  `${group ?? ''}`?.split('/').filter(d => trimData(d)?.length > 100).length > 0;

// 过滤不符合条件数据
const filterDataByErrors = (d, errors) => {
  const errorIndexMap = errors.reduce((map, error) => ({ ...map, [error.index]: true }), {});
  return d.filter((_, index) => !errorIndexMap[index]);
};

const clone = d => JSON.parse(JSON.stringify(d));

const errorLog1 = i18n.t('trigger.importer.validate.numberValidate');

// 判断是否为中文字符
// eslint-disable-next-line no-control-regex
// const isTwoChar = d => /[^\x00-\xff]/g.test(d);

// 获取字符串字符数
// const getCharNum = d =>
//   `${d ?? ''}`?.split('').reduce((prev, cur) => {
//     prev = prev + (isTwoChar(cur) ? 2 : 1);

//     return prev;
//   }, 0);

const getStringLength = d => `${d ?? ''}`?.length;
const regexpList = ['【\\d+】', '\\d+.', '\\d+、'];

const splitSteps = datas => {
  try {
    const stepsString = datas?.replace(/^[\r\n]+/g, '') ?? '';
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

const testStep = datas => regexpList.some(regexp => new RegExp(`(?=${regexp})`, 'g').test(datas));

const isSteps = datas => regexpList.some(regexp => new RegExp(`^${regexp}`, 'g').test(datas));

const testSteps = datas => (isSteps(datas) ? splitSteps(datas).some(d => !testStep(d)) : false);

const getCharNumErrorIndex = datas =>
  splitSteps(datas)
    .map((d, index) => (getStringLength(d) > 2000 ? index : null))
    .filter(d => d !== null);

const statusNames = ['未开始', '通过', '失败', '阻塞', '执行中', '已取消'];
const checkStepStatus = datas =>
  splitSteps(datas)
    .map((d, index) => {
      if (statusNames.includes(d?.trim())) {
        return index;
      } else {
        return null;
      }
    })
    .filter(d => d !== null);

const checkExecutionStatus = data => {
  return !statusNames.includes(data?.trim());
};
const getTestDetailsErrors = (datas, repositoryPathMap, resProps?: Record<string, unknown>) =>
  datas?.reduce((prev, cur, index) => {
    // 校验用例标题
    if (!trimData(cur.name)) {
      prev = prev.concat({ index, error: i18n.t('trigger.importer.validate.validateErrors.0') });
    }

    // 校验所属分组是否为空
    if (
      global.env.GROUP_REQUIRED_WHEN_VALIDATE &&
      !repositoryPathMap[`${cur?.group ? `${cur.group}/` : ''}`]
    ) {
      prev = prev.concat({
        index,
        error: i18n.t('trigger.importer.validate.validateErrors.11'),
      });
    }

    // 校验所属分组
    if (isFilterGroup(cur?.group) && !resProps?.group) {
      prev = prev.concat({ index, error: i18n.t('trigger.importer.validate.validateErrors.1') });
    }

    // 校验所属分组字数
    if (filterGroupNum(cur?.group) && !resProps?.group) {
      prev = prev.concat({ index, error: i18n.t('trigger.importer.validate.validateErrors.2') });
    }

    // 校验前置条件字数
    if (getStringLength(cur.precondition) > 2000) {
      prev = prev.concat({ index, error: i18n.t('trigger.importer.validate.validateErrors.3') });
    }

    // 校验步骤格式
    if (testSteps(cur.action)) {
      prev = prev.concat({ index, error: i18n.t('trigger.importer.validate.validateErrors.4') });
    }

    // 校验步骤字数
    if (getCharNumErrorIndex(cur.action).length) {
      prev = prev.concat({
        index,
        error: `${i18n.t('trigger.importer.validate.case')} ${getCharNumErrorIndex(cur.action)
          .map(d => d + 1)
          .join('、')} ${i18n.t('trigger.importer.validate.validateErrors.5')}`,
      });
    }

    // 校验预期结果格式
    if (testSteps(cur.result)) {
      prev = prev.concat({ index, error: i18n.t('trigger.importer.validate.validateErrors.6') });
    }

    // 校验预期结果字数
    if (getCharNumErrorIndex(cur.result).length) {
      prev = prev.concat({
        index,
        error: `${i18n.t('trigger.importer.validate.case')} ${getCharNumErrorIndex(cur.action)
          .map(d => d + 1)
          .join('、')} ${i18n.t('trigger.importer.validate.validateErrors.7')}`,
      });
    }

    // 校验数据格式
    if (testSteps(cur.data)) {
      prev = prev.concat({ index, error: i18n.t('trigger.importer.validate.validateErrors.8') });
    }

    // 校验数据字数
    if (getCharNumErrorIndex(cur.data).length) {
      prev = prev.concat({
        index,
        error: `${i18n.t('trigger.importer.validate.case')} ${getCharNumErrorIndex(cur.action)
          .map(d => d + 1)
          .join('、')} ${i18n.t('trigger.importer.validate.validateErrors.9')}`,
      });
    }

    // 校验实际结果格式
    if (testSteps(cur.actualResult)) {
      prev = prev.concat({ index, error: i18n.t('trigger.importer.validate.validateErrors.12') });
    }

    // 校验实际结果字数
    if (getCharNumErrorIndex(cur.actualResult).length) {
      prev = prev.concat({
        index,
        error: `${i18n.t('trigger.importer.validate.run')} ${getCharNumErrorIndex(cur.actualResult)
          .map(d => d + 1)
          .join('、')} ${i18n.t('trigger.importer.validate.validateErrors.13')}`,
      });
    }

    // validate step status
    if (testSteps(cur.stepStatus)) {
      prev = prev.concat({ index, error: i18n.t('trigger.importer.validate.validateErrors.14') });
    }

    if (checkStepStatus(cur.stepStatus).length) {
      prev = prev.concat({
        index,
        error: `${i18n.t('trigger.importer.validate.run')} ${checkStepStatus(cur.stepStatus)
          .map(d => d + 1)
          .join('、')} ${i18n.t('trigger.importer.validate.validateErrors.15')}`,
      });
    }

    // validate execution status
    if (cur.executionStatus && checkExecutionStatus(cur.executionStatus)) {
      prev = prev.concat({ index, error: i18n.t('trigger.importer.validate.validateErrors.16') });
    }

    // validate execution time
    if (cur.executionTime && !dayjs(cur.executionTime).isValid()) {
      prev = prev.concat({ index, error: i18n.t('trigger.importer.validate.validateErrors.17') });
    }
    return prev;
  }, []);

const getFiledByValue = (name, maps) => {
  const mapData = [...Object.entries(maps)].find(([_key, value]) => value === name);

  return mapData ? mapData[0] : '';
};

const getCurData = (cur, maps, path) =>
  [...Object.entries(cur)].reduce(
    (curPrev, [key, value]) => {
      if (maps[key]) {
        let targetValue = value;
        if (maps[key] === 'group') {
          const prevGroup = curPrev[maps[key]];
          if (prevGroup?.length) {
            targetValue = prevGroup + '/' + targetValue;
          }
        }
        curPrev = {
          ...curPrev,
          [maps[key]]: targetValue,
        };
      }
      return curPrev;
    },
    // 分组前加当前分组信息
    { group: path },
  );

const getDataByFieldMaping = (datas, maps, path) =>
  datas?.reduce((prev, cur) => {
    prev.push(getCurData(cur, maps, path));

    return prev;
  }, []);

export const runValidate = async () => {
  const { data: originData, fieldMapping, workspaceId, group, executionId } = global.triggerParams;
  // 根据 workspaceKId 获取事项类型
  const getItemTypeName = async workspace => {
    const testMangerConfig = await getData(true, 'TestConfig', {
      workspaceKey: workspace?.get('key'),
    });

    const itemType = await getData(false, 'ItemType', {
      key: testMangerConfig?.get('itemTypeMap')?.TestCase,
      // 测试管理隐藏事项不被过滤
      __context: {
        displayModule: 'plugin.testManager',
      },
    });

    return itemType?.get('name');
  };

  const getRunItemTypeName = async workspace => {
    if (executionId) {
      const itemType = await getData(false, 'ItemType', {
        key: 'test_manager_run',
        // 测试管理隐藏事项不被过滤
        __context: {
          displayModule: 'plugin.testManager',
        },
      });
      return itemType?.get('name');
    }
    return '';
  };

  const getRepositoryMap = async workspace => {
    if (!global.env.GROUP_REQUIRED_WHEN_VALIDATE && !group) return {};
    const query = await (getParseQuery(true, 'Repository') as any)
      .equalTo('workspaceKey', workspace.get('key'))
      .select(['name', 'objectId', 'parent'])
      .limit(InfinityLimit);
    const repositoryParseObjects = await query.find({
      useMasterKey: true,
    });

    return repositoryParseObjects.reduce(
      (prev, parseObj) => ({
        ...prev,
        [parseObj.get('objectId')]: {
          key: parseObj.get('objectId'),
          name: parseObj.get('name'),
          parentId: parseObj.get('parent')?.objectId,
        },
      }),
      {},
    );
  };

  const getPath = repository => {
    let path = '';
    const getRepositoryPath = repository => {
      if (repository?.name) path = `${repository.name}/${path}`;
      if (repository?.parentId) getRepositoryPath(repositoryMap[repository.parentId]);
    };
    getRepositoryPath(repository);
    return path;
  };

  const getRepositoryPathMap = repositoryMap => {
    const existPathMap = {};
    Object.values(repositoryMap).forEach(repository => {
      existPathMap[getPath(repository)] = true;
    });
    return existPathMap;
  };

  const getGroupPath = async (repositoryMap, group) => {
    if (!group) return '';

    return getPath(repositoryMap[group]);
  };

  // eslint-disable-next-line no-console
  console.log('test_manager_validate_originData', originData);
  const workspace = await getData(false, 'Workspace', {
    objectId: workspaceId,
  });
  const itemTypeName = await getItemTypeName(workspace);
  const runItemTypeName = await getRunItemTypeName(workspace);
  console.info('test_manager_validate_itemTypeName', itemTypeName, runItemTypeName);
  const repositoryMap = await getRepositoryMap(workspace);
  const repositoryPathMap = getRepositoryPathMap(repositoryMap);
  console.info(
    'test_manager_validate_repositoryMap',
    JSON.stringify({ repositoryMap, repositoryPathMap }),
  );

  const groupPath = await getGroupPath(repositoryMap, group);

  const getValidateErrors = (datas, errors: any[] = []) => {
    if (!itemTypeName) {
      errors = [{ error: i18n.t('trigger.importer.validate.validateErrors.10') }, ...errors];
    }
    if (executionId && !runItemTypeName) {
      errors = [{ error: i18n.t('trigger.importer.validate.validateErrors.10') }, ...errors];
    }

    return errors
      .concat(getTestDetailsErrors(datas, repositoryPathMap, { group }) ?? [])
      .filter(Boolean);
  };

  const getDataByFieldKey = (datas, maps) =>
    datas.reduce((prev, cur) => {
      itemTypeName &&
        prev.push(
          [...Object.entries(cur)].reduce((curPrev, [key, value]) => {
            const isExecution = cur?.executionId;
            curPrev = {
              ...curPrev,
              [getFiledByValue(key, maps)]: value,
              // [i18n.t('trigger.importer.validate.itemType')]: itemTypeName,
              类型: isExecution ? runItemTypeName : itemTypeName,
              itemType: isExecution ? runItemTypeName : itemTypeName,
              r_test_manager_runMapCaseKey: cur?.mapKey,
              ...(isExecution && {
                r_test_manager_linkItems: [cur?.executionId],
              }),
            };
            return curPrev;
          }, {}),
        );

      return prev;
    }, []);

  // 校验数据
  const buildResponse = (errors, data) => {
    const validated = filterDataByErrors(data, errors);
    return {
      errors,
      errorCount: data.length - validated.length,
      data: getDataByFieldKey(data, fieldMapping) || [],
      fieldMapping: {
        ...fieldMapping,
        // [i18n.t('trigger.importer.validate.itemType')]: 'itemType',
        类型: 'itemType',
        itemType: 'itemType',
        ...(executionId && {
          r_test_manager_runMapCaseKey: 'r_test_manager_runMapCaseKey',
          r_test_manager_linkItems: 'r_test_manager_linkItems',
        }),
      },
      stop: false,

      // parse context 用户跳过事项保存的后置操作
      extendParseContext: global.env?.importerExtendParseContext ?? {
        skipHandleApps: true,
        skipItemForest: true,
        // skipUpdateWorkflowConfigUsers: true,
      },
    };
  };

  let errors = [];
  let data = originData;
  if (isMoreThanThousands(originData)) {
    data = clone(originData).slice(0, 999);
    errors.push({ error: errorLog1 });
  }
  let items = getDataByFieldMaping(data, fieldMapping, groupPath);
  console.info(items, 'getDataByFieldMaping');
  errors = getValidateErrors(items, errors)?.filter(Boolean) || [];

  const validateWebTriggers = global.env.VALIDATE_WEB_TRIGGERS || [];
  const replaceData = {
    applicationId: global.env.applicationId,
  };
  for (const originWebTriggerParams of validateWebTriggers) {
    try {
      const webTriggerParamsString = JSON.stringify(originWebTriggerParams);
      const webTriggerParams = JSON.parse(
        webTriggerParamsString.replace(/\${(.*?)}/g, (match, key) => replaceData[key] ?? key),
      );
      const errorResults = await axios({
        ...webTriggerParams,
        data: { items, workspaceKey: workspace.get('key') },
      });
      if (errorResults.length) errors.push(...errorResults);
    } catch (error) {
      console.error(error.message);
    }
  }

  // copy data to response
  if (executionId) {
    items = items
      .map(_item => {
        const key = uuidv4();
        return [
          {
            ..._item,
            mapKey: key,
          },
          {
            ..._item,
            mapKey: key,
            executionId,
          },
        ];
      })
      .flat();
  }

  const res = buildResponse(errors, items);
  return res;
};
