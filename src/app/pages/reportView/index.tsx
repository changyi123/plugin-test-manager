import { Button, Dropdown, message, Space } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { ArrowLeftOutlined } from '@/icons';
import { exportWithDocx, exportWithHTML, genChartGroupPageUrl } from '@/lib/testReport';
import { useTestReportByObjectId } from '@/services/testReport/query';

import ReportStatus from '../report/ReportStatus';
import cx from './index.less';
import TestIframe from './TestIframe';

const ReportView: React.FC = () => {
  const [exportLoading, setExportLoading] = React.useState(false);
  const [exportButtonEnabled, setExportButtonEnabled] = React.useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const testReportId = searchParams.get('testReportId');
  const redirectLink = decodeURIComponent(searchParams.get('redirectLink') || '');

  const { data: reportData } = useTestReportByObjectId(testReportId);
  const { t } = useTranslation();
  // 后退
  const goBack = () => {
    window.open(redirectLink, '_self');
  };

  const handleExportButtonClick = async type => {
    setExportLoading(true);
    const cancelLoading = message.loading('正在下载测试报告，情等待');
    const exportFunc = type === 'html' ? exportWithHTML : exportWithDocx;
    await exportFunc(reportData).finally(() => {
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
              clearInterval(timer);
              resolve(chartViews);
            }
          }, 200);
        });
      };
      return new Promise(resolve => {
        const runner = async () => {
          let loadedCount = 0;

          const chartViews = (await getChartViewIfLoaded()) as any;

          chartViews.forEach(ele => {
            const observer = new MutationObserver(mutationsList => {
              // 遍历所有的变化
              for (const mutation of mutationsList) {
                // 如果是子元素的变化
                if (mutation.type === 'childList') {
                  loadedCount++;
                  observer.disconnect();
                  if (loadedCount === chartViews.length) {
                    resolve(true);
                  }
                }
              }
            });

            observer.observe(ele, { childList: true });
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

  return (
    <div className={cx('report-box')}>
      <>
        <div className={cx('report-header')}>
          <div className={cx('report-header-title')}>
            {redirectLink && <ArrowLeftOutlined className={cx('icon')} onClick={() => goBack()} />}
            <span className={cx('title')}>{reportData?.name}</span>
          </div>
          <Space>
            {exportButtonEnabled && (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'exportHTML',
                      label: (
                        <span onClick={() => handleExportButtonClick('html')}>
                          {t('report.exportHTML')}
                        </span>
                      ),
                    },
                    {
                      key: 'exportWord',
                      label: (
                        <span onClick={() => handleExportButtonClick('word')}>
                          {t('report.exportWord')}
                        </span>
                      ),
                    },
                  ],
                }}
              >
                <Button loading={exportLoading}>{t('report.export')}</Button>
              </Dropdown>
            )}
          </Space>
        </div>
        <div id="report-body" className={cx('report-body')}>
          <div className={cx('report-overview')}>
            <div className={cx('title')}>
              <div className={cx('info')}>
                <div className={cx('name')}>{reportData?.name}</div>
                <ReportStatus status={reportData?.reportStatus} />
              </div>
            </div>
            <div className={cx('overview')}>{/* TODO 概览信息 */}</div>
          </div>
          <div className={cx('report-iframe')} id="report-iframe">
            <TestIframe
              onLoad={handleIframeLoad}
              src={genChartGroupPageUrl({ chartGroupId: reportData?.chartGroup?.objectId })}
            />
          </div>
        </div>
      </>
    </div>
  );
};

export default React.memo(ReportView);
