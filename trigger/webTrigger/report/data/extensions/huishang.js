/**
 * @file huishang 测试报告模板数据
 * */

const { planStats } = global.body;

// 日期格式化
function formatDate(timeStamp, formatstr) {
  if (!timeStamp) {
    return '暂无';
  }
  const date = new Date(timeStamp);
  var arrweek = ['日', '一', '二', '三', '四', '五', '六'];
  var str = formatstr
    .replace(/yyyy|YYYY/, date.getFullYear())
    .replace(/yy|YY/, $addZero(date.getFullYear() % 100, 2))
    .replace(/mm|MM/, $addZero(date.getMonth() + 1, 2))
    .replace(/m|M/g, date.getMonth() + 1)
    .replace(/dd|DD/, $addZero(date.getDate(), 2))
    .replace(/d|D/g, date.getDate())
    .replace(/hh|HH/, $addZero(date.getHours(), 2))
    .replace(/h|H/g, date.getHours())
    .replace(/ii|II/, $addZero(date.getMinutes(), 2))
    .replace(/i|I/g, date.getMinutes())
    .replace(/ss|SS/, $addZero(date.getSeconds(), 2))
    .replace(/s|S/g, date.getSeconds())
    .replace(/w|g/, $addZero(date.getDay(), 2))
    .replace(/W/g, arrweek[date.getDay()]);
  return str;
}
function $addZero(v, size) {
  for (var i = 0, len = size - (v + '').length; i < len; i++) {
    v = '0' + v;
  }
  return v + '';
}

const ParseBaseQueryOptions = {
  sessionToken: global.sessionToken,
};
const customFieldKey = 'Dropdown';

const executionInit = executions => {
  const executionResult = executions.map(ele => {
    return {
      key: ele.objectId,
      executionDateRange: `${formatDate(
        ele?.reference?.values?.finishAt,
        'YYYY.MM.DD',
      )} - ${formatDate(ele?.reference?.values?.inProgressAt, 'YYYY.MM.DD')}`,
      fixedDefectCount: 0,
      legacyDefectCount: 0,
    };
  });
  return executionResult;
};
// 饼图数据初始化
const levelPieInit = defects => {
  const fieldOption = field?.data?.customData?.map(ele => {
    return {
      ...ele,
      count: 0,
    };
  });
  defects.forEach(defect => {
    fieldOption.forEach(option => {
      if (defect?.values?.[customFieldKey]?.includes(option.value)) {
        option.count++;
      }
    });
  });
  return fieldOption.map(ele => {
    return {
      name: ele.label,
      value: ele.count,
    };
  });
};
// 查询缺陷字段详情，获取option
const appQuery = await apis.getParseQuery(false, 'CustomField');
const field = await appQuery
  .equalTo('key', customFieldKey)
  .first(ParseBaseQueryOptions)
  .then(item => item.toJSON());

const cumulatedExecutions = planStats.reduce((acc, plan) => {
  return acc.concat(plan.allTestExecutions).filter(Boolean);
}, []);

const cumulatedDefects = planStats.reduce((acc, plan) => {
  return acc.concat(plan.allDefects).filter(Boolean);
}, []);

const result = {
  testExecution: executionInit(cumulatedExecutions),
  defect: {
    charts: {
      levelPie: {
        title: {
          text: '缺陷严重程度统计表',
          left: 'center',
        },
        legend: {
          orient: 'vertical',
          left: 'left',
        },
        series: [
          {
            name: 'Access From',
            type: 'pie',
            radius: '50%',
            label: {
              normal: {
                position: 'inner',
                formatter: '{d}',
              },
            },
            data: levelPieInit(cumulatedDefects),
          },
        ],
      },
    },
  },
};

return result;
