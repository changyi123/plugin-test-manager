const ParseBaseQueryOptions = {
  sessionToken: global.sessionToken,
};

const { planStats, globalConfig } = global.body;

const testStatusType = globalConfig.testStatusType;

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

const getCaseData = data => {
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
      Math.floor((getTestCount(caseData.allTestMap, 'PASSED') / (caseData.total ?? 1)) * 100) || 0,
    failedPercent:
      Math.floor((getTestCount(caseData.allTestMap, 'FAILED') / (caseData.total ?? 1)) * 100) || 0,
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
    .flat()
    .filter(Boolean);
  const runDefectItemIds = runDetails
    .map(d => d?.defectItemIds ?? [])
    .flat()
    .filter(Boolean);
  return [...stepDefectIds, ...runDefectItemIds];
};

const getDataByFiled = (datas, filed) =>
  datas?.reduce((prev, cur) => {
    prev = prev.concat(cur?.[filed]);
    return prev;
  }, []);

const getExecution = datas =>
  getDataByFiled(datas, 'allTestExecutions').map(d => ({
    key: d.objectId,
    defectCount: getDefectId(d.testRun).length,
    testRunCount: d.testRun?.length ?? 0,
  }));

const getDefect = (datas, typeList) => {
  const defects = getDataByFiled(datas, 'allDefects');
  const defectMap = new Map();

  typeList?.forEach(d => {
    defectMap.set(d.key, defects.filter(e => e.status.objectId === d.objectId) ?? []);
  });

  return {
    count: defects.length,
    fixed: defectMap.get('Finished').length,
    legacy: defects.length - defectMap.get('Finished')?.length,
  };
};

const getStatusList = async () => {
  const statusQuery = await apis.getParseQuery(false, 'Status');
  statusQuery.equalTo('isDefault', true);

  const list = await statusQuery.find(ParseBaseQueryOptions);

  return list
    .map(d => d.toJSON())
    .map(d => ({
      key: d.type,
      name: d.name,
      type: d.type,
      objectId: d.objectId,
    }));
};

try {
  const defectTypeList = await getStatusList();

  return {
    case: getCaseData(planStats),
    execution: getExecution(planStats),
    defect: getDefect(planStats, defectTypeList),
  };
} catch (error) {
  console.error('report base error', error);
}
