import { omit } from 'lodash';

import Parse from '@/lib/parse';
import { DataSource, SupportDataSourceChartViewReg } from '@/lib/testReport';
import { bindIqlToChartOption, dataSourceIqlGenerator } from '@/lib/testReport';

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
const FilterOriginalParseDataKeys = ['objectId', 'key', 'className', 'chartGroup'];

/** 测试报告模板 Key */
const ReportTemplateChartGroupKey = 'test_manager_report_template' as const;
const ReportChartGroupKey = 'test_manager_report' as const;

// 测试报告模板
const TestReport = Parse.Object.extend('test_manager_TestReport', {
  /** 创建报告模板 */
  async createTemplate(reportTemplateParams) {
    const objectId = this.get('objectId');
    const isExisted = Boolean(objectId);
    if (isExisted) throw new Error('ReportTemplate is existed');

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
      },
  ) {
    // 获取模板数据
    const templateReportData = await new Parse.Query(TestReport)
      .equalTo('objectId', templateId)
      .include('chartGroup')
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
    const chartGroupQuery = new ChartGroup();
    chartGroupQuery.set(
      Object.assign(omit(reportTemplateChartGroup, FilterOriginalParseDataKeys), {
        key: ReportChartGroupKey,
        reportStatus: reportParams?.reportStatus,
        reportOverviewData: reportParams?.reportOverviewData,
      }),
    );
    const chartGroupObject = await chartGroupQuery.save();

    const chartGroupData = chartGroupObject.toJSON();
    const templateDataSourceConfig = reportTemplateConfig?.dataSource ?? {};

    // 2. 创建测试报告关联的 chart
    const newChartObjects = await Promise.all(
      chartDataList.map(async chartData => {
        const newChartObject = new Chart();
        newChartObject.set(
          Object.assign(omit(chartData, FilterOriginalParseDataKeys), {
            chartGroup: ChartGroup.createWithoutData(chartGroupData.objectId),
          }),
        );

        // 只有 basic 类型的 chart 才可以使用数据源
        if (SupportDataSourceChartViewReg.test(chartData.view)) {
          const dataSource = templateDataSourceConfig[chartData.objectId];
          // 根据数据源配置生成对应的 iql
          // TODO: prepareData 数据
          const iql = await dataSourceIqlGenerator(dataSource, reportParams);
          // 根据 iql 增加到 chartOption 中
          const option = bindIqlToChartOption(iql, chartData);
          // 设置 option
          newChartObject.set({ option });
        }
        return newChartObject;
      }),
    );

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
    });

    try {
      await Parse.Object.saveAll([...newChartObjects, newTestReportObject]);
      return {
        status: 'success',
      };
    } catch (error) {
      return {
        status: 'failed',
      };
    }
  },

  /** 删除报告或模板 */
  async delete(_objectId) {
    const objectId = this.get('objectId') ?? _objectId;
    if (!objectId) throw new Error('ReportTemplate is not existed');
    try {
      const chartGroupObjectId = this.get('chartGroup');
      const chartGroupQuery = new Parse.Query('ChartGroup')
        .equalTo('objectId', chartGroupObjectId)
        .find();

      const chartQuery = new Parse.Query('Chart')
        .equalTo('chartGroup', chartGroupObjectId)
        .findAll();

      const [chartGroupObjects, chartObjects] = await Promise.all([chartGroupQuery, chartQuery]);
      await Parse.Object.destroyAll([chartGroupObjects, ...chartObjects]);
    } catch (error) {
      console.error(error);
    }
  },
});

export default TestReport;
