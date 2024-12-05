import { getParseQuery, requestCoreApi } from '@giteeteam/apps-team-api';
import uniqBy from 'lodash/uniqBy';

import { TestFiledKeyMapping, TestType } from '../../../common/constant';
import { buildResponse, fetchBugFromItemLinks, getReqInfoFromVMRuntime } from '../../lib/apiUtil';

const zgcConfig = global.env?.ZGC_CONFIG ?? {};

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
    defectsMapping: any;
  }>();
  const executionRefTestEntityIds = body?.dsIqlConfig?.executionRefTestEntityIds ?? {};
  const executionIds = executionRefTestEntityIds?.self ?? [];
  const report = body?.report ?? {};
  const bugItemType = body.defectsMapping || [];

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

      const groupMap = {} as Record<string, any[]>;
      const storyMap = {} as Record<string, any>;
      const testToPlanMap = {} as Record<string, any>;
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

      let allStroyList = [];
      const setVersion = async version => {
        const versionId = version?.[0]?.objectId;
        const versionName = version?.[0]?.name;
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
              ['id', 'key', 'name'],
            ).then(list => {
              allStroyList = [...list];
              const versionStoryCount = list.length || 0;
              setRes({ versionStoryCount });
              list.reduce((prev, cur) => {
                prev[cur.id] = cur;
                return prev;
              }, storyMap);
            });
          }
        };
        const getTccck = async () => {
          const tccck = version?.expandFieldValues?.[zgcConfig?.投资窗口 ?? 'tccck'];
          if (tccck) {
            await search(`id in ${JSON.stringify(tccck)}`, ['name']).then(tccck => {
              setRes({ tccck });
            });
          }
        };
        await Promise.all([getStory(), getVersion(), getTccck()]);
      };

      const requestTestList = search(
        `id in ${JSON.stringify(executionRefTestEntityIds.self)}`,
      ).then(async testList => {
        console.info(`zgc requestTestList`, JSON.stringify(testList));

        const minKsrqList = testList
          .map(test => test.values[zgcConfig?.开始日期 ?? 'ksrq'])
          .filter(Boolean);
        if (minKsrqList || minKsrqList.length > 0) {
          const minKsrq = minKsrqList.reduce((a, b) => Math.min(a, b));
          setRes({ minKsrq });
        }
        const maxJsrqList = testList
          .map(test => test.values[zgcConfig?.结束日期 ?? 'jsrq'])
          .filter(Boolean);
        if (maxJsrqList || maxJsrqList.length > 0) {
          const maxJsrq = maxJsrqList.reduce((a, b) => Math.max(a, b));
          setRes({ maxJsrq });
        }
        getGroupMap(testList);
        await setVersion(testList?.find(i => !!i.values?.version?.length)?.values.version);
        testList.reduce((prev, cur) => {
          prev[cur.id] = cur?.values?.[TestFiledKeyMapping.linkItems]?.[0];
          return prev;
        }, testToPlanMap);
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
      const requestReportList = search(`id in [${JSON.stringify(report.objectId)}]`).then(
        async reports => {
          console.info(`zgc requestReportList`, JSON.stringify(reports));
          const reportRes = reports[0];
          setRes({ report: reportRes });
          await Promise.all([setToolList(reportRes)]);
        },
      );

      const planToStoryMap = {};
      const storyList = [];
      const requestTestPlanList = search(
        `id in ${JSON.stringify(executionRefTestEntityIds.planIds)}`,
        ['ancestor', 'id'],
      ).then(async planList => {
        console.info(`zgc requestTestList`, JSON.stringify(planList));
        setRes({ planList });
        planList.forEach(plan => {
          const planId = plan.id;
          const ancestorKey = plan.ancestor?.key;
          if (!ancestorKey) return;
          if (!planToStoryMap[planId]) {
            planToStoryMap[planId] = plan.ancestor?.objectId;
          }

          if (!storyList.includes(ancestorKey)) {
            storyList.push(ancestorKey);
          }
        });

        setRes({ storyCount: storyList.length || 0 });
        setRes({ storyList });
      });

      await Promise.all([requestTestList, requestTestPlanList, requestReportList, requestRunList]);
      res.planList?.forEach(plan => {
        if (plan.ancestor?.objectId && !storyMap[plan.ancestor.objectId]) {
          storyMap[plan.ancestor?.objectId] = { ...plan.ancestor, id: plan.ancestor.objectId };
        }
      });

      const unTestedStoryList = allStroyList
        .filter(story => !storyList.includes(story.key))
        .map(story => '#' + story.key.split('-')[1] + '-' + story.name);
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
          { title: '被测版本号', dataIndex: zgcConfig?.被测版本号 ?? 'Text2' },
          { title: '被测版本下载地址', dataIndex: zgcConfig?.被测版本下载地址 ?? 'es_array2' },
        ];
        setRes({ ['被测系统版本']: createTable(columns, versionList, 'version') });
      };
      getVersion();

      const getRunStatics = () => {
        const map = {};
        const tableMap = {};
        const storyTableMap = res.planList?.reduce((map, plan) => {
          if (plan.ancestor?.objectId && !map[plan.ancestor.objectId]) {
            map[plan.ancestor.objectId] = {
              storyName: plan.ancestor?.name,
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
          return map;
        }, {});
        const testerMap = {};
        res.testList.forEach(test => {
          map[test.objectId] = test.values?.[zgcConfig?.测试阶段 ?? 'ceshijieduan']?.[0];
        });

        runList.forEach(run => {
          const test_time = map[run.values[TestFiledKeyMapping.linkItems][0]];
          const storyId =
            storyMap[
              planToStoryMap?.[testToPlanMap?.[run.values[TestFiledKeyMapping.linkItems][0]]]
            ]?.id;
          const executor = run.values[TestFiledKeyMapping?.designee]?.[0]?.nickname;
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
          storyTableMap[storyId][key] += 1;
          storyTableMap[storyId].total += 1;
        });
        const list = Object.values(tableMap).map((row: any) => {
          row.passPercent = `${((row.passed_count * 100) / (row.total || 1)).toFixed(2)}%`;
          return row;
        });

        const storyStaticList = Object.values(storyTableMap).map((row: any) => {
          row.passPercent = `${((row.passed_count * 100) / (row.total || 1)).toFixed(2)}%`;
          row.executedPercent = `${(
            ((row.total - row.todo_count) * 100) /
            (row.total || 1)
          ).toFixed(2)}%`;
          return row;
        });
        const executors = Object.keys(testerMap).join('、');

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

        const storyStaticColumns = [
          { title: '需求名称', dataIndex: 'storyName' },
          { title: '需求用例总数', dataIndex: 'total' },
          { title: '无效用例数', dataIndex: 'cancel_count' },
          { title: '未执行用例数', dataIndex: 'todo_count' },
          { title: '通过用例数', dataIndex: 'passed_count' },
          { title: '失败用例数', dataIndex: 'failed_count' },
          { title: '执行中用例数', dataIndex: 'executing_count' },
          { title: '阻塞用例数', dataIndex: 'block_count' },
          { title: '需求用例执行率', dataIndex: 'executedPercent' },
          { title: '需求用例执行通过率', dataIndex: 'passPercent' },
        ];
        setRes({ ['用例执行统计']: createTable(columns, list, 'run') });
        setRes({
          ['需求相关用例执行统计']: createTable(storyStaticColumns, storyStaticList, 'story'),
        });
        setRes({ executors });
      };
      getRunStatics();

      // 保存需求相关缺陷统计
      const getBugStaticsByStory = async () => {
        // 查询测试任务关联的需求
        const _storyList = uniqBy(
          executionRefTestEntityIds.self
            .map(executionId => {
              return storyMap[planToStoryMap?.[testToPlanMap?.[executionId]]];
            })
            .filter(Boolean),
          'id',
        ) as any[];
        console.info(
          '查看需求关联的缺陷',
          JSON.stringify({
            storyMap,
            executionRefTestEntityIds: executionRefTestEntityIds.self,
            planToStoryMap,
            testToPlanMap,
          }),
        );
        // 查询需求关联的缺陷
        const [links, storyBugs] = await fetchBugFromItemLinks(
          _storyList.map(i => i.id),
          `("itemTypeKey" in ${JSON.stringify(bugItemType)})`,
        );
        console.info('查看需求关联的缺陷', JSON.stringify({ links, storyBugs, _storyList }));
        setRes({
          ['需求相关缺陷']: {
            links,
            storyBugs,
            _storyList,
            storyMap,
            planToStoryMap,
            testToPlanMap,
            executionRefTestEntityIds: executionRefTestEntityIds.self,
          },
        });
        const list = _storyList.map(i => {
          const bugList = links
            .filter(d => d.source.objectId === i.objectId)
            .map(b => storyBugs.find(bug => bug.objectId === b.destination.objectId))
            .filter(Boolean);
          const close_count = bugList.filter(b => (b.status as any)?.name === '已关闭').length;
          const validLength = bugList.filter(b =>
            (zgcConfig.有效解决方案 || []).includes(b.values[zgcConfig.解决方案]?.toString()),
          ).length;
          const discoverBugs = bugList.filter(b => (b as any).isRelativeCase);
          const total = bugList.length || 1;
          return {
            name: i.name,
            bug_total: bugList.length,
            close_count,
            deferred_count: bugList.filter(b => (b.status as any)?.name === '延期处理').length,
            not_close_count: bugList.length - close_count,
            discover_rate: `${((100 * discoverBugs.length) / total).toFixed(2)}%`,
            close_rate: `${((100 * close_count) / total).toFixed(2)}%`,
            valid_rate: `${((100 * validLength) / total).toFixed(2)}%`,
          };
        });
        // 统计缺陷通过率
        const columns = [
          { title: '需求名称', dataIndex: 'name' },
          { title: '需求缺陷总数', dataIndex: 'bug_total' },
          { title: '已关闭缺陷', dataIndex: 'close_count' },
          { title: '延期处理缺陷', dataIndex: 'deferred_count' },
          { title: '未关闭缺陷', dataIndex: 'not_close_count' },
          { title: '需求用例发现缺陷率', dataIndex: 'discover_rate' },
          { title: '需求缺陷关闭率', dataIndex: 'close_rate' },
          { title: '有效缺陷率', dataIndex: 'valid_rate' },
        ];
        // 构建表格
        setRes({ ['需求相关缺陷统计']: createTable(columns, list, 'bugStaticsByStory') });
      };

      await getBugStaticsByStory();

      // 保存阶段与缺陷的统计
      const getBugStaticsByStage = async () => {
        // 查询测试任务中的自定义字段-阶段
        // 查询测试执行关联的缺陷
        const [links, runBugs] = await fetchBugFromItemLinks(
          executionRefTestEntityIds.self,
          `"itemTypeKey" in ${JSON.stringify(bugItemType)}`,
        );
        console.info('查看测试执行关联的缺陷', JSON.stringify({ links, runBugs, groupMap }));
        setRes({ bugCount: runBugs?.length });
        setRes({ ['阶段统计测试']: { links, runBugs, groupMap } });
        // 构建表格
        const list = Object.keys(groupMap).map(stage => {
          const executions = groupMap[stage] || [];
          // 找到测试执行所关联的缺陷
          const bugList = runBugs.filter(i => {
            const executionsIds = executions.map(i => i.id);
            const _link = links.filter(l => executionsIds.includes(l.source.objectId));
            const bugIds = _link.map(i => i.destination.objectId);
            return bugIds.includes(i.objectId);
          });
          console.info('查看这条阶段对应的数据', JSON.stringify({ executions, bugList }));
          const close_count = bugList.filter(b => (b.status as any)?.name === '已关闭').length;
          const validLength = bugList.filter(b =>
            (zgcConfig.有效解决方案 || []).includes(b.values[zgcConfig.解决方案]?.toString()),
          ).length;
          const discoverBugs = bugList.filter(b => (b as any).isRelativeCase);
          const total = bugList.length || 1;

          return {
            test_time: stage,
            bug_total: bugList.length,
            close_count,
            deferred_count: bugList.filter(b => (b.status as any)?.name === '延期处理').length,
            not_close_count: bugList.length - close_count,
            discover_rate: `${((100 * discoverBugs.length) / total).toFixed(2)}%`,
            close_rate: `${((100 * close_count) / total).toFixed(2)}%`,
            valid_rate: `${((100 * validLength) / total).toFixed(2)}%`,
          };
        });
        // 统计缺陷通过率
        const columns = [
          { title: '测试阶段', dataIndex: 'test_time' },
          { title: '执行任务缺陷总数', dataIndex: 'bug_total' },
          { title: '已关闭缺陷', dataIndex: 'close_count' },
          { title: '延期处理缺陷', dataIndex: 'deferred_count' },
          { title: '未关闭缺陷', dataIndex: 'not_close_count' },
          { title: '执行任务用例发现缺陷率', dataIndex: 'discover_rate' },
          { title: '执行任务缺陷关闭率', dataIndex: 'close_rate' },
          { title: '有效缺陷率', dataIndex: 'valid_rate' },
        ];
        // 构建表格
        setRes({ ['阶段相关缺陷统计']: createTable(columns, list, 'timeStaticsByStory') });
      };

      await getBugStaticsByStage();
    }

    return buildResponse(res);
  } catch (err) {
    console.info('err--------------------------------', err);
    return buildResponse({
      err,
    });
  }
};
