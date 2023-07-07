import { Document, ImageRun, Packer, Paragraph } from 'docx';
import domtoimage from 'dom-to-image-more';

import { TestType } from './constants';
import { getPagePrefix, isInOne } from './utils/helper';

/** 测试报告名称最大支持的长度限制 */
export const TestReportMaxNameLength = 25;

export type SelectorType =
  | 'sprint'
  | 'version'
  | 'workspace'
  | 'customField'
  | 'test_manager_Plan'
  | 'currentWorkspace';

/** 测试报告模板 Key */
export const ReportTemplateChartGroupKey = 'test_manager_report_template' as const;
export const ReportChartGroupKey = 'test_manager_report' as const;
export const CustomDataSourceKey = 'customDataSource' as const;
export const CustomDataSourceConfigKey = 'customDataSourceConfig' as const;

/** 支持数据源配置的 Chart */
export const SupportDataSourceChartViewReg = /^basic/;

// 数据源类型
export type DataSource = {
  /** 筛选器 uid */
  key: string;
  /** 是否是第一级筛选器 */
  isFirstLevel: boolean;
  // 数据源需要创建时限定的范围
  selector?: SelectorType;
  // 二级数据源依赖的一级数据源
  dependOn?: DataSource['key'][];
  notRequired?: boolean;

  // 自定义数据源的配置
  name?: string;

  // 自定义数据源的配置
  config?: {
    webTriggerKey?: string;
  };
};

export type TemplateDataSourceConfig = [DataSource] | [DataSource, DataSource];

/** 数据源集合 */
export const DataSourceCollection: DataSource[] = [
  {
    key: 'plan',
    isFirstLevel: true,
    selector: 'test_manager_Plan',
  },
  {
    key: 'sprint',
    isFirstLevel: true,
    selector: 'sprint',
  },
  {
    key: 'version',
    isFirstLevel: true,
    selector: 'version',
  },
  {
    key: 'currentWorkspace',
    isFirstLevel: true,
    notRequired: true,
  },
  {
    // 自定义数据源
    key: CustomDataSourceKey,
    isFirstLevel: true,
  },
  // 第二级筛选器
  {
    key: TestType.Case,
    isFirstLevel: false,
    dependOn: ['plan', 'workspace', 'currentWorkspace'],
  },
  {
    key: TestType.Run,
    isFirstLevel: false,
    dependOn: ['plan', 'workspace', 'currentWorkspace'],
  },
  {
    key: TestType.TestDefect,
    isFirstLevel: false,
    dependOn: ['sprint', 'version', 'workspace', 'currentWorkspace'],
  },
];

/** 生成数据源配置 uid */
export const genDataSourceConfigUid = (dataSourceConfig: TemplateDataSourceConfig) => {
  return dataSourceConfig.map(dataSource => dataSource.key).join('_');
};

/** 生成仪表盘页面链接 */
export const genChartGroupPageUrl = ({
  isTemplate,
  chartGroupId,
}: {
  isTemplate?: boolean;
  chartGroupId: string;
}) => {
  const pagePrefix = getPagePrefix();

  const searchParams = new URLSearchParams(
    '?hiddenHeader=true&hiddenSidebar=true&disableLazyLoad=true&displayContext=test_manager',
  );
  if (isTemplate) {
    searchParams.append('moduleKey', ReportTemplateChartGroupKey);
  } else {
    searchParams.append('showChartListHeader', '1');
    searchParams.append('moduleKey', ReportChartGroupKey);
  }
  if (chartGroupId) {
    searchParams.append('chartGroupId', chartGroupId);
  }

  return `${pagePrefix}/plugin/team_insight_charts_base_team_insight_charts_base?${searchParams.toString()}`;
};

/** 模板编辑创建页面 */
export const genReportTemplateUrl = (params?: { testReportId?: string; workspaceKey?: string }) => {
  const pagePrefix = getPagePrefix();
  const currentPageUrl = location.href.split('?')[0];
  const searchParams = new URLSearchParams();
  if (params?.testReportId) searchParams.append('testReportId', params.testReportId);
  if (params?.workspaceKey) searchParams.append('workspaceKey', params.workspaceKey);
  // 添加重定向地址
  searchParams.append('redirectLink', encodeURIComponent(currentPageUrl));

  return `${pagePrefix}/plugin/test_manager_test-report-creator?${searchParams.toString()}`;
};

/** 生成测试报告访问链接 */
export const genReportViewUrl = (params: { testReportId?: string }) => {
  const pagePrefix = getPagePrefix();
  const currentPageUrl = location.href.split('?')[0];
  const searchParams = new URLSearchParams();
  if (params?.testReportId) searchParams.append('testReportId', params.testReportId);
  // 添加重定向地址
  searchParams.append('redirectLink', encodeURIComponent(currentPageUrl));

  return `${pagePrefix}/plugin/test_manager_test-report-view?${searchParams.toString()}`;
};

// 移除 iframe 中加载的 layout params
export const clearIframeLayoutEffect = () => {
  if (isInOne()) {
    localStorage.removeItem('proxima-layout-params');
  }
};

// 下载测试报告
export const downloadTestReportView = async testReportData => {
  const iframe = document.body.querySelector('iframe');

  const title = testReportData.name;

  // 准备初始化数据
  // const prepareData = async () => {
  //   // 清空 iframe
  // };

  // 生成 document
  const buildDocument = async dataUrl => {
    const PageWidth = 595;
    const PageHeight = 842;

    const PageContentWidth = PageWidth - 72 * 2;
    const PageContentHeight = PageHeight - 72 * 2;

    const getImageTransformation = async dataUrl => {
      return new Promise<Record<'width' | 'height' | 'aspectRatio', number>>(resolve => {
        const image = new Image();
        image.src = dataUrl;
        image.onload = () => {
          let { width, height } = image;
          const aspectRatio = width / height;

          if (aspectRatio > 1) {
            // 如果图片的宽度大于高度，将宽度设置为页面宽度，然后根据宽高比计算高度
            width = PageContentWidth;
            height = width / aspectRatio;
          } else {
            // 如果图片的高度大于宽度，将高度设置为页面高度，然后根据宽高比计算宽度
            height = PageContentHeight;
            width = height * aspectRatio;
          }
          return resolve({
            width,
            height,
            aspectRatio,
          });
        };
      });
    };

    const snapshotParagraph = new Paragraph({
      children: [
        new ImageRun({
          data: dataUrl,
          transformation: await getImageTransformation(dataUrl),
        }),
      ],
    });

    const doc = new Document({
      sections: [
        {
          children: [snapshotParagraph],
        },
      ],
    });

    return doc;
  };

  return domtoimage
    .toPng(iframe.contentDocument.querySelector('.react-grid-layout'), {})
    .then(buildDocument)
    .then(doc => {
      // 将文档保存为 .docx 文件
      return Packer.toBlob(doc).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      });
    });
};
