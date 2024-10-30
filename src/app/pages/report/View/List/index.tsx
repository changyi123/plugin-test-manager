import { useListener } from '@projectproxima/proxima-sdk-js';
import useDebounce from 'ahooks/lib/useDebounce';
import { Button, Dropdown, Form, Input, message, Modal, Pagination } from 'antd';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import type { BusinessTableActionType } from '@/components/common/BusinessTable/type';
import SearchInput from '@/components/common/FilterSearch/SearchInput';
import { BusinessTable } from '@/components/dynamicComponents';
import { MaxInputNameLength, TestType } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { genReportViewUrl } from '@/lib/testReport';
import { actionConfirm, getRootContainer } from '@/lib/utils/helper';
import { TestReport } from '@/services/models';
import { useWorkspaceReportListQuery } from '@/services/testReport/query';

import ReportLinkPlan from '../../ReportLinkPlan';
import ReportStatus from '../../ReportStatus';
import SendReportModal, { ActionType } from '../../SendReportModal';
import cx from './index.less';

const PaginationFooterRender: React.FC<any> = ({
  showPagination,
  limit,
  offset,
  total,
  setOffset,
  setLimit,
}) => {
  const { t } = useI18n();
  if (!showPagination) return null;
  const handlePaginationChange = (current, pageSize) => {
    limit !== pageSize && setLimit(pageSize);
    current !== offset && setOffset(current);
  };

  return (
    <div className={`${cx('report-footer')}`}>
      <div className={cx('num')}>
        {t('common.tableTotal.0')} <span>{total}</span> {t('common.tableTotal.1')}
      </div>
      <Pagination
        size="small"
        showSizeChanger={true}
        className={cx('pagination')}
        pageSizeOptions={[10, 20, 50]}
        defaultPageSize={limit}
        current={offset}
        total={total}
        onChange={handlePaginationChange}
      />
    </div>
  );
};

const List: React.FC<any> = () => {
  const { t } = useI18n();
  const { workspace } = useTestConfig();
  const [renameForm] = Form.useForm();
  const [open, setOpen] = useState(false);

  const sendReportModalRef = useRef<ActionType>();
  const [limit, setLimit] = useState<number>(10);
  const [offset, setOffset] = useState<number>(1);
  const [searchName, setSearchName] = useState<string>('');

  const name = useDebounce(searchName, { wait: 500 });

  const {
    data: { results: dataSource, count: total },
    isLoading,
    refetch,
  } = useWorkspaceReportListQuery({
    workspace: workspace?.objectId,
    name,
    pagination: { limit, offset: (offset - 1 || 0) * limit },
    order: {
      desc: ['createdAt'],
    },
  });

  const goReportViewPage = testReportId => {
    window.open(genReportViewUrl({ testReportId, workspace }), '_blank');
  };

  useListener('refreshTestReportTable', testReportId => {
    if (!testReportId) return;
    refetch?.();
    goReportViewPage(testReportId);
  });

  const onChangeInput = useCallback(
    val => {
      setSearchName(val);
    },
    [setSearchName],
  );

  const renameModalProps = useMemo(
    () => ({
      icon: null,
      width: 500,
      getContainer: getRootContainer,
      title: t('report.buttons.rename'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      destroyOnClose: true,
      children: (
        <Form form={renameForm} layout="vertical">
          <Form.Item
            label={t('report.reportName')}
            name="name"
            rules={[
              {
                max: MaxInputNameLength,
                message: t('report.exceedLength'),
              },
              {
                required: true,
                message: t('report.reportNamePlaceholder'),
              },
            ]}
          >
            <Input placeholder={t('report.reportNamePlaceholder')} />
          </Form.Item>
        </Form>
      ),
      onOk: () => {
        renameForm
          .validateFields(['name', 'objectId'])
          .then(async report => {
            setOpen(false);
            const testReport = TestReport.createWithoutData(report.objectId);
            testReport.set('name', report.name);
            await testReport.save();
            message.success(t('report.workspaceReportTemplate.message.renameSuccess'));
            refetch();
          })
          .catch(e => console.info(e.message));
      },
      onCancel: () => setOpen(false),
    }),
    [refetch, renameForm, t],
  );

  const actionRef = useRef<BusinessTableActionType>();
  const columns: any = [
    {
      width: 200,
      key: 'title',
      fixed: true,
      isSystem: true,
      title: t('common.title'),
      render(_, rowData) {
        return (
          <div
            className={cx('test-report-title')}
            onClick={() => goReportViewPage(rowData.objectId)}
          >
            {rowData.name}
          </div>
        );
      },
    },
    {
      key: 'reportStatus',
      title: t('common.status'),
      width: 100,
      render(_, rowData) {
        return <ReportStatus style={{ marginLeft: 0 }} status={rowData?.reportStatus} />;
      },
    },
    {
      key: 'linkPlanId',
      title: t('common.testPlan'),
      width: 200,
      render(_, rowData) {
        return (
          <ReportLinkPlan
            linkPlanId={
              // FIXME: 临时兼容，后期移除 linkPlanId 字段
              rowData?.reportOverviewData?.testPlan ?? rowData?.reportOverviewData?.linkPlanId
            }
          />
        );
      },
    },
    {
      key: 'action',
      title: t('common.action'),
      isSystem: true,
      fixed: 'right' as any,
      width: 140,
      render(_, rowData) {
        return (
          <>
            <Button
              type="link"
              size="small"
              style={{ paddingLeft: 0 }}
              onClick={() => {
                goReportViewPage(rowData.objectId);
              }}
            >
              {t('report.buttons.view')}
            </Button>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'sendReport',
                    label: (
                      <Button
                        size="small"
                        type="link"
                        onClick={() => sendReportModalRef.current.open(rowData.objectId)}
                      >
                        {t('report.buttons.sendReport')}
                      </Button>
                    ),
                  },
                  {
                    key: 'rename',
                    label: (
                      <Button
                        size="small"
                        type="link"
                        onClick={() => {
                          renameForm.setFieldsValue(rowData);
                          setOpen(true);
                        }}
                      >
                        {t('report.buttons.rename')}
                      </Button>
                    ),
                  },
                  {
                    key: 'delete',
                    label: (
                      <Button
                        danger
                        type="link"
                        size="small"
                        onClick={async () => {
                          actionConfirm(
                            {
                              title: t('common.tip'),
                              okText: t('common.okText'),
                              cancelText: t('common.cancel'),
                              content: <span>{t('report.deleteTip1')}</span>,
                            },
                            async () => {
                              const testReport = new TestReport();
                              await testReport.delete(rowData.objectId);
                              message.success(
                                t('report.workspaceReportTemplate.message.deleteSuccess'),
                              );
                              refetch();
                            },
                          );
                        }}
                      >
                        {t('report.buttons.delete')}
                      </Button>
                    ),
                  },
                ],
              }}
            >
              <Button type="link">{t('report.buttons.more')}</Button>
            </Dropdown>
          </>
        );
      },
    },
  ];

  return (
    <div className={cx('report-list')}>
      <div className={cx('report-header')}>
        <SearchInput
          onChange={onChangeInput}
          placeholder={t('components.common.filterSearch.screenPlaceholder')}
          value={searchName}
        />
      </div>
      {workspace?.key && (
        <BusinessTable
          titleCellOption={{
            workspaceKey: workspace?.key,
            testType: TestType.Report,
            isHideIcon: true,
          }}
          defaultColumnKey={['reportStatus', 'linkPlanId', 'createdBy', 'createdAt']}
          privateColumnKey={['reportStatus', 'linkPlanId']}
          useColumnSetting
          rowKey="objectId"
          name={`${workspace?.key}_test_report`}
          columns={columns}
          actionRef={actionRef}
          loading={isLoading}
          dataSource={dataSource}
          PaginationFooterRender={() => (
            <PaginationFooterRender
              showPagination={true}
              limit={limit}
              offset={offset}
              total={total}
              setLimit={setLimit}
              setOffset={setOffset}
            />
          )}
        />
      )}
      <SendReportModal actionRef={sendReportModalRef} />
      <Modal {...renameModalProps} open={open} />
    </div>
  );
};

export default List;
