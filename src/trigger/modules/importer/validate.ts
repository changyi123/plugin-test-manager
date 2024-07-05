import { i18n } from '@giteeteam/apps-api';
import { getData, getParseQuery } from '@giteeteam/apps-team-api';

import { InfinityLimit } from '../../../common/constant';

// 判断数据是否超过 1000 条
const isMoreThanThousands = d => d?.length > 999;

// 去除首位空格
const trimData = datas => `${datas ?? ''}`.trim();

// 根据数据是否超过 1000 条来截取数据
const getDataByLength = d => (isMoreThanThousands(d) ? d.slice(0, 999) : d);

const isFilterGroup = (group, limit = 8) =>
  `${group ?? ''}`?.split('/').filter(d => trimData(d)).length > limit;

const filterGroupNum = group =>
  `${group ?? ''}`?.split('/').filter(d => trimData(d)?.length > 100).length > 0;

// 过滤不符合条件数据
const filterData = d => d.filter(item => !isFilterGroup(item?.group ?? ''));

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
const regexpList = ['【\\d+】', '\\d+. ', '\\d+、'];

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

const getTestDetailsErrors = (datas, resProps?: Record<string, unknown>) =>
  datas?.reduce((prev, cur, index) => {
    // 校验用例标题
    if (!trimData(cur.name)) {
      prev = prev.concat([
        `${i18n.t('trigger.importer.validate.No')} ${index + 1} ${i18n.t(
          'trigger.importer.validate.validateErrors.0',
        )}`,
      ]);
    }

    // 校验所属分组是否为空
    if (
      global.env.GROUP_REQUIRED_WHEN_VALIDATE &&
      !isFilterGroup(cur?.group, 0) &&
      !resProps?.group
    ) {
      prev = prev.concat([
        `${i18n.t('trigger.importer.validate.No')} ${index + 1} ${i18n.t(
          'trigger.importer.validate.validateErrors.11',
        )}`,
      ]);
    }

    // 校验所属分组
    if (isFilterGroup(cur?.group) && !resProps?.group) {
      prev = prev.concat([
        `${i18n.t('trigger.importer.validate.No')} ${index + 1} ${i18n.t(
          'trigger.importer.validate.validateErrors.1',
        )}`,
      ]);
    }

    // 校验所属分组字数
    if (filterGroupNum(cur?.group) && !resProps?.group) {
      prev = prev.concat([
        `${i18n.t('trigger.importer.validate.No')} ${index + 1} ${i18n.t(
          'trigger.importer.validate.validateErrors.2',
        )}`,
      ]);
    }

    // 校验前置条件字数
    if (getStringLength(cur.precondition) > 2000) {
      prev = prev.concat([
        `${i18n.t('trigger.importer.validate.No')} ${index + 1} ${i18n.t(
          'trigger.importer.validate.validateErrors.3',
        )}`,
      ]);
    }

    // 校验步骤格式
    if (testSteps(cur.action)) {
      prev = prev.concat([
        `${i18n.t('trigger.importer.validate.No')} ${index + 1} ${i18n.t(
          'trigger.importer.validate.validateErrors.4',
        )}`,
      ]);
    }

    // 校验步骤字数
    if (getCharNumErrorIndex(cur.action).length) {
      prev = prev.concat(
        `${i18n.t('trigger.importer.validate.No')} ${index + 1} ${i18n.t(
          'trigger.importer.validate.case',
        )} ${getCharNumErrorIndex(cur.action)
          .map(d => d + 1)
          .join('、')} ${i18n.t('trigger.importer.validate.validateErrors.5')}`,
      );
    }

    // 校验预期结果格式
    if (testSteps(cur.result)) {
      prev = prev.concat([
        `${i18n.t('trigger.importer.validate.No')} ${index + 1} ${i18n.t(
          'trigger.importer.validate.validateErrors.6',
        )}`,
      ]);
    }

    // 校验预期结果字数
    if (getCharNumErrorIndex(cur.result).length) {
      prev = prev.concat(
        `${i18n.t('trigger.importer.validate.No')} ${index + 1} ${i18n.t(
          'trigger.importer.validate.case',
        )} ${getCharNumErrorIndex(cur.result)
          .map(d => d + 1)
          .join('、')} ${i18n.t('trigger.importer.validate.validateErrors.7')}`,
      );
    }

    // 校验数据格式
    if (testSteps(cur.data)) {
      prev = prev.concat([
        `${i18n.t('trigger.importer.validate.No')} ${index + 1} ${i18n.t(
          'trigger.importer.validate.validateErrors.8',
        )}`,
      ]);
    }

    // 校验数据字数
    if (getCharNumErrorIndex(cur.data).length) {
      prev = prev.concat(
        `${i18n.t('trigger.importer.validate.No')} ${index + 1} ${i18n.t(
          'trigger.importer.validate.case',
        )} ${getCharNumErrorIndex(cur.data)
          .map(d => d + 1)
          .join('、')} ${i18n.t('trigger.importer.validate.validateErrors.9')}`,
      );
    }

    return prev;
  }, []);

const getFiledByValue = (name, maps) => {
  const mapData = [...Object.entries(maps)].find(([_key, value]) => value === name);

  return mapData ? mapData[0] : '';
};

const getCurData = (cur, maps, path) =>
  [...Object.entries(cur)].reduce((curPrev, [key, value]) => {
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
  const { data, fieldMapping, workspaceId, group } = global.triggerParams;

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

  const getGroupPath = async workspace => {
    let path = '';
    if (!group) return path;
    const getRepositoryMap = async () => {
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
    const repositoryMap = await getRepositoryMap();
    console.info('repositoryMap', JSON.stringify(repositoryMap));

    const getRepositoryPath = repository => {
      console.info('getRepositoryPath', JSON.stringify(repository));
      if (repository?.name) path = `${repository.name}/${path}`;
      if (repository?.parentId) getRepositoryPath(repositoryMap[repository.parentId]);
    };
    getRepositoryPath(repositoryMap[group]);
    console.info('path', path);
    return path;
  };

  // eslint-disable-next-line no-console
  console.log('vali-1111', data);
  const workspace = await getData(false, 'Workspace', {
    objectId: workspaceId,
  });
  const itemTypeName = await getItemTypeName(workspace);

  const groupPath = await getGroupPath(workspace);

  const getValidateErrors = (datas, errors: any[] = []) => {
    if (isMoreThanThousands(datas)) {
      !errors.includes(errorLog1) && errors.push(errorLog1);
    }

    if (!itemTypeName) {
      errors = [i18n.t('trigger.importer.validate.validateErrors.10'), ...errors];
    }

    return errors.concat(getTestDetailsErrors(datas, { group }) ?? []).filter(Boolean);
  };

  const getDataByFieldKey = (datas, maps) =>
    datas.reduce((prev, cur) => {
      itemTypeName &&
        prev.push(
          [...Object.entries(cur)].reduce((curPrev, [key, value]) => {
            curPrev = {
              ...curPrev,
              [getFiledByValue(key, maps)]: value,
              // [i18n.t('trigger.importer.validate.itemType')]: itemTypeName,
              类型: itemTypeName,
              itemType: itemTypeName,
            };
            return curPrev;
          }, {}),
        );

      return prev;
    }, []);

  // 校验数据
  const validateAppData = d => ({
    errors: getValidateErrors(d)?.filter(Boolean) || [],
    errorCount: getValidateErrors(d)?.filter(Boolean)?.length || 0,
    data: getValidateErrors(d)?.length
      ? []
      : getDataByFieldKey(filterData(getDataByLength(clone(d))), fieldMapping) || [],
    fieldMapping: {
      ...fieldMapping,
      // [i18n.t('trigger.importer.validate.itemType')]: 'itemType',
      类型: 'itemType',
      itemType: 'itemType',
    },
    stop: false,

    // parse context 用户跳过事项保存的后置操作
    extendParseContext: global.env?.importerExtendParseContext ?? {
      skipHandleApps: true,
      skipItemForest: true,
      // skipUpdateWorkflowConfigUsers: true,
    },
  });

  const res = await validateAppData(getDataByFieldMaping(data, fieldMapping, groupPath));
  return res;
};
