import { getParseQuery, requestCoreApi } from '@giteeteam/apps-team-api';

import { InfinityLimit, RepositoryClassName, TestFiledKeyMapping } from '../../../common/constant';
import { buildResponse, getReqInfoFromVMRuntime } from '../../lib/apiUtil';

const UngroupedRepository = '未分组';

const search = async (iql: string, fields = []) => {
  return await requestCoreApi('POST', '/parse/api/search', {
    size: 9999,
    iql,
    fields,
    isShowDetails: true,
    displayContext: 'test_manager',
  })
    .then((data: any) => data?.payload.items ?? [])
    .catch(e => {
      console.info('search fail: ', e.message);
      return [];
    });
};

const getRepoFullPathMap = repositoryData => {
  const pathMap = {};
  // 创建一个哈希表，用于存储每个path对象的子对象
  repositoryData.forEach(repo => {
    pathMap[repo.objectId] = pathMap[repo.objectId] || [repo.name];
  });

  // 遍历repositoryData，将每个父对象的path对象添加到当前pathMap
  repositoryData.forEach(repo => {
    if (repo.parent) {
      if (pathMap[repo.parent.objectId]) {
        pathMap[repo.objectId].unshift(pathMap[repo.parent.objectId]);
      }
    }
  });

  // 将pathMap的每一项转为路径
  repositoryData.forEach(repo => {
    if (pathMap[repo.objectId]) {
      pathMap[repo.objectId] = pathMap[repo.objectId].flat(Infinity).join('/');
    }
  });

  return pathMap;
};

const getList = map => {
  return Object.values(map).map((row: any) => {
    row.noPass_count = row.cancel_count + row.executing_count + row.block_count + row.failed_count;
    row.passPercent = `${((row.passed_count * 100) / (row.total || 1)).toFixed(2)}%`;
    return row;
  });
};

const rowInitValue = {
  total: 0,
  cancel_count: 0,
  todo_count: 0,
  passed_count: 0,
  failed_count: 0,
  block_count: 0,
  executing_count: 0,
  noPass_count: 0,
  passPercent: '0%',
};

const getRepositoryData = async workspaceKey => {
  if (!workspaceKey) return [];

  return await getParseQuery(false, RepositoryClassName)
    .equalTo('workspaceKey', workspaceKey)
    .select(['name', 'objectId', 'parent'])
    .findAll({
      useMasterKey: true,
      batchSize: InfinityLimit,
    } as unknown)
    .then(repositories => repositories.map(repository => repository.toJSON()))
    .then(getRepoFullPathMap);
};

/** 中关村测试报告信息 */
export const dssTestReportInfo = async () => {
  const { body } = getReqInfoFromVMRuntime<{
    template: any;
    report: any;
  }>();
  const testPlan = body.report?.reportOverviewData?.testPlan;
  if (!testPlan?.length) return buildResponse({ _测试执行任务列表: [], _系统模块统计列表: [] });

  try {
    let res = {} as any;
    const setRes = data => {
      res = { ...res, ...data };
      return res;
    };
    const testExecutions = await search(
      `'test_manager_linkItems' in ${JSON.stringify(
        testPlan,
      )} and 'test_manager_type' = 'TestExecution'`,
    );

    const testExecutionsMap = testExecutions.reduce(
      (m, i) => ({
        ...m,
        [i.id]: {
          ...i,
          ...rowInitValue,
        },
      }),
      {},
    );

    setRes({ _测试执行任务列表: Object.values(testExecutionsMap) });
    setRes({ _系统模块统计列表: [] });

    if (testExecutions.length) {
      const testRuns = await search(
        `'test_manager_linkItems' in ${JSON.stringify(
          testExecutions.map(i => i.id),
        )} and 'test_manager_type' = 'TestRun'`,
        [
          'id',
          TestFiledKeyMapping.linkItems,
          TestFiledKeyMapping.status,
          TestFiledKeyMapping.referenceCase,
          TestFiledKeyMapping.referenceCaseSnapshot,
        ],
      );

      if (testRuns.length) {
        const workspaceKey = testExecutions[0].workspace.key;
        const fullRepoPathMap = await getRepositoryData(workspaceKey);
        const repoTableMap = {};

        const caseIds = testRuns.flatMap(run =>
          [
            run.values[TestFiledKeyMapping.referenceCaseSnapshot],
            run.values[TestFiledKeyMapping.referenceCase],
          ].filter(Boolean),
        );
        const executionIds = testExecutions.map(execution => execution.id);
        const cases = await search(
          `id in ${JSON.stringify(caseIds)} and ('baseLineSources' in ${JSON.stringify(
            executionIds,
          )} or 'baseLineSources' is null)`,
          ['id', TestFiledKeyMapping.repository],
        );
        const caseRepoMap = cases.reduce(
          (m, i) => ({ ...m, [i.id]: i.values?.[TestFiledKeyMapping.repository] }),
          {},
        );

        console.info('fullRepoPathMap', fullRepoPathMap, caseRepoMap);

        testRuns.forEach(run => {
          const key = `${(run.values[TestFiledKeyMapping.status] ?? '').toLowerCase()}_count`;
          if (testExecutionsMap[run.values[TestFiledKeyMapping.linkItems]?.[0]]) {
            testExecutionsMap[run.values[TestFiledKeyMapping.linkItems][0]][key] += 1;
            testExecutionsMap[run.values[TestFiledKeyMapping.linkItems][0]].total += 1;
          }
          const fullPath =
            fullRepoPathMap[
              caseRepoMap[
                run.values[TestFiledKeyMapping.referenceCaseSnapshot] ||
                  run.values[TestFiledKeyMapping.referenceCase]
              ]
            ] ?? UngroupedRepository;
          if (!repoTableMap[fullPath]) {
            repoTableMap[fullPath] = {
              fullPath,
              ...rowInitValue,
            };
          }
          repoTableMap[fullPath][key] += 1;
          repoTableMap[fullPath].total += 1;
        });

        setRes({ _测试执行任务列表: getList(testExecutionsMap) });
        setRes({ _系统模块统计列表: getList(repoTableMap) });
      }
    }

    return buildResponse(res);
  } catch (err) {
    console.info('err--------------------------------', err);
    return buildResponse({
      err,
    });
  }
};
