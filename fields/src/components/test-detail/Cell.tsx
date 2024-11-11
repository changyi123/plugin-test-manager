// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Table } from 'antd';
import React, { FC, useMemo } from 'react';

import { t } from '@/i18n';

import { CellProp } from '../types';
import cx from './index.less';

const getTextFromEditorOrString = data => {
  if (!data) {
    return '-';
  }
  if (typeof data === 'string') {
    return data || '-';
  } else {
    const [forMinderText] = data;
    return forMinderText.stringText;
  }
};
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
        width: '15%',
        render: (_, __, index) => {
          return <div className={cx['index-box']}>{index}</div>;
        },
      },
      {
        title: t('step'),
        dataIndex: 'action',
        key: 'action',
        width: '35%',
        render: text => {
          console.info('action-text', text);
          return <div className={cx['common-box']}>{getTextFromEditorOrString(text) || '-'}</div>;
        },
      },
      {
        title: t('expected'),
        dataIndex: 'result',
        key: 'result',
        width: '35%',
        render: text => {
          console.info('result-text', text);
          return <div className={cx['common-box']}>{getTextFromEditorOrString(text) || '-'}</div>;
        },
      },
      {
        title: t('data'),
        dataIndex: 'data',
        key: 'data',
        width: '15%',
        render: text => {
          console.info('data-text', text);
          return <div className={cx['common-box']}>{getTextFromEditorOrString(text) || '-'}</div>;
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
