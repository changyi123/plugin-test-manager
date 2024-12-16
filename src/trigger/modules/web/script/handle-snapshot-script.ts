import { getParseQuery, requestCoreApi } from '@giteeteam/apps-team-api';
import parallelLimit from 'async/parallelLimit';

import {
  BuiltinFieldNameMapping,
  TestConfigClassName,
  TestFiledKeyMapping,
  TestType,
} from '../../../../common/constant';
import { buildResponse, getReqInfoFromVMRuntime } from '../../../lib/apiUtil';
import { batchUpdateItemsValues } from '../../../lib/batchRequest';
import { operateSnapshots } from '../../../lib/coreApi';

const RUN_BASE_IQL = `${BuiltinFieldNameMapping.type} = ${TestType.Run} and ${BuiltinFieldNameMapping.referenceCaseSnapshot} is null`;

const judgeCaseSnapshot = testConfig => {
  return global.env.ENABLED_CASE_SNAPSHOT
    ? testConfig?.enableCaseSnapshot
    : global.env.DEFAULT_ENABLED_CASE_SNAPSHOT;
};

const search = async (iql: string, fields = [], size = 100) => {
  return await requestCoreApi('POST', '/parse/api/search', {
    size,
    iql,
    fields,
    displayContext: 'test_manager',
  })
    .then(
      (data: any) =>
        data?.payload ?? {
          count: 0,
          items: [],
        },
    )
    .catch(e => {
      console.info('search fail: ', e.message);
      return {
        count: 0,
        items: [],
      };
    });
};

const APP_KEY = global.appKey ?? 'test_manager';

export const handleSnapshotScript = async () => {
  try {
    const {
      body: { querySize = 1000, parallelSize = 50 },
    } = getReqInfoFromVMRuntime<{
      querySize: number;
      batchSize: number;
      parallelSize: number;
    }>();
    // 判断环境变量是否支持全局快照
    const enableCaseSnapshot =
      !global.env.ENABLED_CASE_SNAPSHOT && global.env.DEFAULT_ENABLED_CASE_SNAPSHOT;
    const ParseBaseQueryOptions = {
      useMasterKey: true,
    };

    let installedWorkspaceKeys = [];
    // 查询需要处理的测试执行任务的iql
    let runIql = ``;
    // 全局快照
    if (enableCaseSnapshot) {
      runIql = RUN_BASE_IQL;
    } else {
      // 获取所有空间
      const appWorkspace = await getParseQuery(false, 'AppsWorkspace')
        .equalTo('appKey', APP_KEY)
        .equalTo('environmentKey', 'production')
        .include('workspaces')
        .first(ParseBaseQueryOptions)
        .then(data => data.toJSON());

      const isGlobalPlugin = !!appWorkspace.global;

      // 获取需要订阅的空间key
      if (isGlobalPlugin) {
        // 获取租户下所有空间
        installedWorkspaceKeys = await getParseQuery(false, 'Workspace')
          .select(['objectId', 'key'])
          .findAll(ParseBaseQueryOptions)
          .then(data => data.map(item => item.get('key')));
      } else {
        installedWorkspaceKeys = appWorkspace?.workspaces
          ?.map(workspace => workspace?.key)
          .filter(Boolean);
      }

      // 获取需要处理的空间配置
      const configs = await getParseQuery(false, TestConfigClassName)
        .containedIn('workspaceKey', installedWorkspaceKeys)
        .select(['enableCaseSnapshot', 'workspaceKey'])
        .findAll(ParseBaseQueryOptions);
      const configMap = configs.reduce(
        (m, i) => ({ ...m, [i.get('workspaceKey')]: judgeCaseSnapshot(i) }),
        {},
      );

      installedWorkspaceKeys = installedWorkspaceKeys.filter(
        workspaceKey => !!configMap[workspaceKey],
      );
      if (!installedWorkspaceKeys.length) return buildResponse('无需要处理的空间');

      runIql = `${RUN_BASE_IQL} and workspaceKey in ${JSON.stringify(installedWorkspaceKeys)}`;
    }

    console.info('handleSnapshotScript: 测试执行的查询iql', runIql);

    const getIdMap = async (ids, fieldKey) => {
      return await search(`id in ${JSON.stringify(ids)}`, ['id', fieldKey], querySize).then(d =>
        d.items.reduce((m, i) => ({ ...m, [i.id]: i[fieldKey] }), {}),
      );
    };

    let done = false;
    while (!done) {
      const { items, count } = await search(
        runIql,
        ['id', TestFiledKeyMapping.referenceCase, TestFiledKeyMapping.linkItems],
        querySize,
      );

      console.info('handleSnapshotScript: 待处理测试执行长度', count);

      const run2case = {};
      const executionsMap = items.reduce((m, i) => {
        const executionId = i.values?.[TestFiledKeyMapping.linkItems]?.[0];
        if (executionId) {
          if (!m[executionId]) {
            m[executionId] = [];
          }
          m[executionId].push(i);
        }
        if (i.values?.[TestFiledKeyMapping.referenceCase]) {
          run2case[i.id] = i.values[TestFiledKeyMapping.referenceCase];
        }
        return m;
      }, {});
      const caseIds = Object.values(run2case);
      const executionIds = Object.keys(executionsMap);
      const [caseId2Key, executionId2Name] = await Promise.all([
        getIdMap(caseIds, 'key'),
        getIdMap(executionIds, 'name'),
      ]);

      console.info('handleSnapshotScript: 映射对象', caseId2Key, executionId2Name);

      await parallelLimit(
        executionIds.map(executionId => {
          const runList = executionsMap[executionId];
          const snapshotName = executionId2Name[executionId];
          console.info(
            `handleSnapshotScript: 开始处理快照数据--${executionId2Name[executionId]}, 长度：`,
            executionsMap[executionId].length,
          );
          const caseKeys = runList?.map(run => caseId2Key[run2case[run.id]])?.filter(Boolean);
          return async cb => {
            try {
              if (!caseKeys?.length) return;
              console.info(
                `handleSnapshotScript: 开始打快照--${snapshotName}, 长度：`,
                caseKeys.length,
              );
              const snapshots = await operateSnapshots({
                add: {
                  keys: caseKeys,
                },
                sourceId: executionId,
                sourceType: APP_KEY,
                baseLineItemVersion: {
                  name: snapshotName,
                },
              });
              const caseId2Snapshot = snapshots?.baselineItems?.reduce(
                (m, v) => ({ ...m, [v.itemId]: v.objectId }),
                {},
              );
              console.info('handleSnapshotScript: 开始更新执行字段', snapshotName, runList.length);

              const updates = runList.map(run => ({
                objectId: run.id,
                referenceCaseSnapshot: caseId2Snapshot[run2case[run.id]],
              }));

              const res = await batchUpdateItemsValues(updates);
              console.info('handleSnapshotScript: 数据处理完成', snapshotName, res.length);
            } catch (e) {
              console.error('handleSnapshotScript: 数据错误', e);
            } finally {
              cb?.();
            }
          };
        }),
        parallelSize,
      );

      done = count === items.length || !count;
    }
    buildResponse('处理成功');
  } catch (e) {
    buildResponse(e);
  }
};
