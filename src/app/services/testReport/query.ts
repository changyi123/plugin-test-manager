import { useQuery } from '@tanstack/react-query';

import Parse, { escapeMatchesQueryArg } from '@/lib/parse';

import { Chart, ChartGroup, TestReport, Workspace } from '../models';
import type { PaginationParams } from '../type';

/** query key */
export const TestReportQueryKeys = {
  /** 查询当前空间内支持创建模板 */
  workspaceTemplateList: params => ['testReport', 'templateList', params],
  /** 查询当前空间的报告 */
  workspaceReportList: params => ['testReport', 'reportList', params],
  /** 获取单个模板查询 */
  template: params => ['testReport', 'template', params],

  /** 获取仪表盘数据 */
  chartGroup: params => ['testReport', 'chartGroup', params],

  /** 查询配置页面模板 */
  allTemplate: params => ['testConfig', 'allTemplate', params],
} as const;

/** 获取空间内支持创建模板 */
export const useWorkspaceTemplateListQuery = (params: {
  workspace: string;
  name?: string;
  pagination?: PaginationParams;
}) => {
  return useQuery(
    TestReportQueryKeys.workspaceTemplateList(params),
    async () => {
      const buildBasicQuery = () => {
        const query = new Parse.Query(TestReport).equalTo('isTemplate', true);
        if (params.name) {
          query.matches('name', escapeMatchesQueryArg(params.name));
        }
        return query;
      };

      return await Parse.Query.or(
        buildBasicQuery().equalTo('isGlobalTemplate', true),
        buildBasicQuery().equalTo('workspace', Workspace.createWithoutData(params.workspace)),
      )
        .skip(params.pagination?.offset ?? 0)
        .limit(params.pagination?.limit ?? 99)
        .find({ json: true });
    },
    {
      enabled: Boolean(params.workspace),
    },
  );
};

/** 获取空间内的报告 */
export const useWorkspaceReportListQuery = (params: {
  workspace: string;
  name?: string;
  pagination?: {
    limit?: number;
    offset?: number;
  };
}) => {
  return useQuery(
    TestReportQueryKeys.workspaceReportList(params),
    async () => {
      return new Parse.Query(TestReport)
        .equalTo('isTemplate', false)
        .equalTo('workspace', Workspace.createWithoutData(params.workspace))
        .matches('name', escapeMatchesQueryArg(params.name))
        .skip(params.pagination?.offset ?? 0)
        .limit(params.pagination?.limit ?? 99)
        .find({ json: true });
    },
    {
      enabled: Boolean(params.workspace),
    },
  );
};

/** 获取单个模板查询 */
export const useTemplateQuery = (params: { id?: string }) => {
  return useQuery(
    TestReportQueryKeys.template(params),
    async () => {
      return new Parse.Query(TestReport)
        .equalTo('objectId', params.id)
        .equalTo('isTemplate', true)
        .first({ json: true });
    },
    {
      enabled: Boolean(params.id),
    },
  );
};

/** 获取 chartGroup */
export const useChartGroupQuery = (params: {
  id?: string;
  /** 是否查询 Chart */
  includeChart?: boolean;
}) => {
  return useQuery(
    TestReportQueryKeys.chartGroup(params),
    async () => {
      const queryTasks = [
        new Parse.Query(ChartGroup).equalTo('objectId', params.id).first({ json: true }),
      ];

      if (params.includeChart) {
        queryTasks.push(
          new Parse.Query(Chart)
            .equalTo('chartGroup', ChartGroup.createWithoutData(params.id))
            .find({ json: true }),
        );
      }

      const [chartGroup, charts] = await Promise.all(queryTasks);

      return {
        chartGroup,
        charts,
      };
    },
    {
      enabled: Boolean(params.id),
    },
  );
};
