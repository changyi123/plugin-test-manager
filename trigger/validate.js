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

const clone = d => JSON.parse(JSON.stringify(d));

const errorLog1 = '单次导入最多支持1000条，超过1000条，导入前1000条';

const getNullNameData = d => d?.filter(item => !item.name);

const getErrors = d => {
    const errors = [];
    if (isMoreThanThousands(d)) {
        !errors.includes(errorLog1) && errors.push(errorLog1)
    }

    if (getNullNameData(d)?.length) {
        errors.push(`“用例标题”为必填项,有${getNullNameData(d).length}条用例标题为空~，不予以导入`)
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
            [getFiledByValue(key, maps)]: value
        }
        return curPrev
    }, {}))

    return prev;
}, []);

// 校验数据
const validateAppData = d => ({
    errors: getErrors(d) || [],
    error_count: getErrors(d)?.length || 0,
    data: getDataByFieldKey(filterNullName(getDataByLength(clone(d))), fieldMapping) || null,
    stop: false,
})

return validateAppData(getDataByFieldMaping(data, fieldMapping))
