import * as echarts from 'echarts';
import fetch from '@/lib/utils/fetch';
import { createReport } from 'docx-templates';
import { WordTemplate } from '@/lib/types/Test';
import { UserOptions } from 'docx-templates/lib/types';
import { mergeWith, isPlainObject, keyBy } from 'lodash';

/** 插件请求前缀 */
const PluginWebTriggerPrefix = '/api/project/app/osc/test_manager/webhooks/';

export default class TemplateGenerator {
  /** 导致模板编译失败错误 */
  fatalErrorMessageList: string[];
  /** 模板引用变量未定义错误 */
  invalidVariableMessageList: string[];

  /** 生成进度 */
  processPercent: 0;

  /** 测试模板数据 */
  wordTemplate: WordTemplate;

  /** 基础配置 */
  private docTemplateBasicOptions: Partial<UserOptions> = {
    cmdDelimiter: ['{', '}'],
    rejectNullish: true,
    noSandbox: true,
    failFast: false,
    additionalJsContext: {
      // 绘制图表
      drawChart: options => {
        const { imageOptions = {}, ...restChartOptions } = options;

        const generateEchartImageData = chartOptions => {
          const div = document.createElement('div');
          (
            div as any
          ).style = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: -9999; opacity: 0;`;
          document.body.appendChild(div);
          const chart = echarts.init(div);
          // 截图需要关闭动画效果
          chart.setOption(Object.assign(chartOptions, { animation: false }));

          const dataURL = chart.getDataURL({
            type: 'png',
            pixelRatio: 2,
          });
          const data = dataURL.slice('data:image/png;base64,'.length);
          div.remove();
          return data;
        };

        return { ...imageOptions, data: generateEchartImageData(restChartOptions) };
      },

      // 渲染 html
      renderHTML: htmlString => {
        // TODO: 处理保留标签
        return htmlString;
      },
    },
    errorHandler: (error, code) => {
      // TODO: 异常处理
      switch (code) {
        case 'NullishCommandResultError': // 空值处理错误
        case 'ObjectCommandResultError': // 插入 object 对象错误
          this.invalidVariableMessageList.push(error.message);
          return '';
        default:
          this.fatalErrorMessageList.push(error.message);
      }
    },
  };

  constructor() {}

  /** 生成测试报告 */
  generateReport = async (
    options: { fileName?: string; testPlanIds: string[] },
    mixTemplateOptions?: Partial<UserOptions>,
  ) => {
    const { fileName = '测试报告', testPlanIds } = options;
    const docTemplateOptions = { ...this.docTemplateBasicOptions, ...mixTemplateOptions };
    // FIXME:
    const fileUrl =
      this.wordTemplate?.fileUrl ?? 'http://192.168.48.34/parse/files/osc/template.docx';

    const { data: templateFile } = await fetch.$get(fileUrl, {
      responseType: 'arraybuffer',
    });

    const templateVariables = await this.getTemplateVariables(testPlanIds);

    const reportData = await createReport({
      template: templateFile,
      data: templateVariables,
      ...docTemplateOptions,
    });

    // 模板编译错误不生成报告
    if (this.fatalErrorMessageList.length) {
      throw new Error();
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
    const statsData = await fetch.$get(`${PluginWebTriggerPrefix}/report/stats`, {
      data: { testPlanIds },
    });
    // TODO: 从 data-set 中获取项目配置，目前写死
    const DataSetSourcePath = ['base/data', 'hs/data'] as const;
    const dataSetFetchQueue = DataSetSourcePath.map(source =>
      fetch.$get(`${PluginWebTriggerPrefix}/report/${source}`, {
        data: statsData,
      }),
    );

    const dataSetList = await Promise.all(dataSetFetchQueue);

    const mergedDataSetVariables = mergeWith(
      dataSetList[0],
      dataSetList.slice(1),
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
          return objValue.map(item => ({
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
