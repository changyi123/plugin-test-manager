import { useMemoizedFn, useRequest } from 'ahooks';
import { Button, message, notification, Space } from 'antd';
import { uniq } from 'lodash';
import _ from 'lodash';
import { components } from 'proxima-sdk';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import CreatePermission from '@/components/business/Contianer/CreatePermission';
import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import type { BusinessTableActionType } from '@/components/common/BusinessTable/type';
import FilterSearch from '@/components/common/FilterSearch';
import { getFilterFields } from '@/components/common/FilterSearch/utils';
import { BusinessTable } from '@/components/dynamicComponents';
import { EditIcon } from '@/icons';
import { deleteTestEntity, getStatsTestSet, getTestEntityByQuery } from '@/lib/api/item';
import { useCurrentUser } from '@/lib/api/user';
import { getCurrentUserSetting, saveUserSetting } from '@/lib/api/userSetting';
import { SystemField, TestFiledKeyMapping, TestType } from '@/lib/constants';
import { useBaseAction } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
// import Parse from '@/lib/parse';
import { actionConfirm, goToItemDetailPage } from '@/lib/utils/helper';
import { usePageContext } from '@/pages/caseset/components/hook';

import cx from './index.less';

const { ItemIcon } = components.Components.Common;

const TestTaskList: React.FC<any> = ({ listRef }) => {
  const { t } = useI18n();
  const actionRef = React.useRef<BusinessTableActionType>();

  const { createItemUseModal, testCaseSetFieldKeys } = useBaseAction();
  const { workspaceKey, selectedTestCaseSet, setTestCaseSet } = usePageContext();

  const [selectors, setSelectors] = useState([{}, {}]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableSelectionVisible, setTableSelectionVisible] = useState(false);
  // const [hasRowSelected, setHasRowSelected] = useState(false);
  const { data: currentUser } = useCurrentUser();

  const detailSearchRef = useRef(null);

  const queryDeps = useMemo(
    () =>
      [
        workspaceKey,
        ...(testCaseSetFieldKeys || []),
        JSON.stringify(selectors),
        selectedTestCaseSet?.objectId,
      ].join('_'),
    [workspaceKey, testCaseSetFieldKeys, selectors, selectedTestCaseSet?.objectId],
  );

  const handleCreateCaseSet = async () => {
    await createItemUseModal({
      type: TestType.CaseSet,
      extraData: {
        isDisableCreateNext: true,
      },
    });
    setTimeout(() => {
      actionRef.current.refresh();
    }, 500);
    notification.success({
      message: t('components.business.testCaseSetList.addTestCaseSetSuccess'),
    });
  };

  React.useImperativeHandle(listRef, () => ({
    refresh: () => {
      actionRef.current?.refresh(); // 刷新表格
    },
  }));
  const [canSelectCaseIds, setCanSelectCaseIds] = useState([]);

  const tableDataGetter = useCallback(
    async (queryParams, tableFields) => {
      console.info('workspaceKey', workspaceKey);
      if (!workspaceKey || !tableFields?.length) {
        return {
          list: [],
          total: 0,
        };
      }
      setTableLoading(true);
      let res = { list: [], total: 0 };

      res = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.CaseSet,
        },
        fields: uniq(
          ['id', SystemField.ItemType, TestFiledKeyMapping.linkItems].concat(
            SystemFieldKeys,
            tableFields.map(i => i.key).filter(i => i !== 'action'),
          ),
        ),
        selector: selectors,
        notConcatField: true,
        ...queryParams,
      });

      const { list, total } = res;
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

  const onSuccess = useMemoizedFn(async (data, mutate) => {
    const { list = [], total } = data ?? {};
    setCanSelectCaseIds(list.map(i => i.objectId));
    if (!list.length) return;

    const stats = await getStatsTestSet({
      testSetIds: list.map(d => d.objectId),
      select: ['caseCount'],
    });

    mutate({
      total,
      list: _.chain(list)
        .map(testSet => {
          return {
            ...testSet,
            ...stats?.[testSet.objectId],
          };
        })
        .value(),
    });
  });

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

  const columns: any[] = [
    {
      width: 300,
      key: 'title',
      fixed: true,
      isSystem: true,
      title: t('components.business.testCaseSetList.caseSetName'),
      extraProps: {
        onClick: rowData => {
          setTestCaseSet(rowData);
        },
      },
      render(_, rowData) {
        return (
          <div className={'test-plan-title-box'}>
            {ItemIcon && <ItemIcon className={'icon'} icon={rowData.itemType?.icon}></ItemIcon>}
            <span className={cx('plan-name')}>{rowData.name}</span>
            {!tableSelectionVisible && (
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
            )}
          </div>
        );
      },
    },
    {
      key: 'caseCount',
      title: t('components.business.testPlanList.planCaseCount'),
      align: 'right',
      width: 100,
      render(_, rowData) {
        return <span>{rowData?.caseCount}</span>;
      },
    },
    {
      key: 'action',
      isSystem: true,
      title: t('common.action'),
      width: 90,
      fixed: 'right' as any,
      render(_, rowData) {
        return (
          <a
            onClick={() => {
              actionConfirm(
                {
                  title: t('common.tip'),
                  okText: t('common.okText'),
                  cancelText: t('common.cancel'),
                  content: (
                    <>
                      <span>{t('components.business.testSetList.deleteTestCaseSets')}</span>
                    </>
                  ),
                },
                async () => {
                  setTableLoading(true);
                  // todo 暂时不删除用例上面的用例集引用
                  const res = await deleteTestEntity([rowData.objectId]);
                  if (res?.status === 'error') {
                    setTableLoading(false);
                    message.error(res.data);
                    return;
                  }
                  // 删除刷新
                  setTimeout(async () => {
                    await actionRef.current.refresh();
                  }, 500);
                  setTableLoading(false);
                  notification.success({
                    message: t('page.repository.view.list.deleteCaseSetMessageSuccess'),
                  });
                },
              );
            }}
          >
            {t('common.delete')}
          </a>
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

  // todo Config?.enableCaseSnapshot 这个参数干啥用的
  const toggleSelection = useCallback(
    (visible?: boolean) => {
      visible = typeof visible === 'boolean' ? visible : !tableSelectionVisible;
      setTableSelectionVisible(visible);
      actionRef.current.resetSelectedRowKeys();
      actionRef.current.toggleSelection(visible);
    },
    [tableSelectionVisible],
  );

  return (
    <div className={cx('test-plan-container')}>
      <div className={cx('plan-header')}>
        <div className={cx('plan-header-body')}>
          <Space className={cx('header-left')}>{t('common.testCaseSet')}</Space>
          <Space className={cx('header-right')}>
            {!selectedTestCaseSet?.objectId ? (
              <>
                <CreatePermission type={TestType.CaseSet}>
                  <Button
                    type="primary"
                    onClick={async () => {
                      handleCreateCaseSet();
                    }}
                  >
                    {t('common.createTestCaseSet')}
                  </Button>
                </CreatePermission>
              </>
            ) : null}
          </Space>
        </div>
        <div className={cx('plan-header-slot')}>
          <FilterSearch
            enableLocalStorage
            workspaceKey={workspaceKey}
            className={cx('test-manager-filter')}
            ref={detailSearchRef}
            fields={getFilterFields([].concat(SystemFieldKeys, testCaseSetFieldKeys))}
            extendFields={[]}
            onSearch={setSelectors}
            testType={TestType.Execution}
          />
        </div>
      </div>
      <BusinessTable
        titleCellOption={{
          workspaceKey,
          testType: TestType.CaseSet,
        }}
        defaultColumnKey={['createdBy', 'yonglijiText', 'content']}
        privateColumnKey={[]}
        rowKey="objectId"
        useColumnSetting
        columns={columns}
        name={`${workspaceKey}_TestTaskTable`}
        actionRef={actionRef}
        loading={tableLoading}
        getDataSource={tableDataGetter}
        handleFilterField={handleFilterField}
        onSuccess={onSuccess}
        allSelectableRowKeys={canSelectCaseIds}
        onSelectionCancel={() => toggleSelection(false)}
      />
    </div>
  );
};
TestTaskList.displayName = 'TestCaseSetList';
export default TestTaskList;
