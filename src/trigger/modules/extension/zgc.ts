import { getParseQuery, requestCoreApi } from '@giteeteam/apps-team-api';

import { TestFiledKeyMapping, TestType } from '../../../common/constant';
import { buildResponse, getReqInfoFromVMRuntime } from '../../lib/apiUtil';

const zgcConfig = global.env?.ZGC_CONFIG ?? {};

const search = async (iql: string, fields = []) => {
  return await requestCoreApi('POST', '/parse/api/search', {
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

const uniq = list => (Array.isArray(list) ? [...new Set(list ?? [])] : list);

const createTable = (columns, data = [], key, showIndex = false) => {
  const rowDataIndex = [];
  if (showIndex) columns.unshift({ title: '序号', dataIndex: '$index' });
  const header = {
    id: 'wxu7p',
    type: 'tr',
    children: columns.map(({ title, dataIndex }, index) => {
      rowDataIndex[index] = dataIndex;
      return {
        id: `wp21a${index}`,
        type: 'td',
        border: true,
        backgroundColor: '#F1F1F1',
        children: [
          {
            id: `bk19z${index}`,
            type: 'p',
            align: 'center',
            children: [
              {
                text: title,
                bold: true,
              },
            ],
          },
        ],
      };
    }),
  };
  const body = data.map((row, index) => {
    return {
      id: `j02bj${index}`,
      type: 'tr',
      children: rowDataIndex.map((dataIndex, i) => ({
        id: `o37dx$${index}${i}`,
        border: '1px solid #FFF',
        type: 'td',
        children: [
          {
            id: `yxv78${index}${i}`,
            type: 'p',
            children: [
              {
                text: dataIndex === '$index' ? `${index + 1}` : `${row[dataIndex] ?? ''}`,
              },
            ],
          },
        ],
      })),
    };
  });
  return [
    {
      id: key ?? 'taij5',
      type: 'table',
      border: true,
      children: [header, ...body],
    },
  ];
};

/** 中关村测试报告信息 */
export const zgcTestReportInfo = async () => {
  const { body } = getReqInfoFromVMRuntime<{
    workspace: any;
    dsIqlConfig: any;
    reportOverviewData: Record<string, any>;
    report: any;
  }>();
  const executionRefTestEntityIds = body?.dsIqlConfig?.executionRefTestEntityIds ?? {};
  const executionIds = executionRefTestEntityIds?.self ?? [];
  const report = body?.report ?? {};

  try {
    let res = {} as any;
    let runList = [];
    const setRes = data => {
      res = { ...res, ...data };
      return res;
    };
    setRes({ versionStoryCount: 0 });
    setRes({ storyCount: 0 });
    setRes({ testCoverage: 0 });
    if (executionIds.length) {
      setRes({ planCount: executionRefTestEntityIds.planIds?.length });
      setRes({ testCount: executionRefTestEntityIds.self?.length });
      setRes({ runCount: executionRefTestEntityIds[TestType.Run]?.length });
      setRes({ caseCount: executionRefTestEntityIds[TestType.Case]?.length });
      setRes({ bugCount: executionRefTestEntityIds.relative?.length });

      const groupMap = {} as Record<string, any[]>;
      const envIds = [];
      const getGroupMap = testList => {
        testList.forEach(test => {
          const testTimes = test?.values?.[zgcConfig?.测试阶段 ?? 'ceshijieduan'] ?? [];
          testTimes.forEach(test_time => {
            if (!groupMap[test_time]) {
              groupMap[test_time] = [];
            }
            groupMap[test_time].push(test);
          });
        });
      };
      const requestTestList = search(
        `id in ${JSON.stringify(executionRefTestEntityIds.self)}`,
      ).then(async testList => {
        console.info(`zgc requestTestList`, JSON.stringify(testList));
        setRes({ testList });
        getGroupMap(testList);
        envIds.push(...uniq(testList.flatMap(test => test.values[zgcConfig.测试环境 ?? 'bchj'])));
      });

      const requestRunList = search(
        `id in ${JSON.stringify(executionRefTestEntityIds[TestType.Run])}`,
        [TestFiledKeyMapping.status, TestFiledKeyMapping.linkItems, TestFiledKeyMapping.executor],
      ).then(list => {
        runList = list;
      });

      const setToolList = async reportRes => {
        let tools = [];
        if (reportRes.values.test_tools?.length) {
          tools = await search(`id in ${JSON.stringify(reportRes.values.test_tools)}`, [
            'name',
            'tool_version',
            'tool_scope',
          ]).then(data => data.map(tool => ({ ...tool, ...tool.values })));
        }
        const columns = [
          { title: '工具名称', dataIndex: 'name' },
          { title: '型号/版本', dataIndex: 'tool_version' },
          { title: '用途', dataIndex: 'tool_scope' },
        ];
        setRes({ ['测试工具']: createTable(columns, tools, 'tools') });
      };
      let allStroyList = [];
      const setVersion = async reportRes => {
        const versionId = reportRes?.values?.version?.[0]?.objectId;
        const versionName = reportRes?.values?.version?.[0]?.name;
        const getVersion = async () => {
          if (versionId) {
            await getParseQuery(false, 'Version')
              .equalTo('objectId', versionId)
              .include('createdBy')
              .first({ useMasterKey: true })
              .then(version => version && setRes({ version: version.toJSON() }));
          }
        };
        const getStory = async () => {
          if (versionName) {
            await search(
              `'版本' in ['${versionName}'] and '类型' in ['${
                zgcConfig.系统子需求 ?? '系统子需求'
              }']`,
              ['id', 'key'],
            ).then(list => {
              allStroyList = [...list];
              const versionStoryCount = list.length || 0;
              setRes({ versionStoryCount });
            });
          }
        };
        await Promise.all([getStory(), getVersion()]);
      };
      const requestReportList = search(`id in [${JSON.stringify(report.objectId)}]`).then(
        async reports => {
          console.info(`zgc requestReportList`, JSON.stringify(reports));
          const reportRes = reports[0];
          setRes({ report: reportRes });
          await Promise.all([setToolList(reportRes), setVersion(reportRes)]);
        },
      );

      const planToStoryMap = {};
      const storyList = [];
      const requestTestPlanList = search(
        `id in ${JSON.stringify(executionRefTestEntityIds.planIds)}`,
      ).then(async planList => {
        console.info(`zgc requestTestList`, JSON.stringify(planList));
        setRes({ planList });
        planList.forEach(plan => {
          const planId = plan.id;
          const ancestorKey = plan.ancestor?.key;
          if (!ancestorKey) return;
          if (!planToStoryMap[planId]) {
            planToStoryMap[planId] = ancestorKey;
          }

          if (!storyList.includes(ancestorKey)) {
            storyList.push(ancestorKey);
          }
        });

        setRes({ storyCount: storyList.length || 0 });
        setRes({ storyList });
      });
      await Promise.all([requestTestList, requestTestPlanList, requestReportList, requestRunList]);
      const unTestedStoryList = allStroyList
        .filter(story => !storyList.includes(story.key))
        .map(story => '#' + story.key.split('-')[1] + '-' + story.name)
      setRes({ unTestedStoryList });

      console.info('zgc', JSON.stringify({ res, groupMap }));
      const testCoverage =
        res.storyCount && res.versionStoryCount
          ? (res.storyCount * 100) / res.versionStoryCount
          : 0;
      setRes({ testCoverage: testCoverage.toFixed(2) });

      const getEnvList = async () => {
        const envList = [];
        Object.entries(groupMap).map(([test_time, testList]) => {
          const existed = envList.find(env => env.test_time === test_time);
          if (!existed) {
            envList.push({
              test_time,
              workspaceName: testList[0].workspace.name,
              test_env: '',
              env_desc: '',
            });
          }
        });

        const columns = [
          { title: '系统名称', dataIndex: 'workspaceName' },
          { title: '测试阶段', dataIndex: 'test_time' },
          { title: '测试环境', dataIndex: 'test_env' },
          { title: '需求环境说明', dataIndex: 'env_desc' },
        ];
        setRes({ ['测试环境']: createTable(columns, envList, 'env') });
      };
      await getEnvList();

      const getVersion = () => {
        const versionList = Object.entries(groupMap).map(([test_time, testList]) => ({
          test_time,
          workspaceName: testList[0].workspace.name,
          test_version: uniq(testList.map(test => test.values.test_version).filter(Boolean)).join(
            ',',
          ),
          test_version_url: uniq(
            testList.map(test => test.values.test_version_url).filter(Boolean),
          ).join(','),
        }));
        const columns = [
          { title: '系统名称', dataIndex: 'workspaceName' },
          { title: '测试阶段', dataIndex: 'test_time' },
          { title: '被测版本号', dataIndex: 'test_version' },
          { title: '被测版本下载地址', dataIndex: 'test_version_url' },
        ];
        setRes({ ['被测系统版本']: createTable(columns, versionList, 'version') });
      };
      getVersion();

      const getRunStatics = () => {
        const map = {};
        const tableMap = {};
        const testerMap = {};
        res.testList.forEach(test => {
          map[test.objectId] = test.values?.[zgcConfig?.测试阶段 ?? 'ceshijieduan']?.[0];
        });
        runList.forEach(run => {
          const test_time = map[run.values[TestFiledKeyMapping.linkItems][0]];
          const executor = run.values[TestFiledKeyMapping?.executor]?.[0]?.nickname;
          if (executor) {
            testerMap[executor] = true;
          }

          if (!tableMap[test_time]) {
            tableMap[test_time] = {
              test_time: test_time,
              total: 0,
              cancel_count: 0,
              todo_count: 0,
              passed_count: 0,
              failed_count: 0,
              block_count: 0,
              executing_count: 0,
              passPercent: 0,
            };
          }
          const key = `${(run.values[TestFiledKeyMapping.status] ?? '').toLowerCase()}_count`;
          tableMap[test_time][key] += 1;
          tableMap[test_time].total += 1;
        });
        const list = Object.values(tableMap).map((row: any) => {
          row.passPercent = `${((row.passed_count * 100) / (row.total || 1)).toFixed(2)}%`;
          return row;
        });
        const executors = Object.keys(testerMap).join('、');
        console.info('getRunStatics', tableMap, executors);

        const columns = [
          { title: '测试阶段', dataIndex: 'test_time' },
          { title: '无效用例数', dataIndex: 'cancel_count' },
          { title: '未执行用例数', dataIndex: 'todo_count' },
          { title: '通过用例数', dataIndex: 'passed_count' },
          { title: '失败用例数', dataIndex: 'failed_count' },
          { title: '执行中用例数', dataIndex: 'executing_count' },
          { title: '阻塞用例数', dataIndex: 'block_count' },
          { title: '通过率', dataIndex: 'passPercent' },
        ];
        setRes({ ['用例执行统计']: createTable(columns, list, 'run') });
        setRes({ executors });
      };
      getRunStatics();
    }

    return buildResponse(res);
  } catch (err) {
    console.info('err--------------------------------', err);
    return buildResponse({
      err,
    });
  }
};
