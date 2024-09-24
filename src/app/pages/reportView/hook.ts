import { useQuery } from '@tanstack/react-query';
import { t } from 'i18next';

import { getTestEntityByQuery } from '@/lib/api/item';
import { TestType } from '@/lib/constants';
import Parse from '@/lib/parse';
import { Sprint, Version, Workspace } from '@/services/models';

const parseDataQuery = (Model, ids) => {
  return new Parse.Query(Model).containedIn('objectId', ids).findAll({ json: true });
};

// 构建 overview label
const buildOverViewLabelResult = (key, items, itemDisplayKey = 'name') => {
  const i18nT = () => {
    return t(`report.overViewData.label.${key}`);
  };

  // 拼接 item name
  const joinItemName = () => {
    return items.map(item => item[itemDisplayKey]).join('、');
  };

  return {
    label: i18nT(),
    text: joinItemName(),
  };
};

const OverViewLabelFetcher = {
  async testPlan(ids) {
    // 获取测试计划数据
    const { list } = await getTestEntityByQuery({
      query: {
        type: TestType.Plan,
        id: ids,
      },
    });

    return buildOverViewLabelResult('testPlan', list);
  },
  async testExecution(ids) {
    // 获取测试计划数据
    const { list } = await getTestEntityByQuery({
      query: {
        type: TestType.Execution,
        id: ids,
      },
    });

    return buildOverViewLabelResult('testExecution', list);
  },
  async version(ids) {
    const data = await parseDataQuery(Version, ids);
    return buildOverViewLabelResult('version', data);
  },
  async sprint(ids) {
    const data = await parseDataQuery(Sprint, ids);
    return buildOverViewLabelResult('sprint', data);
  },
  async workspace(ids) {
    const data = await parseDataQuery(Workspace, ids);
    return buildOverViewLabelResult('workspace', data);
  },
};

/** 获取测试报告预览数据 */
export const useReportOverviewDisplayText = reportData => {
  return useQuery(
    ['reportOverviewData', reportData?.objectId],
    async () => {
      // TODO: 获取测试报告预览数据
      const reportOverviewData = reportData.reportOverviewData;
      const tasks = Object.keys(reportOverviewData).map(key => {
        return Promise.resolve(OverViewLabelFetcher[key]?.(reportOverviewData[key])).then(data => ({
          key,
          ...data,
        }));
      });
      const results = await Promise.all(tasks);
      return results.filter(item => item.text);
    },
    {
      staleTime: Infinity,
      cacheTime: Infinity,
      enabled: !!reportData?.objectId,
    },
  );
};
