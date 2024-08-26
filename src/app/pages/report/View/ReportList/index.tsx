import { useMemoizedFn, useRequest } from 'ahooks';
import { Button, Dropdown, message } from 'antd';
import { uniq } from 'lodash';
import { components } from 'proxima-sdk';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import type { BusinessTableActionType } from '@/components/common/BusinessTable/type';
import FilterSearch from '@/components/common/FilterSearch';
import { getFilterFields } from '@/components/common/FilterSearch/utils';
import { BusinessTable } from '@/components/dynamicComponents';
import { EditIcon } from '@/icons';
import { deleteTestEntity, getTestEntityByQuery } from '@/lib/api/item';
import { useCurrentUser } from '@/lib/api/user';
import { getCurrentUserSetting, saveUserSetting } from '@/lib/api/userSetting';
import { SystemField, TestType } from '@/lib/constants';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { actionConfirm, goToItemDetailPage } from '@/lib/utils/helper';
import { usePageContext } from '@/pages/plan/hook';

const { ItemIcon } = components.Components.Common;

import { useListener } from '@giteeteam/proxima-sdk-js';

import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import { genReportViewUrl } from '@/lib/testReport';

import SendReportModal, { ActionType } from '../../SendReportModal';
import HeaderV2 from '../HeaderV2';
import cx from './index.less';

const TestReportList: React.FC<any> = () => {
  const { t } = useI18n();
  const sendReportModalRef = useRef<ActionType>();
  const actionRef = React.useRef<BusinessTableActionType>();
  const { workspace } = useTestConfig();
  const { testReportFieldKeys } = useBaseAction();
  const { workspaceKey } = usePageContext();
  const [selectors, setSelectors] = useState([{}, {}]);
  const [tableLoading, setTableLoading] = useState(false);
  const { data: currentUser } = useCurrentUser();

  const detailSearchRef = useRef(null);

  const queryDeps = useMemo(
    () => [workspaceKey, ...(testReportFieldKeys || []), JSON.stringify(selectors)].join('_'),
    [workspaceKey, testReportFieldKeys, selectors],
  );

  const tableDataGetter = useCallback(
    async (queryParams, tableFields) => {
      if (!workspaceKey || !tableFields?.length)
        return {
          list: [],
          total: 0,
        };
      setTableLoading(true);

      const { list, total } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Report,
        },
        fields: uniq(
          ['id', SystemField.ItemType].concat(
            SystemFieldKeys,
            tableFields.map(i => i.key).filter(i => i !== 'action'),
          ),
        ),
        selector: selectors,
        notConcatField: true,
        ...queryParams,
      });

      setTableLoading(false);

      return {
        list:
          list.map(i => ({
            ...i,
            status: i.workflowStatus,
          })) ?? [],
        total: total ?? 0,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryDeps],
  );

  const { data: currentFields } = useRequest(
    async () => {
      return await getCurrentUserSetting({
        workspaceKey,
        user: currentUser as unknown as Parse.Pointer,
      });
    },
    {
      refreshDeps: [workspaceKey, currentUser],
    },
  );

  const handleView = data => {
    goToItemDetailPage({
      workspaceKey: data.workspace?.key,
      itemKey: data.key,
    });
  };

  const goReportViewPage = testReportId => {
    window.open(genReportViewUrl({ testReportId, workspace }), '_blank');
  };

  useListener('refreshTestReportTable', testReportId => {
    if (!testReportId) return;
    actionRef.current?.refresh();
    goReportViewPage(testReportId);
  });

  const columns: any[] = [
    {
      width: 300,
      key: 'title',
      fixed: true,
      isSystem: true,
      title: t('common.title'),
      render(_, rowData) {
        return (
          <div className={'test-plan-title-box'} onClick={() => goReportViewPage(rowData.objectId)}>
            {ItemIcon && <ItemIcon className={'icon'} icon={rowData.itemType?.icon}></ItemIcon>}
            <span className={cx('plan-name')}>{rowData.name}</span>
            <span
              className={cx('plan-table-title-menu')}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <EditIcon
                className={'icon'}
                onClick={() => {
                  handleView(rowData);
                }}
              />
            </span>
          </div>
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
                              await deleteTestEntity([rowData.objectId]);
                              message.success(
                                t('report.workspaceReportTemplate.message.deleteSuccess'),
                              );
                              actionRef.current.refresh();
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

  const handleFilterField = useMemoizedFn(async ({ testType, fieldKeys }) => {
    await saveUserSetting({
      workspaceKey,
      testType,
      filterFields: {
        ...(currentFields?.filterFields ?? {}),
        [testType]: fieldKeys,
      },
    });
    await actionRef.current.refresh();
  });

  return (
    <div className={cx('test-plan-container')}>
      <div className={cx('plan-header')}>
        <HeaderV2 />
        <div className={cx('plan-header-slot')}>
          <FilterSearch
            enableLocalStorage
            workspaceKey={workspaceKey}
            className={cx('test-manager-filter')}
            ref={detailSearchRef}
            fields={getFilterFields([].concat(SystemFieldKeys, testReportFieldKeys))}
            extendFields={[]}
            onSearch={setSelectors}
            testType={TestType.Report}
          />
        </div>
      </div>
      <BusinessTable
        titleCellOption={{
          workspaceKey,
          testType: TestType.Report,
        }}
        useColumnSetting
        defaultColumnKey={['status', 'assignee', 'createdAt', 'createdBy']}
        privateColumnKey={[]}
        rowKey="objectId"
        columns={columns}
        name={`${workspaceKey}_TestReportTable`}
        actionRef={actionRef}
        loading={tableLoading}
        getDataSource={tableDataGetter}
        handleFilterField={handleFilterField}
      />
      <SendReportModal actionRef={sendReportModalRef} />
    </div>
  );
};

export default TestReportList;
