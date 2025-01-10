import { getAllReadComponents, TableCell } from '@giteeteam/apps-team-components';
import { i18n } from 'proxima-sdk/lib/I18n';
import { getSourcePath } from 'proxima-sdk/lib/Path';
import React, { CSSProperties } from 'react';

import { openNewTabWithoutBubble } from '../../lib/util';

const readComponents = getAllReadComponents();

const TEXT_OVERFLOW_HIDDEN_STYLE = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const COMMON_STATUS_STYLE = {
  fontSize: '12px',
  fontWeight: 600,
  height: '22px',
  lineHeight: '22px',
  textAlign: 'center',
  padding: '0 8px',
  minWidth: '62px',
  borderRadius: '4px',
  width: '100%',
};

export const STATUS_STYLE = {
  Start: {
    ...COMMON_STATUS_STYLE,
    color: 'rgb(12, 98, 255)',
    backgroundColor: 'rgb(230, 243, 255)',
  },
  InProgress: {
    ...COMMON_STATUS_STYLE,
    color: 'rgb(255, 170, 12)',
    backgroundColor: 'rgb(254, 245, 208)',
  },
  Finished: {
    ...COMMON_STATUS_STYLE,
    color: 'rgb(9, 184, 102)',
    backgroundColor: 'rgb(223, 247, 232)',
  },
};

export const CASE_STATUS_STYLE = {
  TODO: {
    ...COMMON_STATUS_STYLE,
    color: 'rgb(12, 98, 255)',
    backgroundColor: 'rgb(230, 243, 255)',
  },
  PASSED: {
    ...COMMON_STATUS_STYLE,
    color: '#09b866',
    backgroundColor: '#e2ffee',
  },
  BLOCK: {
    ...COMMON_STATUS_STYLE,
    color: '#5b42ff',
    backgroundColor: '#f0ecff',
  },
  FAILED: {
    ...COMMON_STATUS_STYLE,
    color: '#ff4d0d',
    backgroundColor: '#ffebe5',
  },
  EXECUTING: {
    ...COMMON_STATUS_STYLE,
    color: '#ffaa0c',
    backgroundColor: '#fffae6',
  },
  CANCEL: {
    ...COMMON_STATUS_STYLE,
    color: '#848c9f',
    backgroundColor: '#f5f6f8',
  },
};

export const CASE_STATUS = {
  TODO: {
    name: '未开始',
    style: CASE_STATUS_STYLE.TODO,
  },
  PASSED: {
    name: '通过',
    style: CASE_STATUS_STYLE.PASSED,
  },
  BLOCK: {
    name: '阻塞',
    style: CASE_STATUS_STYLE.BLOCK,
  },
  FAILED: {
    name: '失败',
    style: CASE_STATUS_STYLE.FAILED,
  },
  EXECUTING: {
    name: '执行中',
    style: CASE_STATUS_STYLE.EXECUTING,
  },
  CANCEL: {
    name: '取消',
    style: CASE_STATUS_STYLE.CANCEL,
  },
};

const customHeaderRenderer = ({ column }) => {
  return (
    <div
      style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
      title={column?.title}
    >
      {column?.title}
    </div>
  );
};

export const customHeaderRendererForBaseTable = ({ columns, column, columnIndex, headerIndex }) => {
  if (
    (column.clusterName === i18n.t('reportPlugin.basicTableChart.util.subtotal') ||
      column.clusterName === i18n.t('reportPlugin.basicTableChart.util.total')) &&
    !column?.optionCluster?.length
  ) {
    // 小计 和 总计（无列选项时）单独处理
    return customHeaderRenderer({
      column: { title: `${column.clusterName}【${column.valueName}】` },
    });
  } else {
    // 非总计和小计的情况
    const title = column?.optionCluster?.length ? column.clusterName : column.valueName;
    // 多层数据的情况
    if (column.valueLength > 1) {
      // 第一层
      if (headerIndex === 0) {
        if (
          columnIndex > 0 &&
          column.parent !== '_default' &&
          column?.parent === columns[columnIndex - 1]?.parent
        ) {
          return null;
        } else {
          return customHeaderRenderer({ column: { title } });
        }
      } else {
        // 第二层
        return customHeaderRenderer({ column: { title: column.valueName } });
      }
    }
    return customHeaderRenderer({
      column: { title },
    });
  }
};

export const getRenderByCustomColumn = ({ customColumn, customColumnWidth, tenant }) => {
  if (customColumn?.dataIndex === 'name') {
    return {
      dataKey: 'name',
      ...customColumn,
      width: customColumnWidth(customColumn),
      headerRenderer: customHeaderRenderer,
      cellRenderer: ({ rowData, cellData }) => {
        return (
          <a
            href="#"
            onClick={e =>
              openNewTabWithoutBubble(
                e,
                getSourcePath(
                  `/${tenant}/workspaces/${rowData.workspace?.key}/item/${rowData?.key}?hiddenHeader=true`,
                ),
              )
            }
            title={cellData}
            style={TEXT_OVERFLOW_HIDDEN_STYLE as CSSProperties}
          >
            {cellData}
          </a>
        );
      },
    };
  } else if (customColumn?.dataIndex === 'status') {
    return {
      dataKey: 'status',
      ...customColumn,
      width: customColumnWidth(customColumn),
      headerRenderer: customHeaderRenderer,
      cellRenderer: ({ cellData }) => {
        return (
          <div style={STATUS_STYLE[cellData?.type]} title={cellData.name}>
            {cellData.name}
          </div>
        );
      },
    };
  } else if (customColumn?.dataIndex === 'linkedExecution') {
    return {
      dataKey: 'linkedExecution',
      ...customColumn,
      width: customColumnWidth(customColumn),
      headerRenderer: customHeaderRenderer,
      cellRenderer: ({ cellData, rowData }) => {
        if (!cellData?.objectId) return '-';
        return (
          <a
            href="#"
            onClick={e =>
              openNewTabWithoutBubble(
                e,
                getSourcePath(
                  `/${tenant}/workspaces/${rowData.workspace?.key}/item/${cellData.objectId}?hiddenHeader=true`,
                ),
              )
            }
            title={cellData.name}
            style={TEXT_OVERFLOW_HIDDEN_STYLE as CSSProperties}
          >
            {cellData.name}
          </a>
        );
      },
    };
  } else if (customColumn?.dataIndex === 'r_test_manager_status') {
    return {
      dataKey: 'r_test_manager_status',
      ...customColumn,
      width: customColumnWidth(customColumn),
      headerRenderer: customHeaderRenderer,
      cellRenderer: ({ cellData = 'TODO' }) => {
        return (
          <div style={CASE_STATUS[cellData].style} title={CASE_STATUS[cellData].name}>
            {CASE_STATUS[cellData].name}
          </div>
        );
      },
    };
  } else {
    return {
      dataKey: customColumn.dataIndex,
      ...customColumn,
      headerRenderer: customHeaderRenderer,
      width: customColumnWidth(customColumn),
      cellRenderer: ({ rowData, cellData, column }) => {
        return (
          <div
            style={{
              width: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <TableCell
              rowData={rowData}
              cellData={cellData}
              column={column}
              readComponents={readComponents}
            />
          </div>
        );
      },
    };
  }
};
