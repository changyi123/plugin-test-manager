import { LibraryProvider } from '@giteeteam/apps-team-components';
import { useListener } from '@giteeteam/proxima-sdk-js';
import dayjs from 'dayjs';
import { AutoResizer, BaseTable, Column, Pagination, Spin } from 'insight';
import { cloneDeep, omit } from 'lodash';
import { SingleEvents } from 'proxima-event';
import { NoData } from 'proxima-sdk/components/Components/Chart';
import { useI18n, useToken } from 'proxima-sdk/hooks/Hooks';
import { mergeIQL, withOrderBy, withWorkspace } from 'proxima-sdk/lib/Iql';
import { IQLParams } from 'proxima-sdk/lib/types/iql';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RecoilRoot } from 'recoil';

import useQuery from '@/lib/hooks/useQuery';

import AntdConfigProvider from '../common/AntdConfigProvider';
import { getRenderByCustomColumn } from '../common/TabelCell';
import { CHANGE_PAGE, DEFAULT_SHOW_FIELDS } from '../lib/global';
import useBaseTableColumns, { useFields } from '../lib/hooks/useBaseTableColumns';
import useCacheColumns from '../lib/hooks/useCacheColumns';
import { useDataQuoteStore } from '../lib/hooks/useDataQuote';
import { useItemUpdate } from '../lib/hooks/userItemUpdate';
import { ViewProps } from '../lib/type';
import { getEnvData } from '../lib/util';
import { isValidUUID, openNewTabWithoutBubble } from '../lib/util';
import cx from './../common/BaseTableValue.less';

// iql 超过10000条报错，先这里处理
const MAX_TOTAL = 9990;

const View: React.FC<ViewProps> = ({
  chartGroupId,
  uid,
  option,
  isListView,
  workspace,
  usefulFields: originUsefulFields,
  setEnableSave,
  displayContext,
}) => {
  const { t } = useI18n();
  const { pageSize = 10, globalFiltersIql, iql } = option;
  const [pageIndex, setPageIndex] = useState(1);
  const [total, setTotal] = useState(0);
  const { tenant, sessionToken } = useToken();
  const { PROXIMA_GATEWAY, PROXIMA_BASE_PATH, PROXIMA_APP_ID } = getEnvData();

  const { columnKeys = DEFAULT_SHOW_FIELDS } = option;

  const usefulFields = useFields(originUsefulFields);
  const { selectedColumns } = useBaseTableColumns(usefulFields, columnKeys);
  console.info('selectedColumns', selectedColumns);

  const iqlParams = useMemo<IQLParams>(() => {
    let queryIql = withOrderBy(withWorkspace(iql, workspace));
    queryIql = mergeIQL(queryIql, '"类型" in ["测试执行（内置）"]');
    if (globalFiltersIql) {
      queryIql = mergeIQL(queryIql, globalFiltersIql);
    }
    const params: Record<string, any> = {
      iql: queryIql,
      size: pageSize,
      from: (pageIndex - 1) * pageSize,
      timezone: dayjs().format('ZZ'),
    };

    if (displayContext) {
      params.displayContext = displayContext;
    }

    return params;
  }, [iql, workspace, globalFiltersIql, pageSize, displayContext, pageIndex]);

  // chartKey 作为 local 里的 key 来存储列宽
  const chartKey = isValidUUID(uid) ? 'default' : uid;
  const { cacheColumnWidth, updateColumnWidth, columnResizeEnd } = useCacheColumns(
    chartGroupId,
    chartKey,
  );

  // 非 name 列的宽度获取
  const customColumnWidth = useCallback(
    (customColumn): number => {
      return cacheColumnWidth?.[customColumn.key] || (isListView ? 90 : 110);
    },
    [cacheColumnWidth, isListView],
  );

  //  查询事项
  const url = `${PROXIMA_GATEWAY}/api/app/${PROXIMA_APP_ID}/test_manager/webhooks/api-query-run-records`;
  const {
    result,
    mutate,
    isLoading: loading,
  } = useQuery({
    url,
    params: iqlParams,
    enableFetch: !!iql,
  });

  useItemUpdate(sessionToken, mutate);

  useEffect(() => {
    if (!loading) {
      setTotal(result?.total);
    }
  }, [result?.total, setTotal, loading]);

  useEffect(() => {
    if (setEnableSave) {
      setEnableSave(true);
    }
  }, [setEnableSave]);

  useEffect(() => {
    const handleEventListener = () => {
      // 当option的页数变化，重置pageIndex=1
      setPageIndex(1);
    };
    SingleEvents.getInstance().on(CHANGE_PAGE, handleEventListener);
    return () => {
      SingleEvents.getInstance().un(CHANGE_PAGE, handleEventListener);
    };
  }, [setPageIndex]);

  // 监听 app 关闭 ChartDetail，更新列宽
  useListener('updateChartColumnWidth', ({ groupId, chartKey: chartId }) => {
    if (chartGroupId === groupId && chartKey === chartId) {
      updateColumnWidth(groupId, chartKey);
    }
  });

  const dataSource = useMemo(() => {
    let data = [];
    if (result?.list?.length) {
      const tempItems = cloneDeep(result.list);
      data = tempItems.map(each =>
        Object.assign(each, omit(each.values, ['workspace', 'itemType', 'status'])),
      );
    }
    return data;
  }, [result?.list]);

  useDataQuoteStore(dataSource);

  const columns = useMemo(() => {
    if (selectedColumns?.length) {
      return [
        ...selectedColumns.map(({ ...customColumn }: any) => {
          return getRenderByCustomColumn({
            customColumn,
            customColumnWidth,
            tenant,
          });
        }),
      ];
    }
  }, [selectedColumns, customColumnWidth, tenant]);

  const LoadingLayer = () => {
    if (!result?.list && loading) {
      return (
        <div className={cx('loading-layer-wrapper')}>
          <Spin />
        </div>
      );
    }
    return null;
  };

  const p = useMemo(
    () => (
      <AntdConfigProvider>
        <Pagination
          className={cx('footer-pagination')}
          current={pageIndex}
          pageSize={pageSize}
          onChange={page => {
            setPageIndex(page);
          }}
          size="small"
          total={total}
          showTotal={total => t('reportPlugin.common.pagination.total', { total })}
          showQuickJumper
          showSizeChanger={false}
        />
      </AntdConfigProvider>
    ),
    [t, pageIndex, pageSize, total],
  );

  const noDataTitle = total
    ? t('reportPlugin.common.view.limitData')
    : t('reportPlugin.common.view.noData');

  return (
    <LibraryProvider
      tenant={tenant}
      teamBasePath={PROXIMA_BASE_PATH}
      teamGateway={PROXIMA_GATEWAY}
      workspaceKey={workspace}
      datetimeFormat={'absolute'}
    >
      {!result?.list || (loading && !dataSource?.length) ? (
        <LoadingLayer />
      ) : dataSource?.length && total <= MAX_TOTAL ? (
        <div
          className={isListView ? cx('view') : cx('detail-view')}
          onClick={e => {
            openNewTabWithoutBubble(e, null);
          }}
        >
          <AutoResizer>
            {({ width, height }) => (
              <BaseTable
                // 事项列表组件关闭虚拟滚动
                overscanRowCount={pageSize}
                fixed
                width={width}
                height={height}
                rowHeight={32.5}
                headerHeight={30}
                rowKey="objectId"
                data={dataSource}
                footerHeight={60}
                footerRenderer={p}
                disabled={loading}
                overlayRenderer={LoadingLayer}
                onColumnResizeEnd={resize => columnResizeEnd(resize)}
              >
                {columns !== undefined
                  ? columns.map(column => <Column key={column.key} resizable {...column} />)
                  : null}
              </BaseTable>
            )}
          </AutoResizer>
        </div>
      ) : (
        <NoData title={noDataTitle} isListView={isListView} />
      )}
    </LibraryProvider>
  );
};

const RecoilView: React.FC<ViewProps> = ({
  chartGroupId,
  uid,
  option,
  workspace,
  usefulFields,
  setEnableSave,
  displayContext,
}) => {
  console.info('View', {
    chartGroupId,
    uid,
    option,
    workspace,
    usefulFields,
    displayContext,
  });
  return (
    <RecoilRoot>
      <View
        chartGroupId={chartGroupId}
        uid={uid}
        option={option}
        isListView
        workspace={workspace}
        usefulFields={usefulFields}
        setEnableSave={setEnableSave}
        displayContext={displayContext}
      />
    </RecoilRoot>
  );
};

export default RecoilView;
