import dayjs from 'dayjs';
import cloneDeep from 'lodash/cloneDeep';
import { iqlSearch } from '../lib/coreApi';
import { buildPaginationResponse } from './apiUtil';
import { TestEntity } from '../../common/types/test';

import { throwArgumentError } from '../lib/validator';
import { itemToTestEntity } from '../../common/utils/dataTransfer';
import {
  InfinityLimit,
  IQLUsefulFieldKeys,
  IQLSearchFieldKeys,
  IQLFieldNameMapping,
  TestFiledKeyMapping,
  IQLRequiredFieldKeys,
} from '../../common/constant';
import { iqlSearchParamsBuilder, Operator } from '../../common/utils/iqlSearchParamsBuilder';
import { PaginationParams, PaginationResponse, LinkQueryPayload } from '../../common/types/api';

type IQLFiledKeys = keyof typeof IQLFieldNameMapping;

type RequestParams = {
  fields?: string[];
  linkQuery?: LinkQueryPayload;
  pagination?: PaginationParams;
  query?: Partial<Record<IQLFiledKeys, any>>;
  dataTransfer?: (data: TestEntity[]) => Promise<any>;
  descending?: string[] | string;
  ascending?: string[] | string;
};

const DefaultPagination = {
  offset: 0,
  limit: 10,
};

// 默认按照 sortIndex 和 createdAt 倒序排
const DefaultDescending = ['sortIndex', 'createdAt'] as any;

// 处理 order params
const transformOrderParams = ({ ascending, descending = DefaultDescending }) => {
  ascending = (Array.isArray(ascending) ? ascending : [ascending]).filter(Boolean);
  descending = (Array.isArray(descending) ? descending : [descending]).filter(Boolean);

  const customFieldKeys = ascending
    .filter(key => !IQLSearchFieldKeys.includes(key))
    .concat(descending.filter(key => !IQLSearchFieldKeys.includes(key)));
  // TODO: 处理自定义字段的逻辑
  console.info('customFieldKeys', customFieldKeys);

  const toIqlFieldNames = (keys, isDescending = false) => {
    const prefix = isDescending ? '-' : '';
    return keys.map(key => `${prefix}${IQLFieldNameMapping[key]}`);
  };

  return [].concat(toIqlFieldNames(ascending), toIqlFieldNames(descending, true));
};

/** 获取关联方，被关联方的类型 */
const getLinkTypes = linkType => {
  return linkType
    .match(/^(\w+)Link(\w+)$/)
    .slice(1, 3)
    .map(type => `Test${type}`);
};

type IqlRequestType = <TResp extends TestEntity = TestEntity>(
  params: RequestParams,
) => Promise<PaginationResponse<TResp>>;
/** iql 请求查询 */
export const iqlRequest: IqlRequestType = async params => {
  try {
    const {
      linkQuery,
      ascending,
      descending,
      dataTransfer,
      query: originalQuery,
      fields = IQLUsefulFieldKeys,
      pagination: originalPagination,
    } = params;

    // 参数处理
    const query = cloneDeep(originalQuery) ?? {};
    const pagination = Object.assign({}, DefaultPagination, originalPagination);

    // 反向关联方的字段 map
    const backwardLinkSourceMap = {} as Record<string, string[]>;

    // 处理关联关系查询
    if (linkQuery) {
      const { linkType, destinationType, sourceIds } = linkQuery;
      const linkTestTypes = getLinkTypes(linkType);

      // linkType 和 destinationType 未对应抛错
      if (!linkTestTypes.includes(destinationType))
        throwArgumentError('destinationTestType', linkTestTypes.join(' or '));

      // 正向关联查询
      // 正向关联查询参数 eg：linkType = CaseLinkPlan destinationType = TestCase
      const isForwardLinkQuery = linkTestTypes[0] === destinationType;

      if (isForwardLinkQuery) {
        // 因为关联查询的 linkItems 字段存在多的一方
        // 使用 linkItems 可以直接查询出正向关联的数据
        query.linkType = linkType;
        query.type = destinationType;
        query.linkItems = sourceIds;
      } else {
        // 反向关联查询
        // eg： linkType = CaseLinkPlan destinationType = TestPlan
        // 查出用例关联的测试计划的数据 步骤：
        // 1. iql 查出所有的测试用例
        // 2. 合并所有的 linkItems 字段数据（plan objectId）
        // 3. 根据合并后的 plan objectId 查出所有的用例

        // iql 查出所有的测试用例
        const {
          data: { list: sourceData },
        } = await iqlRequest({
          query: {
            id: sourceIds,
          },
          pagination: {
            limit: InfinityLimit,
            offset: 0,
          },
          fields: [...IQLRequiredFieldKeys, TestFiledKeyMapping.linkItems],
        });

        // 合并所有的 linkItems 字段数据
        const destinationIds = Array.from(
          new Set(
            sourceData.reduce((res, data) => {
              const linkItems = data.linkItems ?? [];
              // 添加反向关联的映射
              backwardLinkSourceMap[data.objectId] = linkItems;
              return res.concat(linkItems);
            }, []),
          ),
        );

        // 根据合并后的 plan objectId 查出所有的用例（拼接 Query）
        query.id = destinationIds;
        query.type = destinationType;
      }
    }

    const customFieldParams = Object.keys(query)
      .filter(key => !IQLSearchFieldKeys.includes(key as any))
      .reduce(
        (prev, key) => ({
          ...prev,
          [key]: query[key],
        }),
        {},
      );

    // TODO: 处理自定义字段查询条件
    console.info('customFieldParams', customFieldParams);

    // iql 查询条件参数转换
    const SearchParamsTransformStrategies = {
      // name 转换成 like
      name: value => ({
        value: value,
        operator: Operator.Like,
      }),
      createdAt: value => {
        const getStandardDateValue = date => dayjs(date).format('YYYY-MM-DD');
        return Array.isArray(value)
          ? {
              value: value.map(getStandardDateValue),
              operator: Operator.DateRange,
            }
          : null;
      },
    };

    // IQLFieldNameMapping 中包含的自定义参数可以做默认的参数
    const registeredFieldParams = Object.keys(query)
      .filter(key => IQLSearchFieldKeys.includes(key as any))
      .reduce(
        (prev, key) => ({
          ...prev,
          [IQLFieldNameMapping[key]]: SearchParamsTransformStrategies[key]
            ? SearchParamsTransformStrategies[key](query[key])
            : query[key],
        }),
        {},
      );

    const payload = {
      ...registeredFieldParams,
    };

    const {
      payload: { count, items },
    } = await iqlSearch(
      iqlSearchParamsBuilder({
        order: transformOrderParams({ ascending, descending }),
        payload,
        fields,
        ...pagination,
      }),
    );

    // 关联查询添加 source 字段
    const appendLinkSourceField = testEntityList => {
      if (linkQuery) {
        const { linkType, destinationType } = linkQuery;
        const isForwardLinkQuery = getLinkTypes(linkType)[0] === destinationType;
        if (isForwardLinkQuery) {
          testEntityList = testEntityList.map(data => ({
            ...data,
            source: data.linkItems,
          }));
        } else {
          const getSourceFromLinkSourceMap = destinationId => {
            return Object.entries(backwardLinkSourceMap)
              .filter(([, destIds]) => destIds.includes(destinationId))
              ?.map(data => data[0]);
          };
          testEntityList = testEntityList.map(data => ({
            ...data,
            source: getSourceFromLinkSourceMap(data.objectId),
          }));
        }
        console.info('testEntityList', testEntityList);
      }
      return testEntityList;
    };

    const testEntityList = appendLinkSourceField(items.map(itemToTestEntity));

    const result =
      typeof dataTransfer === 'function' ? await dataTransfer(testEntityList) : testEntityList;

    return buildPaginationResponse(result, {
      total: count,
      ...pagination,
    });
  } catch (err) {
    return buildPaginationResponse(err);
  }
};
