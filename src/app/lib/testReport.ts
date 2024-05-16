import { Document, ImageRun, Packer, Paragraph } from 'docx';
import domtoimage from 'dom-to-image-more';

import { generateTestReportOfflineFile } from '@/services/testReport/service';

import { featureFlags, SupportFeatureFlags } from './appEnv';
import { TestType } from './constants';
import { getPagePrefix, isInOne } from './utils/helper';

/** 测试报告名称最大支持的长度限制 */
export const TestReportMaxNameLength = 250;

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
  return dataSourceConfig?.map(dataSource => dataSource.key).join('_');
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

const exportDocx = async testReportData => {
  const iframe = document.body.querySelector('iframe');

  const title = testReportData.name;
  // eslint-disable-next-line prefer-spread
  const toBlob = (...args) => Packer?.toBlob.apply(Packer, args);

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

    // 修复 docx 导出的 bug，jszip 漏洞
    (window as any).setImmediate = window.setTimeout;
    return doc;
  };

  return domtoimage
    .toPng(iframe.contentDocument.querySelector('.react-grid-layout'), {})
    .then(buildDocument)
    .then(toBlob)
    .then(blob => {
      // 将文档保存为 .docx 文件
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    });
};

const downloadUrl = (data, reportName, extName) => {
  const a = document.createElement('a');
  a.href = data;
  a.download = `${reportName}.${extName}`;
  (a as any).style = 'display: none';
  document.body.appendChild(a);
  a.click();
  a.remove();
};

const exportOfflineDocx = async testReportData => {
  let reportUrl = testReportData?.reportUrl;
  const reportName = testReportData?.name;

  // 没有生成url，或者不是docx文件时重新生成
  if (!reportUrl || !/\.docx$/.test(reportUrl)) {
    await generateTestReportOfflineFile(testReportData?.objectId).then(data => {
      reportUrl = data?.data;
    });
  }

  downloadUrl(reportUrl, reportName, 'docx');
};

// 下载测试报告
export const exportWithDocx = async testReportData => {
  const enableOfflineReport = featureFlags(SupportFeatureFlags.ENABLE_OFFLINE_TEST_REPORT);
  enableOfflineReport ? exportOfflineDocx(testReportData) : exportDocx(testReportData);
};

// 导出pdf测试报告
export const exportWithPdf = async testReportData => {
  let reportUrl = testReportData?.reportUrl;
  const reportName = testReportData?.name;
  if (!reportUrl || !/\.pdf$/.test(reportUrl)) {
    await generateTestReportOfflineFile(testReportData?.objectId, true).then(data => {
      reportUrl = data?.data;
    });
  }

  downloadUrl(reportUrl, reportName, 'pdf');
};

// 下载测试报告
export const exportWithHTML = async testReportData => {
  // iframe document 节点
  const iframeDocument = document.body.querySelector('iframe')?.contentDocument.documentElement;
  /** 获取导出的 html 字符传 */
  const getExportIFrameHTMLString = async (): Promise<string> => {
    // 删除无用的 dom 节点
    const pruneDOMNode = async containerSelector => {
      const copyNode = iframeDocument.cloneNode(true) as HTMLElement;

      const retainTagNames = [
        'STYLE',
        // 'SCRIPT',
        'META',
        'TITLE',
        'BODY',
        'LINK',
        'HEAD',
        'HTML',
        'QIANKUN-HEAD',
      ];
      const retainDomIds = ['webpack-style-holder'];

      const container = copyNode.querySelector(containerSelector);
      // 修正 container 的 style height
      try {
        // 修正 container 的高度
        const height = container.getBoundingClientRect().height;
        const modifyHeight = height + 180;
        if (modifyHeight && typeof modifyHeight === 'number') {
          container.style.height = `${modifyHeight}px`;
        }
      } catch (err) {
        console.error(err);
      }

      copyNode.querySelectorAll('*').forEach(node => {
        if (
          !retainDomIds.includes(node.id) &&
          !retainTagNames.includes(node.tagName) &&
          !(container.contains(node) || node.contains(container))
        ) {
          node.parentNode?.removeChild?.(node);
        }
      });

      return copyNode;
    };
    // 由于 canvas 无法直接导出，所以需要将 canvas 转换为 img
    const replaceCanvasNodeWithImage = async copyNode => {
      const canvasNodes = iframeDocument.querySelectorAll('canvas');
      const replacedCopyNodes = copyNode.querySelectorAll('canvas');
      const tasks = Array.from(canvasNodes).map((canvasEle: HTMLCanvasElement, index) => {
        return domtoimage
          .toPng(canvasEle, {
            quality: 1,
            scale: 8,
          })
          .then(dataUrl => {
            const img = new Image();
            const canvasWrapperBounding = canvasEle.parentElement.getBoundingClientRect();
            img.width = canvasWrapperBounding.width;
            img.height = canvasWrapperBounding.height;
            img.src = dataUrl;

            const replacedCanvasNode = replacedCopyNodes[index];
            replacedCanvasNode.parentNode.replaceChild(img, replacedCanvasNode);
          });
      });
      await Promise.all(tasks);

      return copyNode;
    };
    // 离线 style link 标签的内容
    const downloadLinkContentIntoStyle = async copyNode => {
      const linkNodes = copyNode.querySelectorAll('link');
      const tasks = Array.from(linkNodes)
        .filter((linkEle: HTMLLinkElement) => linkEle.href.includes('.css'))
        .map((linkEle: HTMLLinkElement, index) => {
          return fetch(linkEle.href)
            .then(res => res.text())
            .then(text => {
              const style = document.createElement('style');
              style.type = 'text/css';
              style.innerHTML = text;
              style.id = `insert-style-${index}`;

              const replacedLinkNode = linkNodes[index];
              replacedLinkNode.parentNode.replaceChild(style, replacedLinkNode);
            });
        });
      await Promise.all(tasks);

      return copyNode;
    };

    // 将 copyNode 包裹在测试报告的 layout 中
    const wrapLayoutWithTestReport = async copyNode => {
      let styles = '';

      const reportBodyNode = document.querySelector('#report-body') as HTMLElement;

      const classNameSet = Array.from(reportBodyNode.querySelectorAll('*')).reduce((set, node) => {
        node.className.split(' ').forEach(className => {
          set.add(className);
        });
        return set;
      }, new Set());

      for (let i = 0; i < document.styleSheets.length; i++) {
        const styleSheet = document.styleSheets[i];
        try {
          for (let j = 0; j < styleSheet.cssRules.length; j++) {
            if (
              (styleSheet.cssRules[j] as any).selectorText
                ?.split(' ')
                // 移除选择器前缀
                .map(selector => selector.replace(/[.,]/, ''))
                .some(className => classNameSet.has(className))
            ) {
              styles += styleSheet.cssRules[j].cssText.replace('#test-manager', '') + '\n';
            }
          }
        } catch (error) {
          console.error('Cannot access stylesheet: ' + error);
        }
      }

      const styleElement = document.createElement('style');
      styleElement.type = 'text/css';
      styleElement.innerHTML = styles;
      styleElement.id = 'inline-insert-style';
      copyNode.querySelector('head').appendChild(styleElement);

      const copyReportBodyNode = document
        .querySelector('#report-body')
        .cloneNode(true) as HTMLElement;

      copyReportBodyNode.querySelector('#report-iframe').innerHTML =
        copyNode.querySelector('body').innerHTML;
      copyNode.querySelector('body').innerHTML = copyReportBodyNode.outerHTML;

      return copyNode;
    };

    // 调整节点样式
    const adjustNodeStyle = async copyNode => {
      const style = document.createElement('style');
      style.type = 'text/css';
      style.innerHTML = `
        #report-body {
          overflow: hidden;
        }
        #report-iframe > div {
          width: 100%;
        }
        .gitee-loader-back {
          display: none !important;
        }
      `;
      style.id = 'insert-adjust-style';
      copyNode.querySelector('head').appendChild(style);
      return copyNode;
    };

    const copyNode = await pruneDOMNode('.react-grid-layout')
      .then(replaceCanvasNodeWithImage)
      .then(downloadLinkContentIntoStyle)
      .then(wrapLayoutWithTestReport)
      .then(adjustNodeStyle);

    return copyNode.outerHTML;
  };

  const HTMLString = await getExportIFrameHTMLString();
  const a = document.createElement('a');
  const blob = new Blob([HTMLString], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = `${testReportData?.name ?? document.title}.html`;
  a.click();
  URL.revokeObjectURL(url);
};
