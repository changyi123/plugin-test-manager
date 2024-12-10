import { useQuery } from '@tanstack/react-query';

import { getTestEntityByQuery } from '@/lib/api/item';
import { TestType } from '@/lib/constants';
import Parse, { escapeMatchesQueryArg } from '@/lib/parse';

import { bindPaginationToParseQuery } from '../lib';
import { Chart, ChartGroup, ReportTemplate, TestReport, Workspace } from '../models';
import type { OrderParams, PaginationParams } from '../type';

/** query key */
export const TestReportQueryKeys = {
  /** 查询当前空间内支持创建模板 */
  workspaceTemplateList: params => ['testReport', 'templateList', params],
  /** 查询当前空间的报告 */
  workspaceReportList: params => ['testReport', 'reportList', params],

  /** 获取仪表盘数据 */
  chartGroup: params => ['testReport', 'chartGroup', params],

  /** 查询配置页面模板 */
  allTemplateList: ['testConfig', 'allTemplate'],

  /** objectId */
  objectId: objectId => ['testReport', objectId],

  /** reportTemplate 查询 */
  reportTemplateList: ['testReport', 'templateFileList'],
} as const;

/** 获取空间内支持创建模板 */
export const useWorkspaceTemplateListQuery = (params: {
  name?: string;
  workspace: string;
  pagination?: PaginationParams;
  onlyWorkspaceTemplate?: boolean;
  onlyGlobalTemplate?: boolean;
  onlyEnabled?: boolean;
}) => {
  return useQuery(
    TestReportQueryKeys.workspaceTemplateList(params),
    async () => {
      const buildBasicQuery = () => {
        const query = new Parse.Query(TestReport).equalTo('isTemplate', true);
        if (params.onlyEnabled) {
          query.notEqualTo('disabled', true);
        }
        if (params.name) {
          query.matches('name', escapeMatchesQueryArg(params.name));
        }
        return query;
      };

      const subQueries = [
        !params.onlyWorkspaceTemplate && buildBasicQuery().equalTo('isGlobalTemplate', true),
        !params.onlyGlobalTemplate &&
          buildBasicQuery().equalTo('workspace', Workspace.createWithoutData(params.workspace)),
      ].filter(Boolean);

      const query = Parse.Query.or(...subQueries);

      return bindPaginationToParseQuery(query, params.pagination)
        .descending(['isDefaultTemplate', 'createdAt', 'workspace'])
        .find({ json: true });
    },
    {
      initialData: [],
      enabled: Boolean(params && params.workspace),
    },
  );
};

/** 获取空间内的报告 */
export const useWorkspaceReportListQuery = (params: {
  workspace: string;
  name?: string;
  order?: OrderParams;
  pagination?: PaginationParams;
}) => {
  return useQuery(
    TestReportQueryKeys.workspaceReportList(params),
    async () => {
      const query = new Parse.Query(TestReport)
        .equalTo('isTemplate', false)
        .equalTo('workspace', Workspace.createWithoutData(params.workspace))
        .include('createdBy')
        .matches('name', escapeMatchesQueryArg(params.name));
      if (params.order?.asc) {
        query.addAscending(params.order?.asc ?? ['createdAt']);
      } else {
        query.addDescending(params.order?.desc ?? ['createdAt']);
      }

      return bindPaginationToParseQuery(query, params.pagination).find({ json: true });
    },
    {
      initialData: [],
      enabled: Boolean(params.workspace),
    },
  );
};

/** 获取空间内的旧版本报告数 */
export const useWorkspaceReportCountQuery = (params: { workspace: string }) => {
  return useQuery(
    TestReportQueryKeys.workspaceReportList(params),
    async () => {
      const query = new Parse.Query(TestReport)
        .equalTo('isTemplate', false)
        .equalTo('workspace', Workspace.createWithoutData(params.workspace));

      return query.count(true);
    },
    {
      initialData: 0,
      enabled: Boolean(params.workspace),
    },
  );
};

/** 获取单个模板查询 */
export const useTestReportByObjectId = objectId => {
  return useQuery(
    TestReportQueryKeys.objectId(objectId),
    async () => {
      return new Parse.Query(TestReport).equalTo('objectId', objectId).first({ json: true });
    },
    {
      enabled: Boolean(objectId),
    },
  );
};

/** 获取单个模板查询V2 */
export const useTestReportV2ByObjectId = objectId => {
  return useQuery(
    TestReportQueryKeys.objectId(objectId),
    async () => {
      return getTestEntityByQuery({
        query: {
          id: [objectId],
          type: TestType.Report,
        },
        notConcatField: true,
        fields: [],
      }).then(async (data: any) => {
        const report = data?.list?.[0];
        let template;
        if (report) {
          template = await new Parse.Query(TestReport)
            .equalTo('objectId', report.reportTemplate)
            .first({ json: true });
        }
        return {
          report,
          template,
        };
      });
    },
    {
      enabled: Boolean(objectId),
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
        charts,
        chartGroup,
      };
    },
    {
      enabled: Boolean(params.id),
    },
  );
};

/** 查找全部的模板 */
export const useAllTemplateList = (params?: { pagination?: PaginationParams }) => {
  return useQuery(
    TestReportQueryKeys.allTemplateList,
    async () => {
      const query = new Parse.Query(TestReport)
        .equalTo('isTemplate', true)
        .include('workspace')
        .descending(['isDefaultTemplate', 'createdAt', 'workspace']);

      return bindPaginationToParseQuery(query, params?.pagination).find({ json: true });
    },
    {
      initialData: [],
    },
  );
};

/** 获取空间内支持创建模板 */
export const useReportTemplateList = (params?: { pagination?: PaginationParams }) => {
  return useQuery(
    TestReportQueryKeys.reportTemplateList,
    async () => {
      const query = new Parse.Query(ReportTemplate).exists('createdAt').addDescending('updatedAt');

      return bindPaginationToParseQuery(query, params?.pagination).find({ json: true });
    },
    {
      initialData: [],
    },
  );
};
