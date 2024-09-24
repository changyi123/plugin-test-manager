import { useListener } from '@giteeteam/proxima-sdk-js';
import dayjs from 'dayjs';
import { AutoResizer, BaseTable, Spin } from 'insight';
import { flatten, isEmpty } from 'lodash';
import { NoData } from 'proxima-sdk/components/Components/Chart';
import { OverflowTooltip } from 'proxima-sdk/components/Components/Common';
import { useI18n } from 'proxima-sdk/hooks/Hooks';
import fetch from 'proxima-sdk/lib/Fetch';
import { mergeIQL, withOrderBy, withWorkspace } from 'proxima-sdk/lib/Iql';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnShape } from 'react-base-table';

import { customHeaderRendererForBaseTable } from '../common/TabelCell';
import useCacheColumns from '../lib/hooks/useCacheColumns';
import useQuery from '../lib/hooks/useQuery';
import {
  buildRepositoryStatics,
  buildRepositoryStaticsWithChildren,
  useRepositoryTree,
} from '../lib/hooks/useRepositoryTree';
import useTestConfig from '../lib/hooks/useTestConfig';
import { ViewProps } from '../lib/type';
import { getEnvData, isIncludeTotal, isValidUUID } from '../lib/util';
import cx from './View.less';

const ROW_HEIGHT = 32;

const ROW_WIDTH = 120;

const HIGH_STYLE = {
  background: '#f8faff',
  color: '#0a50d1',
};

type DataType = {
  name: string;
};

function generateStatistics(basicStatistics, fieldValue) {
  if (!basicStatistics[fieldValue]) {
    basicStatistics[fieldValue] = { count: 1 };
    return;
  }
  basicStatistics[fieldValue].count++;
}

function fieldValueFormat(fieldValue) {
  if (typeof fieldValue === 'string') return fieldValue;
  if (Array.isArray(fieldValue)) return fieldValue.join(',');
}

async function fetchCaseStatistics(testConfig, url, params) {
  const testCaseItemTypeKey =
    testConfig?.currentTestConfig?.itemTypeMap?.TestCase ||
    testConfig?.globalTestConfig?.extra?.initialItemTypeMapping?.TestCase;
  function search() {
    const iql = mergeIQL(
      `'itemTypeKey' in ['${testCaseItemTypeKey}'] and 'test_manager_repository' is NULL`,
      params.iql,
    );
    return fetch.$post('/search', {
      iql,
      displayContext: 'test_manager',
      from: 0,
      size: 9999,
    });
  }
  const [
    statisticsData,
    {
      payload: { items: emptyData },
    },
  ] = await Promise.all([fetch.$post(url, params), search()]);
  // 合并数据
  const emptyStatistics = {};
  // 需要统计的字段
  params.cluster.forEach(c => {
    const fieldKey = c.key;
    emptyData.forEach(i => {
      const fieldValue = i.values[fieldKey];
      if (!isEmpty(fieldValue) && fieldValue?.length) {
        generateStatistics(emptyStatistics, fieldValueFormat(i.values[fieldKey]));
      }
    });
  });
  // 填充空值
  if (!isEmpty(emptyStatistics)) {
    statisticsData.payload.data?.[0]?.push({ name: 'test-repository-empty', ...emptyStatistics });
  }
  return statisticsData;
}

const View: React.FC<ViewProps> = ({
  option,
  isListView,
  workspace: workspaceProps,
  setEnableSave,
  chartGroupId,
  uid,
}) => {
  const i18n = useI18n();
  const search = new URLSearchParams(window.location.search);
  const key = search.get('workspaceKey');
  const name = search.get('workspaceName');

  const {
    group = [],
    value = [],
    cluster = [],
    total = {},
    iql,
    formulas = [],
    globalFiltersIql,
  } = option;

  const workspace = useMemo(() => {
    return workspaceProps ?? (key && name) ? { key, name } : {};
  }, [key, name, workspaceProps]);

  const [resData, setResData] = useState([]);
  const [clusterData, setClusterData] = useState([]);
  const { PROXIMA_GATEWAY } = getEnvData();
  const testConfig = useTestConfig(workspace?.key);

  // chartKey 作为 local 里的 key 来存储列宽
  const chartKey = isValidUUID(uid) ? 'default' : uid;
  const { cacheColumnWidth, updateColumnWidth, columnResizeEnd } = useCacheColumns(
    chartGroupId,
    chartKey,
  );

  const { loading: treeLoading, data: treeData } = useRepositoryTree(workspace);
  // // 初始化测试管理模块树
  const url = `${PROXIMA_GATEWAY}/parse/api/report/basic-table-chart/search`;
  const params = useMemo(() => {
    let queryIql = withOrderBy(withWorkspace(iql, workspace));
    if (globalFiltersIql) {
      queryIql = mergeIQL(queryIql, globalFiltersIql);
    }
    return {
      cluster,
      group,
      value,
      total,
      iql: queryIql,
      formulas,
      iqlContext: {
        displayContext: 'test_manager',
      },
      timezone: dayjs().format('ZZ'),
    };
  }, [iql, workspace, globalFiltersIql, cluster, group, value, total, formulas]);

  const {
    result: _chartData,
    isNoData,
    enableSave,
    isLoading,
  } = useQuery({
    url,
    workspace,
    params,
    enableFetch: !!(value?.length && group?.length && !treeLoading && testConfig),
    isNoDataFunc: function (result = {} as Record<string, any>) {
      const { payload } = result;
      let isClusterData = false;
      let isData = false;
      payload?.cluster?.forEach(item => {
        if (item?.length && !isClusterData) {
          isClusterData = true;
        }
      });
      payload?.data?.forEach(item => {
        if (item?.length && !isData) {
          isData = true;
        }
      });
      return !(result && isClusterData && isData);
    },
    extendRequest: (url, params) => {
      return fetchCaseStatistics(testConfig, url, params);
    },
  });
  // 重新构建仓库树为一级仓库
  const chartData = useMemo(
    () =>
      buildRepositoryStaticsWithChildren(i18n.t, _chartData, treeData, params) ||
      buildRepositoryStatics(i18n.t, _chartData, treeData, params) || {
        payload: { cluster: [], data: [] },
      },
    [_chartData, treeData, JSON.stringify(params)],
  );

  useEffect(() => {
    if (setEnableSave) {
      setEnableSave(enableSave || true);
    }
  }, [enableSave, setEnableSave]);

  useEffect(() => {
    const cluster = chartData?.payload?.cluster || [];
    const resData = chartData?.payload?.data || [];

    let _resData = resData.reduce(function (prev, current) {
      return (prev as any[]).concat(current);
    }, []);
    /**
     * 将复杂对象 {a: 1, b:{c: {d: 2,e:3}, f:5}}
     * 铺平结构为 {a:1, af:5, bcd:2, bce:3}
     * 扁平的结构，映射table的columns
     */
    _resData = _resData.map(item => {
      const k = {
        name: item.name,
      };
      for (const k1 in item) {
        if (k1 !== 'name') {
          if (typeof item[k1] === 'string') {
            k[`${k1}`] = item[k1];
          } else {
            for (const k2 in item[k1]) {
              k[`${k1}${k2}`] = item[k1][k2];
            }
          }
        }
      }
      return k;
    });
    // 将数组[[a,b,c],[a],[c]]进行拼接
    const _cluster = flatten(cluster);

    setResData(_resData);
    setClusterData(_cluster);
  }, [chartData]);

  // 监听 app 关闭 ChartDetail，更新列宽
  useListener('updateChartColumnWidth', ({ groupId, chartKey: chartId }) => {
    if (chartGroupId === groupId && chartKey === chartId) {
      updateColumnWidth(groupId, chartKey);
    }
  });

  // // 非 name 列的宽度获取
  const customColumnWidth = useCallback(
    (key): number => {
      return cacheColumnWidth?.[key] || (isListView ? 90 : 110);
    },
    [cacheColumnWidth, isListView],
  );

  const formulasName = useMemo(() => formulas.map(formula => formula.name), [formulas]);

  const columns = useMemo(() => {
    const col: ColumnShape<DataType>[] = [
      {
        width: ROW_WIDTH,
        dataIndex: customColumnWidth('name'),
        dataKey: 'name',
        key: 'name',
        align: 'left',
        cellRenderer: ({ rowData, column }) => {
          return (
            <OverflowTooltip maxline={1} title={rowData[column.key]}>
              {rowData[column.key]}
            </OverflowTooltip>
          );
        },
        resizable: true,
      },
    ];
    clusterData.forEach(clusterItem => {
      // 列维度，中文，如高，中，低
      if (formulasName.includes(clusterItem)) {
        col?.push({
          width: customColumnWidth(clusterItem),
          dataIndex: `${clusterItem}`,
          dataKey: `${clusterItem}`,
          key: `${clusterItem}`,
          clusterName: clusterItem,
          parent: clusterItem,
          optionCluster: cluster,
          align: 'left',
          valueLength: value?.length ?? 1,
          cellRenderer: ({ rowData, column }) => {
            const className = isIncludeTotal(rowData.name) ? 'total-cell' : null;
            const num = rowData[column.key];
            return <span className={cx(className)}>{num || num === 0 ? num : '-'}</span>;
          },
          headerRenderer: customHeaderRendererForBaseTable,
          resizable: true,
        });
      } else {
        value?.forEach(valueItem => {
          // 值，如事项数，股市点；每个列维度下面重复的列
          col.push({
            width: customColumnWidth(`${clusterItem}${valueItem.key}`),
            dataIndex: `${clusterItem}${valueItem.key}`,
            dataKey: `${clusterItem}${valueItem.key}`,
            key: `${clusterItem}${valueItem.key}`,
            clusterName: clusterItem,
            valueName: valueItem.name,
            align: 'left',
            parent: clusterItem,
            optionCluster: cluster,
            valueLength: value?.length ?? 1,
            cellRenderer: ({ rowData, column }) => {
              const className = isIncludeTotal(rowData.name) ? 'total-cell' : null;
              const num = rowData[column.key];
              return <span className={cx(className)}>{num || num === 0 ? num : '-'}</span>;
            },
            headerRenderer: customHeaderRendererForBaseTable,
            resizable: true,
          });
        });
      }
    });
    return col;
  }, [customColumnWidth, clusterData, formulasName, value]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const rowRenderer = ({ rowData, rowIndex, cells, columns }) => {
    const { rowTotal, colTotal, rowSubTotal, colSubTotal } = total;
    if (rowTotal || colTotal || rowSubTotal || colSubTotal) {
      // 如果有总计选项，则列样式高亮
      columns.forEach((col, index) => {
        if (isIncludeTotal(col.key)) {
          const cell = cells[index];
          cells[index] = React.cloneElement(cell, {
            style: {
              ...cell.props.style,
              ...HIGH_STYLE,
            },
          });
        }
      });
    }
    // 如果某行是统计行，则行样式高亮
    if (isIncludeTotal(rowData.name)) {
      cells = cells.map(cell => {
        return React.cloneElement(cell, {
          style: {
            ...cell.props.style,
            ...HIGH_STYLE,
          },
        });
      });
    }
    return cells;
  };

  const LoadingLayer = () => {
    if (isLoading) {
      return (
        <div className={cx('loading-layer-wrapper')}>
          <Spin />
        </div>
      );
    }
    return null;
  };

  const headerHeight = useMemo(
    function () {
      return value?.length > 1 && cluster.length ? [ROW_HEIGHT, ROW_HEIGHT] : [ROW_HEIGHT];
    },
    [value, cluster],
  );

  return isLoading && !resData?.length ? (
    <LoadingLayer />
  ) : isNoData ? (
    <NoData title={i18n.t('reportPlugin.common.view.noData')} isListView={isListView} />
  ) : (
    <div className={isListView ? cx('view') : cx('detail-view')}>
      <AutoResizer>
        {({ width, height }) => (
          <BaseTable
            fixed
            width={width}
            height={height}
            rowHeight={ROW_HEIGHT}
            headerHeight={headerHeight}
            rowKey="objectId"
            data={resData}
            rowRenderer={rowRenderer}
            columns={columns}
            onColumnResizeEnd={resize => columnResizeEnd(resize)}
            style={{ maxWidth: columns.length * ROW_WIDTH }}
          />
        )}
      </AutoResizer>
    </div>
  );
};

export default View;
