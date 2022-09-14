import fetch from '@/lib/utils/fetch';
import { TestLinkType, TestType } from '../constants';

/** 测试实体查询支持快捷查询 */
type Query = Partial<{
  /** 事项名称
   *  iql: name ~ ''
   */
  name: string;
  /** 空间标识
   *  iql: workspaceKey in []
   */
  workspaceKey: string | string[];
  /** 空间名
   *  iql: 所属空间 in []
   */
  workspace: string | string[];
  /** 事项 id
   *  iql: id in []
   */
  id: string | string[];
  /** 事项 key
   *  iql: key in []
   */
  key: string | string[];
  /** 测试类型查询
   *  iql: 测试类型 in []
   */
  type: string | string[];
  /** 测试用例库模块查询
   *  iql: 测试用例库模块 in []
   */
  repository: string | string[];
}>;

interface QueryTestEntityPayload {
  offset?: number;
  limit?: number;
  /** 测试实体查询支持快捷查询 */
  query?: Query;
  /** 筛选器选择 */
  selectors?: any;
  /** 限制接口返回的字段 */
  fields?: string[];
  /** 升序字段 */
  ascending?: string[];
  /** 降序字段 */
  descending?: string[];
}

export type QueryLinkedTestEntityPayload = QueryTestEntityPayload & {
  /** 关联类型 */
  linkType: TestLinkType;
  /** 关联 items id */
  linkItems: string[] | string[];
  /** destination 查询实体类型 */
  type: TestType;
};

export const getTestEntityByQuery = async (props: QueryTestEntityPayload) => {
  const _props = Object.assign({}, props, {
    descending: ['createdAt'],
  });

  const {
    data: { data },
  } = await fetch.post('/api/app/osc/test_manager/webhooks/api-query-test-entity', _props);

  return {
    list: data.list ?? [],
    total: data.total ?? [],
  };
};

export const getlinkedTestEntityByQuery = async (props: QueryLinkedTestEntityPayload) => {
  const {
    data: { data },
  } = await fetch.post('/api/app/osc/test_manager/webhooks/api-query-linked-test-entity', props);

  return {
    list: data.list ?? [],
    total: data.total ?? 0,
  };
};

export const deleteTestEntity = async ids => {
  const res = await fetch.post('/api/app/osc/test_manager/webhooks/api-delete-test-entity', {
    ids,
  });

  return res;
};
