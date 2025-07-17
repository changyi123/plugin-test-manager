import { TestFiledKeyMapping, TestLinkType, TestType } from '../../common/constant';
import { buildResponse } from './apiUtil';
import { bulkUpdateItems } from './coreApi';
import { getAllEntity, getDefectItemIds } from './helper';
import { getExecutionCases } from './statistics';

const log = (...args) => {
  console.info('---updateCaseOrExecution', ...args);
};

const buildExecutionCasesUpdates = (list, executionIds) => {
  const updates = [];

  const ids = [];

  list.forEach(item => {
    const itemId = item[TestFiledKeyMapping.linkItems];

    ids.push(itemId);
    updates.push({
      itemIds: [itemId],
      customField: TestFiledKeyMapping.executionCases,
      value: item.count,
    });
  });

  // 没查询出来，即表示为0
  executionIds
    .filter(id => !ids.includes(id))
    .forEach(id => {
      updates.push({
        itemIds: [id],
        customField: TestFiledKeyMapping.executionCases,
        value: 0,
      });

      log('buildExecutionCasesUpdates', JSON.stringify(updates));
      return updates;
    });
  return updates;
};

// 获取引用了测试用例的测试执行
const getCaseRuns = async caseId => {
  const runList = await getAllEntity(
    {
      query: {
        referenceCase: [caseId],
        type: TestType.Run,
      },
    },
    ['id', TestFiledKeyMapping.runDetail, TestFiledKeyMapping.referenceCase],
  );

  return runList || [];
};

const getExecutionDefectUpdates = async executionIds => {
  const runs = await getAllEntity(
    {
      query: {
        type: TestType.Run,
        linkType: TestLinkType.RunLinkExecution,
        linkItems: executionIds,
      },
    },
    ['id', TestFiledKeyMapping.runDetail, TestFiledKeyMapping.linkItems],
  );

  const executionRunMap = runs.reduce((result, runData) => {
    const executionId = runData.linkItems?.[0];
    if (executionId) {
      if (!result[executionId]) {
        result[executionId] = [];
      }
      result[executionId].push(runData);
    }
    return result;
  }, {});

  const updates = [];

  executionIds.forEach(executionId => {
    const runs = executionRunMap[executionId];

    let defectItemIds = [];
    if (runs?.length) {
      defectItemIds = getDefectItemIds(runs);
    }
    defectItemIds.sort();
    updates.push({
      itemIds: [executionId],
      customField: TestFiledKeyMapping.testDefects,
      value: defectItemIds,
    });
  });

  log('getExecutionDefectUpdates  execution defects', JSON.stringify(updates));

  return updates;
};

// 更新测试执行任务的规划用例数
export const updateExecutionCases = async executionIds => {
  log('---updateExecutionCases executionIds', JSON.stringify(executionIds));
  try {
    const data = await getExecutionCases(executionIds);

    log('---updateExecutionCases execution cases', JSON.stringify(data));

    const updates = buildExecutionCasesUpdates(data?.value, executionIds);

    log('---updateExecutionCases updates', JSON.stringify(updates));

    await bulkUpdateItems({
      updates,
      parseContext: { skipCheckItemHandler: true },
    });

    return buildResponse(executionIds);
  } catch (err) {
    log('---updateExecutionCases error');
    console.error(err);
    return buildResponse(err);
  }
};

// 更新测试执行任务的测试缺陷字段
export const updateExecutionDefects = async executionIds => {
  const updates = await getExecutionDefectUpdates(executionIds);
  if (!updates.length) {
    return;
  }
  await bulkUpdateItems({
    updates,
    parseContext: { skipCheckItemHandler: true },
  });
};

// 刷新测试执行任务的规划用例数、测试缺陷字段
export const updateExecutionCasesAndDefects = async executionIds => {
  log('updateExecutionCasesAndDefects', JSON.stringify(executionIds));
  if (!executionIds?.length) {
    return;
  }

  const getExecutionCaseUpdates = async executionIds => {
    const data = await getExecutionCases(executionIds);
    const updates = buildExecutionCasesUpdates(data?.value, executionIds);

    log('updateExecutionCasesAndDefects execution case', JSON.stringify(updates));
    return updates;
  };

  const [executionCaseUpdates, executionDefectUpdates] = await Promise.all([
    getExecutionCaseUpdates(executionIds),
    getExecutionDefectUpdates(executionIds),
  ]);

  await bulkUpdateItems({
    updates: [...executionCaseUpdates, ...executionDefectUpdates],
    parseContext: { skipCheckItemHandler: true },
  });
};

// 更新测试用例的测试缺陷字段
export const updateCaseDefects = async caseIds => {
  if (!caseIds?.length) {
    log('updateCaseDefects  caseIds is null', JSON.stringify(caseIds));
    return;
  }

  const getDefectItemIds = runList => {
    const runDetails = runList?.map(d => d?.runDetail).filter(Boolean) ?? [];

    const stepDefectIds = runDetails
      .filter(d => d?.steps)
      .map(d => d.steps)
      .flat()
      .map(d => d.defectItemIds ?? [])
      .flat();

    const runDefectItemIds = runDetails.map(d => d?.defectItemIds ?? []).flat();
    return [...new Set([...stepDefectIds, ...runDefectItemIds])].filter(Boolean);
  };

  const runList = await getCaseRuns(caseIds);

  log('updateCaseDefects case runs', JSON.stringify(runList?.length));

  const caseRunMap = runList.reduce((result, run) => {
    const caseId = run.referenceCase;
    if (caseId) {
      if (!result[caseId]) {
        result[caseId] = [];
      }
      result[caseId].push(run);
    }
    return result;
  }, {});

  const updates = [];

  caseIds.forEach(caseId => {
    const runs = caseRunMap[caseId] || [];
    const defectItemIds = getDefectItemIds(runs);
    defectItemIds.sort();

    updates.push({
      itemIds: [caseId],
      customField: TestFiledKeyMapping.testDefects,
      value: defectItemIds,
    });
  });

  log('updateCaseDefects updates', JSON.stringify(updates));

  if (!updates.length) {
    return;
  }

  await bulkUpdateItems({
    updates,
    parseContext: { skipCheckItemHandler: true },
  });
};
