import * as echarts from 'echarts';
import fetch from '@/lib/utils/fetch';
import { createReport } from 'docx-templates';
import { WordTemplate } from '@/lib/types/Test';
import { UserOptions } from 'docx-templates/lib/types';
import { mergeWith, isPlainObject, keyBy } from 'lodash';
import { NullishCommandResultError, ObjectCommandResultError } from 'docx-templates/lib/errors';

// Buffer polifile
window.Buffer = window.Buffer || require('buffer').Buffer;

/** 插件请求前缀 */
const PluginWebTriggerPrefix = '/api/app/osc/test_manager/webhooks';
const DefaultImageOptions = {
  width: 12,
  height: 9,
  extension: '.png',
};
export default class TemplateGenerator {
  /** 导致模板编译失败错误 */
  fatalErrorMessageList: string[] = [];
  /** 模板引用变量未定义错误 */
  invalidVariableMessageList: string[] = [];

  /** 生成进度 */
  processPercent: 0;

  /** 测试模板数据 */
  wordTemplate: WordTemplate;

  /** 基础配置 */
  private docTemplateBasicOptions: Partial<UserOptions> = {
    cmdDelimiter: ['{', '}'],
    rejectNullish: true,
    noSandbox: true,
    // failFast: false,
    additionalJsContext: {
      // 绘制图表
      drawIMAGEChart: options => {
        const { imageOptions: incomingImageOptions, ...restChartOptions } = options;

        const imageOptions = {
          ...DefaultImageOptions,
          ...incomingImageOptions,
        };

        const generateEchartImageData = chartOptions => {
          const div = document.createElement('div');
          (
            div as any
          ).style = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: -9999; opacity: 0;`;
          document.body.appendChild(div);

          const hasRectAttributes = Boolean(
            imageOptions.useCustomSize && imageOptions.width && imageOptions.height,
          );

          // 放大倍率
          const AMP = 100;
          const ChartRectAttributes = hasRectAttributes
            ? {
                width: imageOptions.width * AMP,
                height: imageOptions.height * AMP,
              }
            : {};
          const chart = echarts.init(div, {
            ...ChartRectAttributes,
          });
          // 截图需要关闭动画效果
          chart.setOption(Object.assign(chartOptions, { animation: false }));

          const dataURL = chart.getDataURL({
            type: 'png',
            // pixelRatio: 2,
          });
          const data = dataURL.slice('data:image/png;base64,'.length);
          div.remove();
          return data;
        };

        return {
          ...DefaultImageOptions,
          ...imageOptions,
          data: generateEchartImageData(restChartOptions),
        };
      },

      //TODO: 针对复杂样式的表格（单元格合并，动态列）使用 html 形式渲染 table
      injectHTMLTable: options => {
        const { columns, dataSource } = options;
        const Table = document.createElement('table');
        const THead = document.createElement('thead');

        const TableGenerators = {
          _setAttribute: (dom, options) => {
            const { colspan, rowspan, name } = options;
            dom.setAttribute('colspan', colspan);
            dom.setAttribute('rowspan', rowspan);
            dom.innerHTML = name;
          },

          tr: (options, container) => {
            const tr = document.createElement('tr');
            TableGenerators._setAttribute(tr, options);
            container.appendChild(tr);
          },

          th: (options, container) => {
            const th = document.createElement('th');
            TableGenerators._setAttribute(th, options);
            container.appendChild(th);
          },

          td: (options, container) => {
            const td = document.createElement('td');
            TableGenerators._setAttribute(td, options);
            container.appendChild(td);
          },
        };
      },
    },
    errorHandler: (error, _code) => {
      const isErrorType = errorType =>
        Array.isArray(errorType)
          ? errorType.some(ErrorConstructor => error instanceof ErrorConstructor)
          : error instanceof errorType;

      if (isErrorType([NullishCommandResultError, ObjectCommandResultError])) {
        this.invalidVariableMessageList.push(error.message);
      } else {
        this.fatalErrorMessageList.push(error.message);
      }
      return '';
    },
  };

  constructor(wordTemplateData) {
    this.wordTemplate = wordTemplateData;
  }

  /** 生成测试报告 */
  generateReport = async (
    options: { fileName?: string; testPlanIds: string[] },
    mixTemplateOptions?: Partial<UserOptions>,
  ) => {
    const { fileName = '测试报告', testPlanIds } = options;
    const docTemplateOptions = { ...this.docTemplateBasicOptions, ...mixTemplateOptions };
    const fileUrl = this.wordTemplate.file.url;
    if (!fileUrl) return;

    const templateFile = await fetch.$get(fileUrl, {
      responseType: 'arraybuffer',
    });

    const reportData = await createReport({
      template: templateFile,
      data: async () => {
        const templateData = await this.getTemplateVariables(testPlanIds);
        console.log('templateData', templateData);
        return templateData;
      },
      ...docTemplateOptions,
    });

    // 模板编译错误不生成报告
    if (this.fatalErrorMessageList.length) {
      // throw new Error();
      console.log(this.fatalErrorMessageList);
    }

    // 忽略该类型错误
    if (this.invalidVariableMessageList) {
      console.error('');
    }

    this.saveWordFile(reportData, fileName);
  };

  /** 获取模板数据集合 */
  private getTemplateVariables = async (testPlanIds: string[]) => {
    // 获取统计数据
    const statsData = await fetch.$post(`${PluginWebTriggerPrefix}/report-stats`, {
      testPlanIds,
    });
    // TODO: 从 data-set 中获取项目配置，目前写死
    // 'extensions-huishang'
    const DataSetSourcePath = ['base', 'extensions-huishang'] as const;
    const dataSetFetchQueue = DataSetSourcePath.map(source =>
      fetch.$post(`${PluginWebTriggerPrefix}/report-data-${source}`, statsData),
    );

    const dataSetList = await Promise.all(dataSetFetchQueue);

    const mergedDataSetVariables = mergeWith(
      dataSetList[0],
      ...dataSetList.slice(1),
      (objValue, srcValue) => {
        const isPlainObjectTypedArray = arr => arr.every(item => isPlainObject(item));
        // 数组对象需要按照相同项的 key 合并
        if (
          Array.isArray(objValue) &&
          Array.isArray(srcValue) &&
          isPlainObjectTypedArray(objValue) &&
          isPlainObjectTypedArray(srcValue)
        ) {
          const sourceKeyMap = keyBy(srcValue, 'key');
          return objValue.map((item, index) => ({
            // 列表默认加上序号
            _seqNumber: index + 1,
            ...item,
            ...sourceKeyMap[item.key],
          }));
        }
      },
    );

    return mergedDataSetVariables;
  };

  /** 下载 word 文档至本地 */
  private saveWordFile = (data, fileName) => {
    const DocMIMEType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const downloadUrl = data => {
      const a = document.createElement('a');
      a.href = data;
      a.download = fileName;
      (a as any).style = 'display: none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    const blob = new Blob([data], {
      type: DocMIMEType,
    });

    const url = window.URL.createObjectURL(blob);
    downloadUrl(url);

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
  };
}
