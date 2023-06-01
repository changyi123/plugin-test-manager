import { useQuery } from '@tanstack/react-query';

import Parse, { escapeMatchesQueryArg } from '@/lib/parse';

import { TestReport, Workspace } from '../models';
import type { PaginationParams } from '../type';

/** query key */
export const TestReportQueryKeys = {
  /** 查询当前空间内支持创建模板 */
  workspaceTemplate: params => ['testReport', 'template', params],
  /** 查询配置页面模板 */
  allTemplate: params => ['testConfig', 'allTemplate', params],
  /** 查询当前空间的报告 */
  workspaceReport: params => ['testReport', 'report', params],
} as const;

/** 获取空间内支持创建模板 */
export const useWorkspaceTemplate = (params: {
  workspace: string;
  name?: string;
  pagination?: PaginationParams;
}) => {
  return useQuery(
    TestReportQueryKeys.workspaceTemplate(params),
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
export const useWorkspaceReport = (params: {
  workspace: string;
  name?: string;
  pagination?: {
    limit?: number;
    offset?: number;
  };
}) => {
  return useQuery(
    TestReportQueryKeys.workspaceReport(params),
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
