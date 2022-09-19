import { getData } from '@giteeteam/apps-team-api';

// 判断数据是否超过 1000 条
const isMoreThanThousands = d => d?.length > 1000;

// 去除首位空格
const trimData = datas => `${datas}`?.trim() ?? '';

// 根据数据是否超过 1000 条来截取数据
const getDataByLength = d => (isMoreThanThousands(d) ? d.slice(0, 1000) : d);

const isFilterGroup = group => `${group ?? ''}`?.split('/').filter(d => trimData(d)).length > 8;

// 过滤不符合条件数据
const filterData = d => d.filter(item => item.name && !isFilterGroup(item.group));

const clone = d => JSON.parse(JSON.stringify(d));

const errorLog1 = '单次导入最多支持1000条，超过1000条，导入前1000条';

// 判断是否为中文字符
// eslint-disable-next-line no-control-regex
const isTwoChar = d => /[^\x00-\xff]/g.test(d);

// 获取字符串字符数
const getCharNum = d =>
  `${d ?? ''}`?.split('').reduce((prev, cur) => {
    prev = prev + (isTwoChar(cur) ? 2 : 1);

    return prev;
  }, 0);

const splitSteps = datas => datas?.replace(/^[\r\n]+/g, '')?.split(/(?=【\d+】)/g) ?? [];

const testStep = datas => /(?=【\d+】)/g.test(datas);

const isSteps = datas => /【\d+】/g.test(datas);

const testSteps = datas => (isSteps(datas) ? splitSteps(datas).some(d => !testStep(d)) : false);

const getCharNumErrorIndex = datas =>
  splitSteps(datas)
    .map((d, index) => (getCharNum(d) > 500 ? index : null))
    .filter(d => d !== null);

const getTestDetailsErrors = datas =>
  datas?.reduce((prev, cur, index) => {
    // 校验用例标题
    if (!trimData(cur.name)) {
      prev = prev.concat([`第 ${index + 1} 条用例标题为空，用例标题 为必填项，不予以导入`]);
    }

    // 校验所属分组
    if (isFilterGroup(cur.group)) {
      prev = prev.concat([
        `第 ${index + 1} 条所属分组层数超过限制，所属分组 只能导入 8 层，不予以导入`,
      ]);
    }

    // 校验前置条件字数
    if (getCharNum(cur.precondition) > 1000) {
      prev = prev.concat([
        `第 ${index + 1} 条前置条件字符数超过限制，前置条件 限制 1000 个字符，不予以导入`,
      ]);
    }

    // 校验步骤描述格式
    if (testSteps(cur.action)) {
      prev = prev.concat([`第 ${index + 1} 条步骤描述格式错误，不予以导入`]);
    }

    // 校验步骤描述字数
    if (getCharNumErrorIndex(cur.action).length) {
      prev = prev.concat(
        `第 ${index + 1} 条用例的 ${getCharNumErrorIndex(cur.action)
          .map(d => d + 1)
          .join('、')} 条步骤描述超过限制，步骤描述 限制 500 个字符，不予以导入`,
      );
    }

    // 校验预期结果格式
    if (testSteps(cur.result)) {
      prev = prev.concat([`第 ${index + 1} 条预期结果格式错误，不予以导入`]);
    }

    // 校验预期结果字数
    if (getCharNumErrorIndex(cur.result).length) {
      prev = prev.concat(
        `第 ${index + 1} 条用例的 ${getCharNumErrorIndex(cur.result)
          .map(d => d + 1)
          .join('、')} 条预期结果超过限制，预期结果 限制 500 个字符，不予以导入`,
      );
    }

    // 校验数据格式
    if (testSteps(cur.data)) {
      prev = prev.concat([`第 ${index + 1} 条数据格式错误，不予以导入`]);
    }

    // 校验数据字数
    if (getCharNumErrorIndex(cur.data).length) {
      prev = prev.concat(
        `第 ${index + 1} 条用例的 ${getCharNumErrorIndex(cur.data)
          .map(d => d + 1)
          .join('、')} 条数据超过限制，数据 限制 500 个字符，不予以导入`,
      );
    }

    return prev;
  }, []);

const getFiledByValue = (name, maps) => {
  const mapData = [...Object.entries(maps)].find(([_key, value]) => value === name);

  return mapData ? mapData[0] : '';
};

const getCurData = (cur, maps) =>
  [...Object.entries(cur)].reduce((curPrev, [key, value]) => {
    if (maps[key]) {
      curPrev = {
        ...curPrev,
        [maps[key]]: value,
      };
    }
    return curPrev;
  }, {});

const getDataByFieldMaping = (datas, maps) =>
  datas?.reduce((prev, cur) => {
    prev.push(getCurData(cur, maps));

    return prev;
  }, []);

export const runValidate = async () => {
  const { data, fieldMapping, workspaceId } = global.triggerParams;

  // 根据 workspaceKId 获取事项类型
  const getItemTypeName = async () => {
    const workspace = await getData(false, 'Workspace', {
      objectId: workspaceId,
    });

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

  // eslint-disable-next-line no-console
  console.log('vali-1111', data);

  const itemTypeName = await getItemTypeName();

  const getValidateErrors = (datas, errors: any[] = []) => {
    if (isMoreThanThousands(datas)) {
      !errors.includes(errorLog1) && errors.push(errorLog1);
    }

    if (!itemTypeName) {
      errors = ['事项类型关联未配置，所有数据不予导入，请先配置关联的事项类型', ...errors];
    }

    return errors.concat(getTestDetailsErrors(datas) ?? []);
  };

  const getDataByFieldKey = (datas, maps) =>
    datas.reduce((prev, cur) => {
      itemTypeName &&
        prev.push(
          [...Object.entries(cur)].reduce((curPrev, [key, value]) => {
            curPrev = {
              ...curPrev,
              [getFiledByValue(key, maps)]: value,
              类型: itemTypeName,
            };
            return curPrev;
          }, {}),
        );

      return prev;
    }, []);

  // 校验数据
  const validateAppData = d => ({
    errors: getValidateErrors(d) || [],
    errorCount: getValidateErrors(d)?.length || 0,
    data: getValidateErrors(d)?.length
      ? []
      : getDataByFieldKey(filterData(getDataByLength(clone(d))), fieldMapping) || [],
    fieldMapping: {
      ...fieldMapping,
      类型: 'itemType',
    },
    stop: false,
  });

  return await validateAppData(getDataByFieldMaping(data, fieldMapping));
};
