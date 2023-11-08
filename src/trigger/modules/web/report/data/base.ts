/**
 * @file 测试报告模板基础数据
 * */
import { i18n } from '@giteeteam/apps-api';

// 已完成的状态类型
const FinishedStatusType = 'Finished';
// 未开始状态
const TodoStatus = 'TODO';

const { planStats, globalConfig } = global?.body ?? {};

const testStatusType = globalConfig?.statuses ?? [];
const defectStatusList = globalConfig?.defectStatusList ?? [];

const getTestCount = (data, type) => data.get(type)?.length ?? 0;

const getBaseCase = data => {
  const { key, allTestCases } = data;

  const allTestMap = new Map();

  allTestCases.forEach(test => {
    const statusKey = test.caseStatus?.[key] ?? TodoStatus;
    allTestMap.set(statusKey, (allTestMap.get(statusKey) ?? []).concat(test));
  });

  return {
    total: allTestCases.length,
    allTestMap,
    statusList: testStatusType.map(d => ({
      ...d,
      count: getTestCount(allTestMap, d.key),
    })),
  };
};

const getTestCaseData = data => {
  const caseData = data?.reduce((prev, cur) => {
    const caseInfo = getBaseCase(cur);
    const newTestMap = new Map();
    testStatusType.forEach(d => {
      newTestMap.set(
        d.key,
        (prev.allTestMap?.get(d.key) ?? []).concat(caseInfo.allTestMap.get(d.key) ?? []),
      );
    });

    prev = {
      total: (prev?.total ?? 0) + (caseInfo?.total ?? 0),
      allTestMap: newTestMap,
    };

    return prev;
  }, {});

  const total = caseData?.total;

  return {
    total,
    passedPercent:
      Math.round((getTestCount(caseData.allTestMap, 'PASSED') / (total ?? 1)) * 100) || 0,
    failedPercent:
      Math.round((getTestCount(caseData.allTestMap, 'FAILED') / (total ?? 1)) * 100) || 0,
    statusList: testStatusType.map(d => ({
      ...d,
      count: getTestCount(caseData.allTestMap, d.key),
    })),
  };
};

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

const getDataByFiled = (datas, filed) =>
  datas
    ?.reduce((prev, cur) => {
      prev = prev.concat(cur?.[filed]);
      return prev;
    }, [])
    .filter(Boolean);

const getFixCount = (datas, ids) => {
  const defects = getDataByFiled(datas, 'allDefects')?.filter(
    d => ids?.includes(d.objectId) && d.status?.type === FinishedStatusType,
  );

  return defects.length ?? 0;
};

const getTestExecution = datas =>
  getDataByFiled(datas, 'allTestExecutions').map(d => {
    const defectItemIds = getDataByFiled(datas, 'allDefects').map(d => d.objectId);
    const defects = getDefectId(d.testRun).filter(d => defectItemIds.includes(d));
    const fixed = getFixCount(datas, defects);

    return {
      name: d?.name ?? '',
      key: d.objectId,
      defectCount: defects.length,
      testRunCount: d.testRun.filter(d => d.status && d.status !== TodoStatus)?.length ?? 0,
      fixedDefectCount: fixed,
      legacyDefectCount: defects.length - fixed,
    };
  });

const getDefect = datas => {
  const defects = getDataByFiled(datas, 'allDefects');
  const legacyList = defects.filter(d => d.status?.type !== FinishedStatusType);
  const getLength = list => list.length ?? 0;

  return {
    count: getLength(defects),
    fixed: getLength(defects) - getLength(legacyList),
    legacy: getLength(legacyList),
    legacyDefectList: legacyList,
    charts: {
      trendLine: getTrendLine(defects),
      levelPie: getLevelPie(defects),
      statusBar: getStatusBar(defects),
    },
  };
};

const getLineData = datas => {
  const defectListMap = new Map();

  const getDateArray = array =>
    array?.map(d => {
      const date = new Date(d.createdAt);
      const _date = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      defectListMap.set(_date, (defectListMap.get(_date) ?? []).concat(d));
      return _date;
    }) ?? [];

  const array = [...new Set(getDateArray(datas))];

  return {
    xData: array,
    yData: array.map(d => defectListMap.get(d)?.length ?? 0),
  };
};

// TODO 获取折线图配置
const getTrendLine = datas => {
  const { xData, yData } = getLineData(datas);
  // 基础假数据
  return {
    noData: !datas?.length,
    title: {
      text: i18n.t('trigger.web.report.defectChart'),
      left: 'center',
      textStyle: {
        fontSize: 28,
      },
    },
    legend: {
      left: 'right',
      textStyle: {
        fontSize: 20,
      },
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: {
        show: true,
        textStyle: {
          fontSize: 16,
        },
        rotate: 45,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        show: true,
        textStyle: {
          fontSize: 16,
        },
      },
    },
    series: [
      {
        name: i18n.t('trigger.web.report.defectCount'),
        data: yData,
        type: 'line',
        label: {
          show: true,
        },
      },
    ],
  };
};

// TODO 获取饼图配置
const getLevelPie = datas => {
  return {
    noData: !datas?.length,
    title: {
      text: i18n.t('trigger.web.report.defectSeverityTable'),
      left: 'center',
      textStyle: {
        fontSize: 28,
      },
    },
    color: [
      '#ee6666',
      '#5470c6',
      '#91cc75',
      '#fac858',
      '#73c0de',
      '#3ba272',
      '#fc8452',
      '#9a60b4',
      '#ea7ccc',
    ],
    tooltip: {
      trigger: 'item',
    },
    legend: {
      orient: 'center',
      left: 'right',
      top: '35%',
      textStyle: {
        fontSize: 20,
      },
    },
    series: [
      {
        name: i18n.t('trigger.web.report.severity'),
        type: 'pie',
        radius: '50%',
        label: {
          fontSize: 16,
          formatter: '{c}',
        },
        data: [
          { value: 0, name: i18n.t('trigger.web.report.severityValue.0') },
          { value: 0, name: i18n.t('trigger.web.report.severityValue.1') },
          { value: 0, name: i18n.t('trigger.web.report.severityValue.2') },
          { value: 0, name: i18n.t('trigger.web.report.severityValue.3') },
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
    imageOptions: {
      // 调整 height，防止饼图失真
      useCustomSize: true,
      width: 12,
      height: 9.16,
    },
  };
};

const getBarData = datas => {
  const statusMap = new Map();
  const xData = defectStatusList.map(d => {
    const _data = datas.filter(e => e.status.name === d.name);
    statusMap.set(d.name, (statusMap.get(d.name) ?? []).concat(_data));

    return d.name;
  });

  return { xData, yData: xData.map(d => statusMap.get(d)?.length ?? 0) };
};

// TODO 获取柱状图配置
const getStatusBar = datas => {
  const { xData, yData } = getBarData(datas);

  return {
    noData: !datas?.length,
    title: {
      text: i18n.t('trigger.web.report.defectStatusAnalysis'),
      left: 'center',
      textStyle: {
        fontSize: 28,
      },
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: {
        show: true,
        textStyle: {
          fontSize: 16,
        },
        rotate: 45,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        show: true,
        textStyle: {
          fontSize: 16,
        },
      },
    },
    series: [
      {
        data: yData,
        type: 'bar',
        label: {
          show: true,
          position: 'top',
        },
      },
    ],
  };
};

export async function main() {
  try {
    return {
      testCase: getTestCaseData(planStats),
      testExecution: getTestExecution(planStats),
      defect: getDefect(planStats),
    };
  } catch (error) {
    console.error('report base error', error);
    return {
      error: [i18n.t('common.exportReportFail')],
    };
  }
}
