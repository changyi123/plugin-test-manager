/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useState } from 'react';
import { Dropdown, Empty } from 'antd';
import { getTestEntitiesByQuery } from '@/lib/api/common';
import { usePageContext } from '@/pages/plan/hook';
import { useDebounce, useRequest } from 'ahooks';
import { TestType } from '@/lib/constants';
import emptyImg from '@/icons/svg/empty-data.png';
import { DownOutlined } from '@ant-design/icons';
import SearchInput from '../SearchInput';

import cx from './index.less';

const TestPlanSelector: React.FC = () => {
  const listRef = React.useRef();
  const { workspaceKey, selectedTestPlan, setSelectedTestPlan } = usePageContext();
  const [search, setSearch] = useState('');

  const searchValue = useDebounce(search, { wait: 500 });

  const { data } = useRequest(
    async params => {
      const { offset = 0 } = params ?? ({} as any);
      const { results } = await getTestEntitiesByQuery(
        {
          workspaceKey,
          nameLike: searchValue,
          type: TestType.TestPlan,
        },
        {
          offset,
          limit: 9999,
          descendingBy: ['createdAt'],
          ignoreDeletedItemData: true,
        },
      );

      return results;
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
            placeholder="请输入搜索关键字"
            onChange={value => setSearch(value)}
          />
        </div>
        <div className={cx('selector-list')} ref={listRef}>
          {data?.length ? (
            data.map(d => (
              <div className={cx('plan-name')} key={d.objectId} onClick={() => handleClick(d)}>
                {d?.reference?.name}
              </div>
            ))
          ) : (
            <Empty
              description="无数据"
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
          查看全部
        </div>
      </div>
    );
  }, [data, listRef, search]);

  return (
    <div className={cx('plan-selector-container')}>
      <Dropdown overlay={menu} trigger={['click']}>
        <div className={cx('title')}>
          <span>{selectedTestPlan?.reference?.name ?? ''}</span>

          <DownOutlined className={cx('icon')} />
        </div>
      </Dropdown>
    </div>
  );
};

export default TestPlanSelector;
