import { t } from 'i18next';
import { last, omit } from 'lodash';

import Parse from '@/lib/parse';
import {
  bindIqlToChartOption,
  buildIqlConfigsByDataSourceConfigs,
  DataSource,
  genDataSourceConfigUid,
  ReportChartGroupKey,
  ReportTemplateChartGroupKey,
  SupportDataSourceChartViewReg,
} from '@/lib/testReport';

import { Chart, ChartGroup, Workspace } from '../models';

export type TestReportModelType = {
  objectId: string;
  /** 报告名称 */
  name: string;
  /** 对应的 chartGroup */
  chartGroup: any;
  /** 空间 */
  workspace: any;
  /** 创建人 */
  createdBy: any;
  /** 创建时间 */
  createdAt: any;

  /** 是否是测试报告模板 */
  isTemplate: boolean;

  // ------ 报告模板相关数据字段 ------ //
  /** 是否是租户级模板 */
  isGlobalTemplate: boolean;
  /** 是否是默认模板 */
  isDefaultTemplate: boolean;
  /** 模板配置文件 */
  templateConfig: {
    /** 概览配置 */
    reportOverviewConfig: {
      /** 是否启用概览 */
      enabled: boolean;
    };
    /** 数据源配置 */
    dataSource: Record<string, [DataSource] | [DataSource, DataSource]>;
  };

  // ------ 报告相关数据字段 ------ //
  /** 基于哪个模板生成 */
  usingReportTemplate: any;
  /** 报告状态 */
  reportStatus: string;
  /** 报告概览数据 */
  reportOverviewData: Record<string, any>;
};

/** 测试报告模板相关的 Key */
const FilterReportTemplateKey = [
  'isTemplate',
  'isGlobalTemplate',
  'isDefaultTemplate',
  'templateConfig',
] as (keyof TestReportModelType)[];

// 排除原始数据中的字段
const FilterOriginalParseDataKeys = ['objectId', 'key', 'className', 'chartGroup', '__type'];

// 测试报告模板
const TestReport = Parse.Object.extend('test_manager_TestReport', {
  /** 创建报告模板 */
  async createTemplate(reportTemplateParams) {
    const objectId = this.get('objectId');
    const isExisted = Boolean(objectId);
    if (isExisted) throw new Error(t('page.reportTemplateCreator.templateExisted'));

    if (reportTemplateParams.name?.length > 25) {
      throw new Error(t('page.reportTemplateCreator.templateNameTooLong'));
    }

    // 重名校验逻辑
    const existedNameTemplateQuery = new Parse.Query(TestReport).equalTo(
      'name',
      reportTemplateParams.name,
    );

    if (reportTemplateParams.workspace) {
      existedNameTemplateQuery.equalTo(
        'workspace',
        Workspace.createWithoutData(reportTemplateParams.workspace),
      );
    } else if (reportTemplateParams.isGlobalTemplate) {
      existedNameTemplateQuery.equalTo('isGlobalTemplate', reportTemplateParams.isGlobalTemplate);
    }

    // 校验名称是否重复
    const alreadyExistedSameNameTemplate = await existedNameTemplateQuery
      .select(['objectId'])
      .first({ json: true });

    if (alreadyExistedSameNameTemplate) {
      throw new Error(t('page.reportTemplateCreator.nameExisted'));
    }

    const { name, workspace, isDefaultTemplate, isGlobalTemplate, templateConfig } = Object.assign(
      {},
      this,
      reportTemplateParams,
    );

    // 创建 chartGroup object
    const chartGroupObject = await new ChartGroup({
      name,
      global: true,
      key: ReportTemplateChartGroupKey,
    }).save();

    // 创建 chartGroup template
    this.set({
      name,
      templateConfig,
      isTemplate: true,
      isGlobalTemplate,
      isDefaultTemplate,
      chartGroup: chartGroupObject,
      workspace: typeof workspace === 'string' ? Workspace.createWithoutData(workspace) : workspace,
      createdBy: Parse.User.current(),
    });

    // 创建 report template
    return this.save();
  },

  /** 生成测试报告 */
  async createReport(
    templateId: string,
    reportParams: Partial<Pick<TestReportModelType, 'reportStatus' | 'reportOverviewData'>> &
      Pick<TestReportModelType, 'workspace' | 'name'> & {
        dataSourceIql?: Record<string, string>;
        defectsMapping?: string[];
        itemTypeMap?: string[];
      },
  ) {
    if (reportParams.name?.length > 25) {
      throw new Error(t('page.reportTemplateCreator.reportNameTooLong'));
    }
    // 获取模板数据
    const templateReportData = await new Parse.Query(TestReport)
      .equalTo('objectId', templateId)
      .include(['chartGroup'])
      .first({ json: true });

    const reportTemplateChartGroup = templateReportData.chartGroup;
    /** 报告模板配置数据 */
    const reportTemplateConfig = templateReportData.templateConfig;

    // 获取模板关联的 chart 数据
    const chartGroupId = reportTemplateChartGroup.objectId;
    const chartDataList = await new Parse.Query(Chart)
      .equalTo('chartGroup', chartGroupId)
      .findAll({ json: true });

    // 创建测试报告
    // 1. 创建测试报告关联的 chartGroup
    const chartGroupObject = new ChartGroup();
    chartGroupObject.set({
      ...omit(
        reportTemplateChartGroup,
        FilterOriginalParseDataKeys.concat(FilterReportTemplateKey),
      ),
      name: reportParams?.name,
      key: ReportChartGroupKey,
    });
    await chartGroupObject.save();

    const chartGroupData = chartGroupObject.toJSON();
    const templateDataSourceConfig = reportTemplateConfig?.dataSource ?? {};
    console.info('templateDataSourceConfig ------------->', templateDataSourceConfig);

    const iqlConfigs = await buildIqlConfigsByDataSourceConfigs(
      Object.values(templateDataSourceConfig),
      reportParams,
    );

    console.info('iqlConfigs------------->', iqlConfigs);

    // 2. 创建测试报告关联的 chart
    const newChartObjects = chartDataList.map(chartData => {
      const newChartObject = new Chart();
      newChartObject.set({
        ...omit(chartData, FilterOriginalParseDataKeys),
        chartGroup: ChartGroup.createWithoutData(chartGroupData.objectId),
      });

      // 只有 basic 类型的 chart 才可以使用数据源
      if (SupportDataSourceChartViewReg.test(chartData.view)) {
        const dataSource = templateDataSourceConfig[chartData.objectId];
        // 根据数据源配置生成对应的 iql
        const iql = iqlConfigs[genDataSourceConfigUid(dataSource)];
        // 根据 iql 增加到 chartOption 中
        const option = bindIqlToChartOption(iql, chartData);

        // 设置 option
        newChartObject.set({ option });
      }
      return newChartObject;
    });

    // 3. 创建 test_manager_TestReport
    const newTestReportObject = new TestReport().set({
      ...omit(templateReportData, FilterOriginalParseDataKeys.concat(FilterReportTemplateKey)),
      isTemplate: false,
      name: reportParams.name,
      reportStatus: reportParams.reportStatus,
      reportOverviewData: reportParams?.reportOverviewData,
      usingReportTemplate: TestReport.createWithoutData(templateId),
      chartGroup: ChartGroup.createWithoutData(chartGroupData.objectId),
      workspace: Workspace.createWithoutData(reportParams.workspace?.objectId),
      createdBy: Parse.User.current(),
    });

    try {
      const res: any[] = await Parse.Object.saveAll([...newChartObjects, newTestReportObject]);
      return {
        status: 'success',
        data: last(res)?.toJSON(),
      };
    } catch (error) {
      return {
        status: 'failed',
      };
    }
  },

  /** 删除报告或模板 */
  async delete(objectId) {
    if (!objectId) throw new Error('TestReport is not existed');
    try {
      const testReportObject = await new Parse.Query(TestReport)
        .equalTo('objectId', objectId)
        .first();
      const chartGroupData = testReportObject.toJSON();
      const chartGroupObjectId = chartGroupData.chartGroup.objectId;
      const chartGroupQuery = new Parse.Query('ChartGroup')
        .equalTo('objectId', chartGroupObjectId)
        .first();

      const chartQuery = new Parse.Query('Chart')
        .equalTo('chartGroup', chartGroupObjectId)
        .findAll();

      const [chartGroupObject, chartObjects] = await Promise.all([chartGroupQuery, chartQuery]);
      await Parse.Object.destroyAll([testReportObject, chartGroupObject, ...chartObjects]);
    } catch (error) {
      console.error(error);
    }
  },
});

export default TestReport;
