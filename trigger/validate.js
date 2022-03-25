// const triggerParams = {
//     data: [{
//             '所属分组': 'a/2/3/4/5/6/7',
//             '用例标题': '',
//             '优先级': 1,
//             '前置条件': 'aaaaaaa',
//             '步骤描述': '【1】 步骤1\r\n【2】 步骤2',
//             '预期结果': '【2】 结果2\r\n【3】 结果3',
//         },
//         {
//             '所属分组': 'a/2/3',
//             '用例标题': '',
//             '优先级': 1,
//             '前置条件': '111111111',
//             '步骤描述': '1、xxx\r\n2、www',
//             '预期结果': '1、xxx\r\n2、www',
//         }
//     ],
//     appFieldsData: [{
//             group: '44/234234/jyt1',
//             priority: '高',
//             action: '1.xxx\r\n2.www',
//             result: '1.xxx\r\n2.www',
//             itemId: 'qATTCWHO4A'
//         },
//         {
//             group: '测试01/测试03/测试06',
//             priority: '中',
//             action: '1.xxx\r\n2.www',
//             result: '1.xxx\r\n2.www',
//             itemId: '5t2whqoHD1'
//         }
//     ],
//     fieldMapping: {
//         '所属分组': 'group',
//         '优先级': 'priority',
//         '用例标题': 'name',
//         '前置条件': 'precondition',
//         '步骤描述': 'action',
//         '预期结果': 'result',
//     }
// }

const {
    data,
    appFieldsData,
    fieldMapping
} = triggerParams;


// 判断数据是否超过 1000 条
const isMoreThanThousands = d => d?.length > 1000;

// 根据数据是否超过 1000 条来截取数据
const getDataByLength = d => isMoreThanThousands(d) ? d.slice(0, 1000) : d;

// 过滤数据中用例标题为空的数据
const filterNullName = d => d.filter(item => item.name);

const isFilter = d => d.name && !isFilterGroup(d.group);

const filterData = d => d.filter(item => isFilter(item));

const clone = d => JSON.parse(JSON.stringify(d));

const errorLog1 = '单次导入最多支持1000条，超过1000条，导入前1000条';

const getNullNameIndex = (item, index) => item.name ? null : index;

const isFilterGroup = group => group?.split?.('/').length > 5;

const getGroupIndex = (item, index) => isFilterGroup(item.group) ? index : null;

const getConditionIndex = (item, index) => getCharNum(item.precondition) > 500 ? index : null;

const splitData = datas => datas?.split(/[\r\n]+/g) ?? [];

const commonMap = (d, fn) => d?.map((item, index) => fn(item, index)).filter(item => item !== null);

const validateActions = datas => commonMap(datas, getConditionIndex);

const getIndexObj = (item, index, type) => {
    // const _data = commonMap(splitData(item[type]), getConditionIndex)

    const _data = splitData(item[type]).map((item, i) => getCharNum(item) > 500 ? i : null).filter(Boolean);

    return _data?.length ? ({
        index: index,
        action: _data
    }) : null
};

const getStepsIndex = (datas, type) => datas?.map((item, index) => getIndexObj(item, index, type)).filter(item => item !== null)

const isTwoChar = d => /[^\x00-\xff]/g.test(d);

const getCharNum = d => d.split('').reduce((prev, cur) => {

    prev = prev + isTwoChar(cur) ? 2 : 1;

    return prev;
}, 0)

const getFieldErrorsData = (errors, datas, getFn, getTips) => errors.concat(commonMap(datas, getFn).map(i => getTips(i)));

const getStepErrorsData = (errors, datas, type, getTips) => errors.concat(getStepsIndex(datas, type).map(i => getTips(i)))

const getErrors = (datas, errors = []) => {
    // 校验用例数量是否超过 1000
    if (isMoreThanThousands(datas)) {
        !errors.includes(errorLog1) && errors.push(errorLog1)
    }

    // 校验用例标题
    if (commonMap(datas, getNullNameIndex)?.length) {
        errors = getFieldErrorsData(errors, datas, getNullNameIndex, i => ` *用例标题 为必填项,第 ${i + 1} 条用例标题为空，不予以导入`)
    }

    // 校验所属分组
    if (commonMap(datas, getGroupIndex)?.length) {
        errors = getFieldErrorsData(errors, datas, getGroupIndex, i => `所属分组 只能导入 5 层,第 ${i + 1} 条所属分组层数超过限制，不予以导入`)
    }

    // 校验前置条件
    if (commonMap(datas, getConditionIndex)?.length) {
        errors = getFieldErrorsData(errors, datas, getConditionIndex, i => `前置条件 限制 500 个字符,第 ${i + 1} 条前置条件字符数超过限制，此条前置条件将不予以导入`)
    }

    // 校验步骤描述
    if (getStepsIndex(datas, 'action')?.length) {
        errors = getStepErrorsData(errors, datas, 'action', i => `前置条件 限制 500 个字符,第 ${i.index + 1} 条的 ${i.action.join('、')} 字符数超过限制，此条前置条件将不予以导入`)
    }

    // 校验预期结果
    if (getStepsIndex(datas, 'result')?.length) {
        errors = getStepErrorsData(errors, datas, 'result', i => `前置条件 限制 500 个字符,第 ${i.index + 1} 条的 ${i.result.join('、')} 字符数超过限制，此条前置条件将不予以导入`)
    }

    return errors;
}

const getFiledByValue = (name, maps) => {
    const mapData = [...Object.entries(maps)].find(([key, value]) => value === name)

    return mapData ? mapData[0] : ''
}

const getCurData = (cur, maps) => [...Object.entries(cur)].reduce((curPrev, [key, value]) => {
    curPrev = {
        ...curPrev,
        [maps[key]]: value
    }
    return curPrev
}, {})

const getDataByFieldMaping = (datas, maps) => datas?.reduce((prev, cur) => {
    prev.push(getCurData(cur, maps))

    return prev;
}, []);

const getDataByFieldKey = (datas, maps) => datas.reduce((prev, cur) => {
    prev.push([...Object.entries(cur)].reduce((curPrev, [key, value]) => {
        curPrev = {
            ...curPrev,
            [getFiledByValue(key, maps)]: value,
        }
        return curPrev
    }, {}))

    return prev;
}, []);

// 校验数据
const validateAppData = d => ({
    errors: getErrors(d) || [],
    error_count: getErrors(d)?.length || 0,
    data: getDataByFieldKey(filterData(getDataByLength(clone(d))), fieldMapping) || null,
    stop: false,
})

return validateAppData(getDataByFieldMaping(data, fieldMapping))
