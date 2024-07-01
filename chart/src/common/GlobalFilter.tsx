import { QuestionCircleOutlined } from '@ant-design/icons';
import createProximaSdk from '@giteeteam/proxima-sdk-js';
import { Card, Switch, Tooltip } from 'antd';
import { FilterQuery } from 'proxima-sdk/components/Components/Chart';
import { useI18n } from 'proxima-sdk/hooks/Hooks';
import React from 'react';

import { GlobalIqlFilterCond } from '../lib/type';
import cx from './CountOption.less';

interface GlobalFilterPropsType {
  globalFiltersIql: GlobalIqlFilterCond[];
  setGlobalFiltersIql: React.Dispatch<React.SetStateAction<GlobalIqlFilterCond[]>>;
}

// 全局筛选器回显以iql展示
const SHOW_IQL_TYPE = 'expression';

const proxima = createProximaSdk();
proxima.execute('updateItemTypeEvent');

const GlobalFilter: React.FC<GlobalFilterPropsType> = props => {
  const i18n = useI18n();
  const { globalFiltersIql, setGlobalFiltersIql } = props;

  return (
    <div>
      <div className={'form-main-title'}>
        <strong className={'info-title'}>
          {i18n.t('reportPlugin.common.globalFilters.title')}
          <Tooltip placement="top" title={i18n.t('reportPlugin.common.globalFilters.filterTips')}>
            <span style={{ marginLeft: '8px', fontSize: '15px' }}>
              <QuestionCircleOutlined />
            </span>
          </Tooltip>
        </strong>
      </div>
      {!globalFiltersIql?.length ? (
        <p>{i18n.t('reportPlugin.common.globalFilters.noFilterTips')}</p>
      ) : (
        <>
          {globalFiltersIql?.map((filterCond, index) => (
            <div className={cx('filter-card')} key={filterCond.filterName}>
              <Card className={cx('card')}>
                <Switch
                  size={'small'}
                  defaultChecked
                  onChange={val => {
                    const updatedFilters = [...globalFiltersIql];
                    updatedFilters[index].disable = !val;
                    setGlobalFiltersIql(updatedFilters);
                  }}
                />
                <span style={{ marginLeft: '10px', fontSize: '14px' }}>{filterCond.filterName}</span>
                <div
                  className={
                    filterCond.queryType == SHOW_IQL_TYPE
                      ? cx('disabled-container-expression')
                      : cx('disabled-container')
                  }
                >
                  <FilterQuery disabled={true} setOption={() => {}} option={filterCond} />
                </div>
              </Card>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default GlobalFilter;
