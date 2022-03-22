const {
    data,
    appFieldsData,
    fieldMapping
} = triggerParams;

console.log(1111, data,
    appFieldsData,
    fieldMapping);

// 判断数据是否超过 1000 条
const isMoreThanThousands = d => d.length > 1000;

// 根据数据是否超过 1000 条来截取数据
const getDataByLength = d => isMoreThanThousands(d) ? d.slice(0, 1000) : data;

// 过滤数据中用例标题为空的数据
const filterNullName = d => d.filter(item => item['标题']);

const clone = d => JSON.parse(JSON.stringify(d));

const errorLog1 = '单次导入最多支持1000条，超过1000条，导入前1000条';

const getNullNameData = d => d.filter(item => !item['标题'])

const getErrors = d => {
    const errors = [];
    if (isMoreThanThousands(d)) {
        !errors.includes(errorLog1) && errors.push(errorLog1)
    }

    if (getNullNameData(d).length) {
        errors.push(`“用例标题”为必填项,有${getNullNameData(d).length}条用例标题为空~，不予以导入`)
    }

    return errors;
}

// 校验数据
const validateAppData = d => ({
    errors: getErrors(d),
    error_count: getErrors(d).length,
    data: filterNullName(getDataByLength(clone(d))),
})


validateAppData(data);