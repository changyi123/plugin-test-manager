import _ from 'lodash';
import React from 'react';
import { usePageContext } from '../hook';
import { TestEntity } from '@/lib/types/Test';
import { Dropdown, Menu, Tooltip, Spin } from '@osui/ui';
import { EllipsisOutlined, PlusOutlined } from '@/icons';
import { StatusProgress } from '@/components/common/Status';
import { TestType, TestRelationType } from '@/lib/constants';
import { useInfiniteScroll, useHover, useDebounceFn } from 'ahooks';
import { getTestEntitiesByRelation, getTestEntitiesByQuery } from '@/lib/api/common';

import SearchInput from '@/components/plan/SearchInput';

import cx from './index.less';

const REQUEST_LIMIT = 10;

type TestPlanEntity = TestEntity<TestType.TestPlan>;
type TestPlan = TestPlanEntity & {
  refTestDetails: Pick<TestEntity, 'status'>[];
};

const PlanItem: React.FC<{ data: TestPlan }> = ({ data }) => {
  const ref = React.useRef();
  const isHover = useHover(ref);
  const { reference = {} as any, refTestDetails } = data;

  const handleDelete = () => {
    console.info(data.objectId);
  };

  const handleView = () => {
    console.info(data.objectId);
  };

  return (
    <div ref={ref} className={cx('plan', isHover && 'hover')} key={data.objectId}>
      <div className={cx('top')}>
        <span className={cx('name')}>{reference.name ?? '该事项已被删除'}</span>
        <span style={{ display: !isHover ? 'inline-block' : 'none' }} className={cx('num')}>
          {refTestDetails.length}
        </span>
        <Dropdown
          overlay={
            <Menu>
              <Menu.Item key="delete" onClick={handleDelete}>
                删除测试计划
              </Menu.Item>
              <Menu.Item key="view" onClick={handleView}>
                查看测试计划
              </Menu.Item>
            </Menu>
          }
          trigger={['hover']}
        >
          <EllipsisOutlined
            className={cx('action')}
            style={{ display: isHover ? 'flex' : 'none' }}
          />
        </Dropdown>
      </div>
      <StatusProgress hasSummary statuses={refTestDetails.map(testDetail => testDetail.status)} />
    </div>
  );
};

const PlanList = () => {
  const [search, setSearch] = React.useState('');
  const { workspaceKey } = usePageContext();
  const listRef = React.useRef();

  const { data, reload, loading } = useInfiniteScroll(
    async params => {
      const { offset = 0 } = params ?? ({} as any);
      const { results, count } = await getTestEntitiesByQuery(
        {
          workspaceKey,
          nameLike: search,
          type: TestType.TestPlan,
        },
        {
          offset,
          limit: REQUEST_LIMIT,
          descendingBy: ['createdAt'],
        },
      );

      const { list: allRelationTestDetails } = await getTestEntitiesByRelation(
        TestRelationType.PlanRelDetail,
        {
          from: results.map(item => item.objectId),
        },
        {
          include: ['status'],
          queryParams: { limit: 9999, offset: 0 },
        },
      );

      const testPlans = _.chain(results)
        .map(testPlan => {
          return {
            ...testPlan,
            refTestDetails: allRelationTestDetails.filter(
              testDetail => _.get(testDetail, 'relation.from.objectId') === testPlan.objectId,
            ),
          };
        })
        .value() as TestPlan[];

      const nextOffset = offset + REQUEST_LIMIT;
      return {
        list: testPlans,
        offset: nextOffset < count ? nextOffset : undefined,
      };
    },
    {
      target: listRef,
      isNoMore: data => data?.offset === undefined,
    },
  );

  const testPlans = data?.list ?? [];

  const handleCreate = () => {};

  const { run: handleSearchInputChange } = useDebounceFn(
    value => {
      setSearch(value);
      reload();
    },
    {
      wait: 1000,
    },
  );

  return (
    <div className={cx('container')}>
      <div className={cx('toolkit-bar')}>
        <SearchInput onChange={handleSearchInputChange} />
        <Tooltip title="新建测试计划">
          <PlusOutlined onClick={handleCreate} />
        </Tooltip>
      </div>
      <Spin spinning={loading}>
        <div className={cx('list')} ref={listRef}>
          {testPlans.map(testPlan => (
            <PlanItem data={testPlan} key={testPlan.objectId} />
          ))}
        </div>
      </Spin>
    </div>
  );
};

export default React.memo(PlanList);
