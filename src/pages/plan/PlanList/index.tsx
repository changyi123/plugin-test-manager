import _ from 'lodash';
import React from 'react';
import { usePageContext } from '../hook';
import { TestEntity } from '@/lib/types/Test';
import { deleteItems } from '@/lib/api/proxima';
import { message, Empty, Button } from '@osui/ui';
import { hasArrayItem } from '@/lib/utils/helper';
import { actionConfirm } from '@/lib/utils/helper';
import { useInfiniteScroll, useHover } from 'ahooks';
import { useBaseAction } from '@/lib/hooks/useContext';
import { goToItemDetailPage } from '@/lib/utils/helper';
import { Dropdown, Menu, Tooltip, Spin } from '@osui/ui';
import { EllipsisOutlined, PlusOutlined } from '@/icons';
import { StatusProgress } from '@/components/common/Status';
import { TestType, TestRelationType } from '@/lib/constants';
import {
  deleteTestEntities,
  getTestEntitiesByQuery,
  getTestEntitiesByRelation,
} from '@/lib/api/common';

import SearchInput from '@/components/plan/SearchInput';

import cx from './index.less';

const REQUEST_LIMIT = 10;

type TestPlanEntity = TestEntity<TestType.TestPlan>;
type TestPlan = TestPlanEntity & {
  refTestDetails: Pick<TestEntity, 'status'>[];
};

const PlanItem: React.FC<{
  data: TestPlan;
  selectedId: string;
  onSelect: (data) => void;
  onDelete: (data) => void;
}> = ({ data, onSelect, selectedId, onDelete }) => {
  const ref = React.useRef();
  const isHover = useHover(ref);
  const { reference = {} as any, refTestDetails } = data;

  const handleView = data => {
    const itemData = data.reference ?? {};
    goToItemDetailPage({
      workspaceKey: itemData.workspace?.key,
      itemKey: itemData.key,
    });
  };

  return (
    <div
      ref={ref}
      className={cx('plan', isHover && 'hover', selectedId === data.objectId && 'selected')}
      key={data.objectId}
      onClick={() => onSelect(data)}
    >
      <div className={cx('top')}>
        <span className={cx('name')}>{reference.name ?? '该事项已被删除'}</span>
        <span style={{ display: !isHover ? 'inline-block' : 'none' }} className={cx('num')}>
          {refTestDetails.length}
        </span>
        <Dropdown
          overlay={
            <Menu>
              <Menu.Item key="delete" onClick={() => onDelete(data)}>
                删除测试计划
              </Menu.Item>
              <Menu.Item key="view" onClick={() => handleView(data)}>
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
  const listRef = React.useRef();
  const initialRef = React.useRef(false);
  const [search, setSearch] = React.useState('');
  const { createItemUseModal } = useBaseAction();
  const { workspaceKey, setSelectedTestPlanId, selectedTestPlanId, mutateTestPlanEvent } =
    usePageContext();

  const { data, reload, loading, mutate } = useInfiniteScroll(
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

  mutateTestPlanEvent.useSubscription(async testPlanId => {
    const { list: refTestDetails } = await getTestEntitiesByRelation(
      TestRelationType.PlanRelDetail,
      {
        from: testPlanId,
      },
      {
        include: ['status'],
        queryParams: { limit: 9999, offset: 0 },
      },
    );
    mutate(data => {
      const mutatedList = data.list.map(item => {
        if (item.objectId === testPlanId) {
          return Object.assign({}, item, { refTestDetails });
        }
        return item;
      });
      return {
        ...data,
        list: mutatedList,
      };
    });
  });

  const testPlans = data?.list ?? [];

  React.useEffect(() => {
    if (!initialRef.current && hasArrayItem(data?.list)) {
      initialRef.current = true;
      setSelectedTestPlanId(data.list[0].objectId);
    }
  }, [data?.list, setSelectedTestPlanId]);

  const handleCreate = async () => {
    await createItemUseModal({
      type: TestType.TestPlan,
    });
    reload();
    message.success('测试计划新建成功');
  };

  const handleDelete = async data => {
    await actionConfirm('该操作会当前删除测试计划以及测试计划关联的测试用例和任务，是否继续？');
    await Promise.all([
      deleteTestEntities([data.objectId]),
      deleteItems([data.reference.objectId]),
    ]);
    reload();
    message.success('测试计划删除成功');
  };

  const handleSearch = value => {
    setSearch(value);
    reload();
  };

  return (
    <div className={cx('container')}>
      <div className={cx('toolkit-bar')}>
        <SearchInput onSearch={handleSearch} placeholder="请输入测试计划标题" />
        <Tooltip title="新建测试计划">
          <PlusOutlined onClick={handleCreate} />
        </Tooltip>
      </div>
      <Spin spinning={loading}>
        {loading || testPlans.length ? (
          <div className={cx('list')} ref={listRef}>
            {testPlans.map(testPlan => (
              <PlanItem
                data={testPlan}
                key={testPlan.objectId}
                onDelete={handleDelete}
                selectedId={selectedTestPlanId}
                onSelect={data => setSelectedTestPlanId(data.objectId)}
              />
            ))}
          </div>
        ) : (
          <Empty
            className={cx('empty')}
            description={
              <>
                <p>暂无测试计划</p>
                <Button onClick={handleCreate} size="small" type="primary">
                  新建测试计划
                </Button>
              </>
            }
          />
        )}
      </Spin>
    </div>
  );
};

export default React.memo(PlanList);
