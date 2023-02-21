/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useState } from 'react';
import { Dropdown, Empty, Tooltip } from 'antd';
import { usePageContext } from '@/pages/plan/hook';
import { useDebounce, useRequest } from 'ahooks';
import { TestType } from '@/lib/constants';
import emptyImg from '@/icons/svg/empty-data.png';
import SearchInput from '../SearchInput';
import { DropDown } from '@/icons';
import { getStatsTestPlan, getTestEntityByQuery } from '@/lib/api/item';
import _ from 'lodash';
import { useTestTypeScreenFieldKeys } from '@/components/common/BusinessTable/hook';
import useI18n from '@/lib/hooks/useI18n';

import cx from './index.less';

const TestPlanSelector: React.FC = () => {
  const { t } = useI18n();
  const listRef = React.useRef();
  const { workspaceKey, selectedTestPlan, setSelectedTestPlan } = usePageContext();
  const [search, setSearch] = useState('');

  const testDetailFieldKeys = useTestTypeScreenFieldKeys({
    testType: TestType.Plan,
    workspaceKey,
  });

  const searchValue = useDebounce(search, { wait: 500 });

  const { data } = useRequest(
    async () => {
      if (!workspaceKey) return [];

      const { list } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Plan,
          name: searchValue,
        },
        fields: testDetailFieldKeys ?? [],
        limit: 99999,
      });

      const stats = await getStatsTestPlan({
        planIds: list.map(d => d.objectId),
        select: ['caseStatus', 'caseCount'],
      });

      const testPlans = _.chain(list)
        .map(testPlan => {
          return {
            ...testPlan,
            ...stats?.[testPlan.objectId],
            status: testPlan.workflowStatus,
          };
        })
        .value();

      return testPlans;
    },
    {
      refreshDeps: [searchValue, workspaceKey],
    },
  );

  const handleClick = planData => {
    setSelectedTestPlan(planData);
    // setSearch('');
    // reload();
  };

  const menu = useCallback(() => {
    return (
      <div className={cx('selector-box')}>
        <div
          className={cx('search-box')}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <SearchInput
            showInput
            value={search}
            allowClear
            placeholder={t('components.business.testPlanSelector.placeholder')}
            onChange={value => setSearch(value)}
          />
        </div>
        <div className={cx('selector-list')} ref={listRef}>
          {data?.length ? (
            data.map(d => (
              <div
                className={cx(
                  'plan-name',
                  `${d.objectId === selectedTestPlan?.objectId ? 'actived' : ''}`,
                )}
                key={d.objectId}
                onClick={() => handleClick(d)}
              >
                <Tooltip placement="topLeft" title={d?.name ?? ''}>
                  {d?.name}
                </Tooltip>
              </div>
            ))
          ) : (
            <Empty
              description={t('components.business.testPlanSelector.desc')}
              image={emptyImg}
              imageStyle={{
                height: 70,
                width: '100%',
                padding: '8px 0',
              }}
            ></Empty>
          )}
        </div>
        <div
          className={cx('check-all')}
          onClick={() => {
            setSelectedTestPlan(undefined);
          }}
        >
          {t('components.business.testPlanSelector.checkAllPlan')}
        </div>
      </div>
    );
  }, [data, listRef, search, selectedTestPlan?.objectId]);

  return (
    <div className={cx('plan-selector-container')}>
      <Dropdown overlay={menu} trigger={['click']}>
        <div className={cx('title')}>
          <Tooltip title={selectedTestPlan?.name ?? ''} placement="topLeft">
            <span className={cx('name')}>{selectedTestPlan?.name ?? ''}</span>
          </Tooltip>
          <DropDown className={cx('icon')} />
        </div>
      </Dropdown>
    </div>
  );
};

export default TestPlanSelector;
