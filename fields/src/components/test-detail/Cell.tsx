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
      {
        action: precondition,
      },
      ...steps,
    ];
  } catch (err) {
    return [];
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
        render: (_, __, index) => {
          return <div className={cx['index-box']}>{index}</div>;
        },
      },
      {
        title: t('step'),
        dataIndex: 'action',
        key: 'action',
        width: '30%',
        render: text => {
          return <Editor value={text} readonly={true} />;
        },
      },
      {
        title: t('expected'),
        dataIndex: 'result',
        key: 'result',
        width: '30%',
        render: text => {
          return <Editor value={text} readonly={true} />;
        },
      },
      {
        title: t('data'),
        dataIndex: 'data',
        key: 'data',
        width: '30%',
        render: text => {
          return <Editor value={text} readonly={true} />;
        },
      },
    ];
  }, []);
  console.info('props', props);
  return (
    <Table
      dataSource={tableData}
      columns={columns}
      pagination={false}
      bordered
      scroll={{ y: 500 }}
    />
  );
};

export default Cell;
