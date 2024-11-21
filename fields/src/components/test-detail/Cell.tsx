// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Table } from 'antd';
import React, { FC, useMemo } from 'react';

import { t } from '@/i18n';

import { CellProp } from '../types';
import Editor from './editor';
import cx from './index.less';

const parseData = v => {
  try {
    const data = JSON.parse(v);
    const { precondition, steps } = data;
    return [
      [
        {
          precondition,
        },
      ],
      steps || [],
    ];
  } catch (err) {
    return [[], []];
  }
};

const Cell: FC<CellProp> = props => {
  const tableData = useMemo(() => {
    return parseData(props?.value);
  }, [props?.value]);

  const columns = useMemo(() => {
    return [
      {
        title: '#',
        dataIndex: 'index',
        key: 'index',
        width: '10%',
        className: cx['test-table-cell'],
        render: (_, __, index) => {
          return <div className={cx['index-box']}>{index + 1}</div>;
        },
      },
      {
        title: t('step'),
        dataIndex: 'action',
        key: 'action',
        width: '30%',
        className: cx['test-table-cell'],
        render: text => {
          return <Editor value={text} readonly={true} />;
        },
      },
      {
        title: t('expected'),
        dataIndex: 'result',
        key: 'result',
        width: '30%',
        className: cx['test-table-cell'],
        render: text => {
          return <Editor value={text} readonly={true} />;
        },
      },
      {
        title: t('data'),
        dataIndex: 'data',
        key: 'data',
        width: '30%',
        className: cx['test-table-cell'],
        render: text => {
          return <Editor value={text} readonly={true} />;
        },
      },
    ];
  }, []);

  const preconditionColumns = useMemo(() => {
    return [
      {
        title: t('precondition'),
        dataIndex: 'precondition',
        key: 'precondition',
        width: '100%',
        className: cx['test-table-cell'],
        render: text => {
          return <Editor value={text} readonly={true} />;
        },
      },
    ];
  }, []);
  return (
    <div>
      <Table
        className={cx['test-precondition-table']}
        dataSource={tableData[0]}
        columns={preconditionColumns}
        pagination={false}
        bordered
      />
      <Table
        className={cx['test-detail-table']}
        dataSource={tableData[1]}
        columns={columns}
        pagination={false}
        bordered
      />
    </div>
  );
};

export default Cell;
