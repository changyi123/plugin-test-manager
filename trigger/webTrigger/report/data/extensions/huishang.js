/**
 * @file huishang 测试报告模板数据
 * */

const { planStats } = global?.body ?? {};

// TODO: 替换下列常量
// 测试执行任务
const InProgressAtFieldKey = 'inProgressAt';
// 严重程度自定义字段 Key
const SeverityLevelFieldKey = 'severity';
// 已完成的状态类型
const FinishedStatusType = 'Finished';

// 日期格式化
function formatDate(timeStamp, formatStr) {
  function $addZero(v, size) {
    for (var i = 0, len = size - (v + '').length; i < len; i++) {
      v = '0' + v;
    }
    return v + '';
  }
  if (!timeStamp) {
    return '暂无';
  }
  const date = new Date(timeStamp);
  // TODO 时间解析不对
  const week = ['日', '一', '二', '三', '四', '五', '六'];
  const str = formatStr
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
    .replace(/W/g, week[date.getDay()]);
  return str;
}

const ParseBaseQueryOptions = {
  sessionToken: global.sessionToken,
};

const cumulatedExecutions = planStats.reduce((acc, plan) => {
  return acc.concat(plan.allTestExecutions).filter(Boolean);
}, []);

const cumulatedDefects = planStats.reduce((acc, plan) => {
  return acc.concat(plan.allDefects).filter(Boolean);
}, []);

const getDefectId = datas => {
  const runDetails = datas?.map(d => d?.runDetail).filter(Boolean) ?? [];

  const stepDefectIds = runDetails
    .filter(d => d?.steps)
    .map(d => d.steps)
    .flat()
    .map(d => d.defectItemIds ?? [])
    .flat();

  const runDefectItemIds = runDetails.map(d => d?.defectItemIds ?? []).flat();
  return [...new Set([...stepDefectIds, ...runDefectItemIds])].filter(Boolean);
};

const getFixCount = (datas, ids) => {
  const defects = datas?.filter(d => ids?.includes(d.objectId) && d.status.type === 'Finished');

  return defects.length ?? 0;
};

const executionInit = executions => {
  const executionResult = executions.map(ele => {
    const defects = getDefectId(ele.testRun);
    const fixedCount = getFixCount(cumulatedDefects, defects);

    return {
      key: ele.objectId,
      executionDateRange: `${formatDate(
        ele?.reference?.values?.finishAt,
        'YYYY.MM.DD',
      )} - ${formatDate(ele?.reference?.values?.[InProgressAtFieldKey], 'YYYY.MM.DD')}`,
      fixedDefectCount: fixedCount,
      legacyDefectCount: defects.length - fixedCount,
    };
  });
  return executionResult;
};

// 饼图数据初始化
const generateLevelPieOption = defects => {
  const fieldOption = severityLevelField?.data?.customData?.map(ele => {
    return {
      ...ele,
      count: 0,
    };
  });

  defects.forEach(defect => {
    fieldOption.forEach(option => {
      if (defect?.values?.[SeverityLevelFieldKey]?.includes(option.value)) {
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
const severityLevelField = await appQuery
  .equalTo('key', SeverityLevelFieldKey)
  .first({ json: true, ...ParseBaseQueryOptions });

// 严重等级的 Mapping
const SeverityLevelLabelMapping = severityLevelField?.data?.customData?.reduce(
  (res, data) => ({
    ...res,
    [data.value]: data.label,
  }),
  {},
);

// 遗留的数据类型
const legacyDefectList = cumulatedDefects
  .filter(defect => defect.status.type !== FinishedStatusType)
  .map(defect => ({
    key: defect.key,
    severityLevel: SeverityLevelLabelMapping[defect.values[SeverityLevelFieldKey]],
  }));

const result = {
  testExecution: executionInit(cumulatedExecutions),
  defect: {
    charts: {
      levelPie: cumulatedDefects?.length
        ? {
            title: {
              text: '缺陷严重程度统计表',
              left: 'center',
              textStyle: {
                fontSize: 24,
              },
            },
            legend: {
              orient: 'center',
              left: 'right',
              top: '35%',
              textStyle: {
                fontSize: 18,
              },
            },
            series: [
              {
                name: 'Access From',
                type: 'pie',
                radius: '50%',
                label: {
                  normal: {
                    position: 'inner',
                    formatter: '{c}',
                  },
                },
                data: generateLevelPieOption(cumulatedDefects),
              },
            ],
          }
        : {
            noData: true,
          },
    },
    // 遗留缺陷 mixin 数据
    legacyDefectList,
  },
};

return result;
