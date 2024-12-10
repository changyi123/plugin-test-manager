import { Button, Dropdown, message, Space } from 'antd';
import { StatusCell } from 'apps-team-components-v1';
import { RepositoryTreePayload } from 'common/types/api';
import * as echarts from 'echarts';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { ArrowLeftOutlined } from '@/icons';
import { getRepositoryTreeV2, runScript } from '@/lib/api/item';
import { search } from '@/lib/api/proxima';
import { getAppEnv } from '@/lib/appEnv';
// import { featureFlags, SupportFeatureFlags } from '@/lib/appEnv';
import { exportWithDocxV2, genChartGroupPageUrl } from '@/lib/testReport';
import fetch from '@/lib/utils/fetch';
import { getPluginWebTriggerBaseUrl } from '@/lib/utils/helper';
import { Chart, ChartGroup } from '@/services/models';
import { useTestReportV2ByObjectId } from '@/services/testReport/query';

import { useReportOverviewDisplayText } from './hook';
import cx from './index.less';
import Refresh from './Refresh';
import TestIframe from './TestIframe';

const exFuncMap = {
  word: exportWithDocxV2,
};

const ReportView: React.FC = () => {
  const iframeRef = useRef(null);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [exportButtonEnabled, setExportButtonEnabled] = React.useState(false);
  const slotData = useRef(null);

  const searchParams = new URLSearchParams(window.location.search);
  const testReportId = searchParams.get('testReportId');
  const redirectLink = decodeURIComponent(searchParams.get('redirectLink') || '');
  const workspaceKey = searchParams.get('workspaceKey');
  const workspaceName = searchParams.get('workspaceName');
  const workspace = useMemo(() => {
    if (workspaceKey && workspaceName) {
      return { key: workspaceKey, name: workspaceName };
    }
  }, [workspaceKey, workspaceName]);

  const { data, refetch } = useTestReportV2ByObjectId(testReportId);
  useEffect(() => {
    const setSlotData = async groupId => {
      const getTestChart = async () => {
        const xData = [];
        const yData = [];
        const charts = await new Parse.Query(Chart)
          .equalTo('chartGroup', ChartGroup.createWithoutData(groupId))
          .equalTo('view', 'basic-test-manager-case-statistics')
          .find({ json: true });
        if (!charts.length) return;
        const div = document.createElement('div');
        (
          div as any
        ).style = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -9999; opacity: 0;`;
        document.body.appendChild(div);
        let echart = echarts.init(div, null, {
          ssr: true,
          width: 800,
          height: 450,
        });
        const replaceChartData = async chart => {
          const iql = chart.option.iql;
          if (!iql) return;
          const { data: repositories } = await getRepositoryTreeV2({
            params: { selector: iql },
            workspaceKey,
          } as unknown as RepositoryTreePayload);
          const chartDataMap = {} as Record<string, { name: string; count: number }>;
          const handleRepo = repo => {
            const { counts, parentKey, name, key } = repo;
            if (!parentKey) {
              chartDataMap[key] = { count: counts[0], name: '未分组' };
            } else {
              chartDataMap[key] = {
                count: counts[0],
                name: `${parentKey === 'root' ? '' : `${chartDataMap[parentKey].name}/`}${name}`,
              };
            }

            if (repo.children?.length) {
              repo.children.map(handleRepo);
            }
          };

          handleRepo(repositories);
          const list = [];
          Object.values(chartDataMap).forEach(i => {
            const names = i.name.split('/');
            if (i?.count) {
              list.push(i);
              xData.push(names[names.length - 1]);
              yData.push(i.count);
            }
          });
          const basicOption = {
            animation: false,
            color: [
              '#4B8BFF',
              '#36B37E',
              '#FFC400',
              '#2EC7C9',
              '#B6A2DE',
              '#5AB1EF',
              '#FFB980',
              '#D87A80',
              '#8D98B3',
              '#E5CF0D',
              '#97B552',
              '#95706D',
              '#91B6F8',
              '#DC69AA',
              '#07A2A4',
              '#9A7FD1',
              '#588DD5',
              '#F5994E',
              '#FF95AD',
              '#9096BB',
              '#D5B394',
            ],
            barMaxWidth: 30,
            xAxis: {
              show: true,
              type: 'category',
              data: xData,
              axisLabel: {
                show: true,
                rotate: 30,
              },
            },
            yAxis: {
              show: true,
              type: 'value',
              axisLabel: {
                show: true,
              },
            },
            series: [
              {
                data: yData,
                type: 'bar',
                label: {
                  show: true,
                  position: 'top',
                  distance: 20,
                  textStyle: {
                    color: 'black',
                  },
                },
              },
            ],
            label: {
              show: true,
              // rotate: 70,
              position: 'top',
              // 距离图形元素的距离,当 position 为字符描述值（如 'top'、'insideRight'）时候有效
              distance: 20,
              verticalAlign: 'middle',
              // 数值样式
              textStyle: {
                color: 'black',
              },
            },
          };
          echart.setOption(basicOption);
          const dataURL = echart.getDataURL({
            type: 'png',
            // pixelRatio: 2,
          });
          const data = dataURL.slice('data:image/png;base64,'.length);
          return {
            name: chart.name,
            list,
            chart: {
              // 单位是 cm。px 转换 cm 转换需要除 100
              width: 16,
              height: 9,
              data,
              extension: '.png',
            },
          };
        };
        const chartsData = await Promise.all(charts.map(replaceChartData));
        echart.dispose();
        div.remove();
        echart = null;
        return chartsData.filter(Boolean).reduce(
          (slotData, chartData) => ({
            ...slotData,
            [chartData.name]: chartData.list,
            [`${chartData.name}_chart`]: chartData.chart,
          }),
          {},
        );
      };
      const getExtensionSlotData = async () => {
        const webKey = getAppEnv('EXTENSION_SLOT_DATA_WEB_KEY');
        if (!webKey) return {};
        return (await fetch.$post(`${getPluginWebTriggerBaseUrl()}/${webKey}`, data))?.data ?? {};
      };
      slotData.current = {
        link: window.location.href,
        report: data.report,
        ...(await getTestChart()),
        ...(await getExtensionSlotData()),
      };
    };
    const groupId = data?.report?.reportChartGroup;
    groupId && setSlotData(groupId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.report?.reportChartGroup]);

  const { t } = useTranslation();
  // 后退
  const goBack = () => {
    window.open(redirectLink, '_self');
  };

  const handleExportButtonClick = async type => {
    setExportLoading(true);
    const cancelLoading = message.loading(t('report.downloadingReport'));
    const exportFunc = exFuncMap[type];
    if (data?.template?.validateScript) {
      try {
        await runScript(data.report, data.template.validateScript);
      } catch (e) {
        console.error(e);
        cancelLoading();
        setExportLoading(false);
        return;
      }
    }

    let fileName = data?.report?.name;
    const zgcConfig = getAppEnv('ZGC_CONFIG');
    const defaultNameConfig = getAppEnv('CREATE_EXECUTION_DEFAULT_NAME_CONFIG');
    const enable = defaultNameConfig?.enable;
    if (zgcConfig && enable) {
      const uniq = list => (Array.isArray(list) ? [...new Set(list ?? [])] : list);

      let versionName;
      const testTimes = await search(
        `id in ${JSON.stringify(data.report.reportOverviewData?.testExecution)}`,
        [zgcConfig.测试阶段, 'version'],
      ).then(async testList => {
        const testTimes = [];
        testTimes.push(
          ...uniq(testList.flatMap(test => test.values[zgcConfig.测试阶段]).filter(Boolean)),
        );
        versionName = uniq(testList.flatMap(test => test.values?.version?.[0]?.name))
          .filter(Boolean)
          .join('_');
        return testTimes;
      });

      const testTimesString = testTimes.join('&').replace(/&+$/, '');

      fileName =
        '北京中关村银行' +
        '_' +
        workspaceName +
        '_' +
        versionName +
        '_' +
        testTimesString +
        ' ' +
        '测试报告';
    }
    await exportFunc({
      name: fileName,
      reportChartGroup: data?.report?.reportChartGroup,
      reportTemplate: data?.template?.reportTemplate?.objectId,
      slotData: slotData.current,
    }).finally(() => {
      cancelLoading();
      setExportLoading(false);
    });
  };

  const handleIframeLoad = event => {
    const isAllChartViewLoaded = async () => {
      const getChartViewIfLoaded = () => {
        return new Promise(resolve => {
          let times = 0;
          const timer = setInterval(() => {
            times++;
            const chartViews = event.target.contentDocument.querySelectorAll(
              '[data-element-id="chart-view"]',
            );
            if (times > 500) return resolve([]);
            if (chartViews.length > 0) {
              resolve(chartViews);
              clearInterval(timer);
            }
          }, 500);
        });
      };
      return new Promise(resolve => {
        const runner = async () => {
          let loadedCount = 0;

          const chartViews = (await getChartViewIfLoaded()) as any;
          chartViews.forEach(ele => {
            if (ele.lastChild) {
              loadedCount++;
              // 已经存在子元素，不需要监听，等接口加载后（约 500ms） 直接 resolve
              if (loadedCount >= chartViews.length) {
                setTimeout(() => {
                  resolve(true);
                }, 500);
              }
            } else {
              setTimeout(() => {
                loadedCount++;
                if (loadedCount >= chartViews.length) {
                  setTimeout(() => {
                    resolve(true);
                  }, 500);
                }
              }, 500);
            }
          });
        };
        runner();
      });
    };

    isAllChartViewLoaded().then(() => {
      setTimeout(() => {
        setExportButtonEnabled(true);
        // 延迟 500ms，保证所有图表都加载完成
      }, 500);
    });
  };

  const { data: overviewDisplayText } = useReportOverviewDisplayText(data?.report);

  const refresh = useCallback(async () => {
    await refetch();
    iframeRef.current?.refresh();
  }, [refetch]);

  return (
    <div className={cx('report-box')}>
      <>
        <div className={cx('report-header')}>
          <div className={cx('report-header-title')}>
            {redirectLink && <ArrowLeftOutlined className={cx('icon')} onClick={() => goBack()} />}
            <span className={cx('title')}>{data?.report?.name}</span>
          </div>
          <Space>
            {exportButtonEnabled && (
              <>
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'exportWord',
                        label: (
                          <span onClick={() => handleExportButtonClick('word')}>
                            {t('report.exportWord')}
                          </span>
                        ),
                      },
                    ].filter(Boolean),
                  }}
                >
                  <Button loading={exportLoading}>{t('report.export')}</Button>
                </Dropdown>
                {data?.report && (
                  <Refresh report={data.report} workspaceKey={workspaceKey} refresh={refresh} />
                )}
              </>
            )}
          </Space>
        </div>
        <div id="report-body" className={cx('report-body')}>
          <div className={cx('report-overview-wrapper')}>
            <div className={cx('report-overview')}>
              <div className={cx('title')}>
                <div className={cx('info')}>
                  <div className={cx('name')}>{data?.report?.name}</div>
                  <div style={{ marginLeft: `16px` }}>
                    <StatusCell value={data?.report?.workflowStatus} readonly />
                  </div>
                </div>
              </div>
              <div className={cx('content')}>
                {overviewDisplayText?.map((item, index) => (
                  <div className={cx('overview-item')} key={item.key}>
                    <strong className={cx('label')}>{item.label}：</strong>
                    <span className={cx('text')} title={item.text}>
                      {item.text}
                    </span>
                    {index === overviewDisplayText?.length - 1 ? null : (
                      <span className={cx('split')}>|</span>
                    )}
                  </div>
                ))}
              </div>
              <div className={cx('overview')}>{/* TODO 概览信息 */}</div>
            </div>
          </div>

          <div className={cx('report-iframe')} id="report-iframe">
            <TestIframe
              ref={iframeRef}
              onLoad={handleIframeLoad}
              src={genChartGroupPageUrl({
                chartGroupId: data?.report?.reportChartGroup,
                workspace,
              })}
            />
          </div>
        </div>
      </>
    </div>
  );
};

export default React.memo(ReportView);
