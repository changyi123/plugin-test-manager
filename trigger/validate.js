const { data, fieldMapping, workspaceId } = triggerParams;

console.log('vali-1111', data);

// 根据 workspaceKId 获取事项类型
const getItemTypeName = async () => {
  const workspace = await apis.getData(false, 'Workspace', {
    objectId: workspaceId,
  });

  const testMangerConfig = await apis.getData(false, 'test_manager_TestConfig', {
    workspaceKey: workspace.toJSON().key,
  });

  const itemType = await apis.getData(false, 'ItemType', {
    key: testMangerConfig?.toJSON()?.itemTypeMap?.TestDetail,
  });

  return itemType?.toJSON().name;
};

const itemTypeName = await getItemTypeName();

// 判断数据是否超过 1000 条
const isMoreThanThousands = d => d?.length > 1000;

// 根据数据是否超过 1000 条来截取数据
const getDataByLength = d => (isMoreThanThousands(d) ? d.slice(0, 1000) : d);

const isFilter = d => d.name && !isFilterGroup(d.group);

const filterData = d => d.filter(item => isFilter(item));

const clone = d => JSON.parse(JSON.stringify(d));

const errorLog1 = '单次导入最多支持1000条，超过1000条，导入前1000条';

const getNullNameIndex = (item, index) => (item.name ? null : index);

const isFilterGroup = group => group?.split?.('/').length > 5;

const getGroupIndex = (item, index) => (isFilterGroup(item.group) ? index : null);

// eslint-disable-next-line no-control-regex
const isTwoChar = d => /[^\x00-\xff]/g.test(d);

const getCharNum = d =>
  d?.split?.('').reduce((prev, cur) => {
    prev = prev + (isTwoChar(cur) ? 2 : 1);

    return prev;
  }, 0);

const getConditionIndex = (item, index) => (getCharNum(item.precondition) > 500 ? index : null);

const splitData = datas => datas?.split(/[\r\n]+/g) ?? [];

const commonMap = (d, fn) => d?.map((item, index) => fn(item, index)).filter(item => item !== null);

const getIndexObj = (item, index, type) => {
  const _data = splitData(item[type])
    .map((item, i) => (getCharNum(item) > 500 ? i : null))
    .filter(d => d !== null);

  return _data?.length
    ? {
        index: index,
        errors: _data,
      }
    : null;
};

const getStepsIndex = (datas, type) =>
  datas?.map((item, index) => getIndexObj(item, index, type)).filter(item => item !== null);

const getFieldErrorsData = (errors, datas, getFn, getTips) =>
  errors.concat(commonMap(datas, getFn).map(i => getTips(i)));

const getStepErrorsData = (errors, datas, type, getTips) =>
  errors.concat(getStepsIndex(datas, type).map(i => getTips(i)));

const getErrors = (datas, errors = []) => {
  // 校验用例数量是否超过 1000
  if (isMoreThanThousands(datas)) {
    !errors.includes(errorLog1) && errors.push(errorLog1);
  }

  // 校验用例标题
  if (commonMap(datas, getNullNameIndex)?.length) {
    errors = getFieldErrorsData(
      errors,
      datas,
      getNullNameIndex,
      i => ` *用例标题 为必填项,第 ${i + 1} 条用例标题为空，不予以导入`,
    );
  }

  // 校验所属分组
  if (commonMap(datas, getGroupIndex)?.length) {
    errors = getFieldErrorsData(
      errors,
      datas,
      getGroupIndex,
      i => `所属分组 只能导入 5 层,第 ${i + 1} 条所属分组层数超过限制，不予以导入`,
    );
  }

  // 校验前置条件
  if (commonMap(datas, getConditionIndex)?.length) {
    errors = getFieldErrorsData(
      errors,
      datas,
      getConditionIndex,
      i =>
        `前置条件 限制 500 个字符,第 ${i + 1} 条前置条件字符数超过限制，此条前置条件将不予以导入`,
    );
  }

  // 校验步骤描述
  if (getStepsIndex(datas, 'action')?.length) {
    errors = getStepErrorsData(
      errors,
      datas,
      'action',
      i =>
        `步骤描述 限制 500 个字符,第 ${i.index + 1} 条用例的 ${i.errors
          .map(d => d + 1)
          .join('、')} 条步骤描述超过限制，此条步骤描述将不予以导入`,
    );
  }

  // 校验预期结果
  if (getStepsIndex(datas, 'result')?.length) {
    errors = getStepErrorsData(
      errors,
      datas,
      'result',
      i =>
        `预期结果 限制 500 个字符,第 ${i.index + 1} 条用例的 ${i.errors
          .map(d => d + 1)
          .join('、')} 条预期结果超过限制，此条预期结果将不予以导入`,
    );
  }

  // 校验数据
  if (getStepsIndex(datas, 'data')?.length) {
    errors = getStepErrorsData(
      errors,
      datas,
      'data',
      i =>
        `数据 限制 500 个字符,第 ${i.index + 1} 条用例的 ${i.errors
          .map(d => d + 1)
          .join('、')} 条数据超过限制，此条数据将不予以导入`,
    );
  }

  if (!itemTypeName) {
    errors = ['事项类型关联未配置，所有数据不予导入，请先配置关联的事项类型', ...errors];
  }

  return errors;
};

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

const getDataByFieldKey = (datas, maps) =>
  datas.reduce((prev, cur) => {
    itemTypeName &&
      prev.push(
        [...Object.entries(cur)].reduce((curPrev, [key, value]) => {
          curPrev = {
            ...curPrev,
            [getFiledByValue(key, maps)]: value,
            事项类型: itemTypeName,
          };
          return curPrev;
        }, {}),
      );

    return prev;
  }, []);

// 校验数据
const validateAppData = d => ({
  errors: getErrors(d) || [],
  errorCount: getErrors(d)?.length || 0,
  data: getDataByFieldKey(filterData(getDataByLength(clone(d))), fieldMapping) || [],
  fieldMapping: {
    ...fieldMapping,
    事项类型: 'itemType',
  },
  stop: false,
});

return validateAppData(getDataByFieldMaping(data, fieldMapping));
