import _ from 'lodash';
import React from 'react';
import { usePageContext } from '../hook';
import { TestEntity } from '@/lib/types/Test';
import { deleteItems } from '@/lib/api/proxima';
import { hasArrayItem } from '@/lib/utils/helper';
import { actionConfirm } from '@/lib/utils/helper';
import { useInfiniteScroll, useHover } from 'ahooks';
import { notification, Empty, Button } from '@osui/ui';
import { useBaseAction } from '@/lib/hooks/useContext';
import { goToItemDetailPage } from '@/lib/utils/helper';
import { Dropdown, Menu, Tooltip, Spin } from '@osui/ui';
import { EllipsisOutlined, PlusOutlined } from '@/icons';
import { StatusProgress } from '@/components/business/Status';
import { TestType, TestRelationType } from '@/lib/constants';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { useOnItemCreateSuccess } from '@/lib/hooks/useProximaSDK';
import {
  deleteTestEntities,
  getTestEntitiesByQuery,
  getTestEntitiesByRelation,
} from '@/lib/api/common';

import SearchInput from '@/components/business/SearchInput';

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
        <OverflowTooltip className={cx('name')} maxline={1} title={reference?.name}>
          <span>{reference?.name ?? '该事项已被删除'}</span>
        </OverflowTooltip>
        <span
          style={{ display: !isHover ? 'inline-block' : 'none' }}
          className={cx('num', 'right')}
        >
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
            className={cx('action', 'right')}
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
  const [search, setSearch] = React.useState('');
  const { createItemUseModal } = useBaseAction();
  const { workspaceKey, setSelectedTestPlan, selectedTestPlan, mutateTestPlanEvent } =
    usePageContext();

  const selectedTestPlanId = selectedTestPlan?.objectId;

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
          ignoreDeletedItemData: true,
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
    testPlanId = testPlanId ?? selectedTestPlanId;
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
    if (hasArrayItem(data?.list)) {
      // 默认选中第一项
      if (selectedTestPlan == null) {
        setSelectedTestPlan(data.list[0]);
      } else {
        const testPlan = data.list.find(item => item.objectId === selectedTestPlan?.objectId);
        setSelectedTestPlan(testPlan);
      }
    }
  }, [data?.list, selectedTestPlan, setSelectedTestPlan]);

  const handleCreate = async () => {
    await createItemUseModal({
      type: TestType.TestPlan,
    });
    notification.success({
      message: '测试计划新建成功',
    });
  };

  const handleDelete = async data => {
    await actionConfirm('该操作会当前删除测试计划以及测试计划关联的测试用例和任务，是否继续？');
    await Promise.all([
      deleteTestEntities([data.objectId]),
      deleteItems([data.reference?.objectId]),
    ]);
    reload();
    // 重新选中
    setSelectedTestPlan({} as any);
    notification.success({
      message: '测试计划删除成功',
    });
  };

  const handleSearch = value => {
    setSearch(value);
    reload();
  };

  // 监听 事项创建刷新 左侧测试计划列表，需要个延时立即刷新数据未更新
  useOnItemCreateSuccess(() => setTimeout(reload, 1000));

  return (
    <div className={cx('container')}>
      <div className={cx('toolkit-bar')}>
        <SearchInput
          onSearch={handleSearch}
          placeholder="请输入测试计划标题"
          className={cx('plan-search')}
        />
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
                onSelect={data => setSelectedTestPlan(data)}
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
