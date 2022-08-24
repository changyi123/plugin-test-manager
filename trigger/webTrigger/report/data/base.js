/**
 * @file 测试报告模板基础数据
 * */

const { planStats, globalConfig } = global.body;

const testStatusType = globalConfig.statuses;

const getTestCount = (data, type) => data.get(type)?.length ?? 0;

const getBaseCase = data => {
  const { key, allTestCases } = data;

  const allTestMap = new Map();

  allTestCases.forEach(test => {
    const statusKey = test.detailStatus?.[key] ?? 'TODO';
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
      total: (prev.total ?? 0) + caseInfo.total,
      allTestMap: newTestMap,
    };

    return prev;
  }, {});

  return {
    total: caseData.total,
    passedPercent:
      Math.round((getTestCount(caseData.allTestMap, 'PASSED') / (caseData.total ?? 1)) * 100) || 0,
    failedPercent:
      Math.round((getTestCount(caseData.allTestMap, 'FAILED') / (caseData.total ?? 1)) * 100) || 0,
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

const getTestExecution = datas =>
  getDataByFiled(datas, 'allTestExecutions').map(d => ({
    name: d?.reference?.name ?? '',
    key: d.objectId,
    defectCount: getDefectId(d.testRun).length,
    testRunCount: d.testRun?.length ?? 0,
  }));

const getDefect = datas => {
  const defects = getDataByFiled(datas, 'allDefects');
  const legacyList = defects.filter(d => d.status.type !== 'Finished');
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

  // return array
  //   .reduce((prev, _, index) => {
  //     const n = index ? 1 : 0;
  //     date.setDate(date.getDate() - n);

  //     prev = prev.concat(`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`);

  //     return prev;
  //   }, [])
  //   .reverse();
};

// TODO 获取折线图配置
const getTrendLine = datas => {
  const { xData, yData } = getLineData(datas);
  // 基础假数据
  return {
    title: {
      text: '缺陷收敛趋势图',
      left: 'center',
    },
    legend: {
      left: 'right',
    },
    xAxis: {
      type: 'category',
      data: xData,
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '缺陷数',
        data: yData,
        type: 'line',
      },
    ],
  };
};

// TODO 获取饼图配置
const getLevelPie = _ => {
  return {
    title: {
      text: '缺陷严重程度统计表',
      left: 'center',
    },
    color: ['#ee6666', '#5470c6', '#91cc75', '#fac858'],
    tooltip: {
      trigger: 'item',
    },
    legend: {
      orient: 'center',
      left: 'right',
      top: '35%',
    },
    series: [
      {
        name: 'Access From',
        type: 'pie',
        radius: '50%',
        data: [
          { value: 0, name: '严重' },
          { value: 0, name: '一般' },
          { value: 0, name: '微小' },
          { value: 0, name: '建议' },
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
      height: 10.8,
    },
  };
};

const getBarData = datas => {
  const statusMap = new Map();
  datas.forEach(d => {
    statusMap.set(d.status.name, (statusMap.get(d.status.name) ?? []).concat(d));
  });

  const xData = [...statusMap.keys()];

  return { xData, yData: xData.map(d => statusMap.get(d)?.length ?? 0) };
};

// TODO 获取柱状图配置
const getStatusBar = datas => {
  const { xData, yData } = getBarData(datas);

  return {
    title: {
      text: '缺陷状态分析',
      left: 'center',
    },
    xAxis: {
      type: 'category',
      data: xData,
    },
    yAxis: {
      type: 'value',
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

try {
  return {
    testCase: getTestCaseData(planStats),
    testExecution: getTestExecution(planStats),
    defect: getDefect(planStats),
  };
} catch (error) {
  console.error('report base error', error);
}
