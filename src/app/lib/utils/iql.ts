import matchBracket from 'find-matching-bracket';
import { cloneDeep, isArray, isEmpty, isNil, omit, pick } from 'lodash';

import {
  FIELD_TYPE_KEY_MAPPINGS,
  FILTER_EXPR_NAME,
  IQL_CONDITION,
  isUseOptionLabel,
  isUseOptionValue,
  TestCaseStatusModel,
} from '@/lib/constants';
import { RepositoryModel, SelectorNullValue } from '@/lib/constants';
import { Repository, Test, User } from '@/services/models';

import { DateTimestampRang } from './date';

type Hyphen = '' | 'and' | 'or';

export type IQL = string;

enum IQLWhereOperator {
  IN = 'IN',
  NOT = 'NOT',
  EQUAL = 'EQUAL',
  LIKE = 'LIKE',
}

interface componentValueProps {
  curIqlValue: string;
  nullIql: string;
}

const NULL = 'NULL';

/**
 * 使用连词符拼接
 */
const joinWithHyphen = (prevStatement, currentStatement, hyphen: Hyphen = 'and') => {
  // 如果没有值则 hyphen 为 ''
  if (!prevStatement?.trim() || !currentStatement?.trim()) hyphen = '';
  return `${prevStatement} ${hyphen} ${currentStatement}`;
};

/**
 * 条件生成
 */
const IQLWhereClauseGenerators: Record<IQLWhereOperator, (...args: any[]) => string> = {
  [IQLWhereOperator.IN]: (key: string, data: string[]) => {
    if (!Array.isArray(data)) return '';
    // 移除空值类型数据
    data = data.filter(Boolean);
    return `${key} in [${data.toString().replace(/([^,]+)(?=$|,)/g, `'$1'`)}]`;
  },
  [IQLWhereOperator.EQUAL]: (key: string, data: string) => {
    if (!data) return '';
    return `${key} = '${data}'`;
  },
  [IQLWhereOperator.NOT]: (key: string, data: string[]) => {
    if (!Array.isArray(data)) return '';
    return `${key} not in [${data.toString().replace(/([^,]+)(?=$|,)/g, `'$1'`)}]`;
  },
  [IQLWhereOperator.LIKE]: (key: string, data: string) => {
    if (!data) return '';
    return `${key} ~ '${data}'`;
  },
};

/**
 * 排序查询
 */
const IQLOrderClauseGenerator = (key, type, initial = true) => {
  return ` ${initial ? 'order by' : 'and'} ${key} ${type}`;
};

/** IQL builder */
export class IQLBuilder {
  _iql = {
    where: [],
    order: [],
  };
  constructor(iql?) {
    if (iql) {
      this._iql = iql;
    }
  }

  /** 多个 where 子句拼接 */
  or = (...subQueries: IQLBuilder[]) => {
    this._iql.where.push({ group: subQueries, hyphen: 'or' });
    return new IQLBuilder(this._iql);
  };

  where = (key: string, data: unknown, op: IQLWhereOperator = IQLWhereOperator.EQUAL) => {
    this._iql.where.push({ key, data, op });
    return new IQLBuilder(this._iql);
  };

  orderBy = (key, type: 'asc' | 'desc' = 'asc') => {
    this._iql.order.push({ key, type });
    return new IQLBuilder(this._iql);
  };

  whereIn = (key, data) => {
    return this.where(key, data, IQLWhereOperator.IN);
  };

  whereNot = (key, data) => {
    return this.where(key, data, IQLWhereOperator.NOT);
  };

  whereLike = (key, data) => {
    return this.where(key, data, IQLWhereOperator.LIKE);
  };

  toString = () => {
    const whereClause = this._iql.where.reduce((acc, where) => {
      const hyphen = where.hyphen ?? 'and'; // 默认条件连字符为 and

      // 处理子句查询 eg: or
      if (Array.isArray(where.group)) {
        const groupStatement = where.group.reduce(
          (acc, iql) => joinWithHyphen(acc, iql.toString(), hyphen),
          '',
        );
        // 子查询连词符为 and
        return joinWithHyphen(acc, `(${groupStatement})`, 'and');
      }

      const IQLWhereGenerator = IQLWhereClauseGenerators[where.op];
      return joinWithHyphen(acc, IQLWhereGenerator(where.key, where.data), hyphen);
    }, '');

    const orderClause = this._iql.order.reduce((acc, order) => {
      return acc + IQLOrderClauseGenerator(order.key, order.type, !acc);
    }, '');

    // 分隔符变为一个空格符
    return (whereClause + orderClause).trim().replace(/(\s{2,})/g, ' ');
  };
}

export interface SelectCase {
  type?: string;
  fieldType?: string;
  component: string;
  expression: string;
  fieldId: string;
  fieldName: string;
  key: string;
  value: string | number | any[];
  fieldLabel?: string[];
}

export type Selectors = Record<string, SelectCase>;

export type ItemSelectors = Selectors;

export type TestManageSelectors = Selectors;

export type SearchSelectors = [ItemSelectors, TestManageSelectors];

export type IQLCase = IQL;

export type IQLCaseFormatter = (selector: SelectCase, prefix?: string) => IQLCase;

export const replaceSingleQuote = (val: string): string => {
  // 将' 转义成 \’
  const reuslt = val.replace(/'/g, "\\'");
  return reuslt;
};

// type IQLCaseFormater = (selector: SelectCase) => IQL;

type OrderType = 'desc' | 'asc';

type OrderBy = {
  fieldName: string;
  orderType: OrderType;
};

const isCollection = type => FIELD_TYPE_KEY_MAPPINGS.FieldCollection === type;

export const getFieldCollectionRealValue = v =>
  isDate(v?.type) ? !!v?.value : !!v?.expression && !!v?.value;

// 判断是否是日期组件
export const isDate = (key: string): boolean => {
  return [
    FIELD_TYPE_KEY_MAPPINGS.CreatedAt,
    FIELD_TYPE_KEY_MAPPINGS.UpdatedAt,
    FIELD_TYPE_KEY_MAPPINGS.Date,
  ].includes(key);
};

const getCollectionValue = value => {
  if (Array.isArray(value)) {
    return JSON.stringify(value.map(v => v?.username || v));
  }
  return `'${value}'`;
};

// 字段集合 to iql: [xxx] => x and x and x
const toIqlCollection = (selector: SelectCase) => {
  const { value, fieldName } = selector;
  return (value as SelectCase[])
    ?.filter(getFieldCollectionRealValue)
    ?.map(item => {
      const condition = getCaseCondition(item);
      const isDateType = isDate(item.type);
      if (isDateType) return toIqlDateCase(item, fieldName);
      const _value = getCollectionValue(item.value);
      const iql = `'${fieldName}'.${item.fieldName} ${condition} ${_value}`;
      return iql;
    })
    ?.filter(Boolean)
    ?.join(IQL_CONDITION._AND_);
};

// 针对 Date 类型单独处理
const toIqlDateCase: IQLCaseFormatter = (selector, prefix) => {
  const { fieldName, value } = selector;
  const [startTime, endTime] = (value || []) as DateTimestampRang;
  // TODO iql不支持week查询
  const startDate = typeof startTime === 'number' ? startTime : `'${startTime}'`;
  const endDate = typeof endTime === 'number' ? endTime : `'${endTime}'`;
  return [
    startDate && `${fieldName} ${IQL_CONDITION.GREATER_THAN_EQUAL} ${startDate}`,
    endDate && `${fieldName} ${IQL_CONDITION.LESS_THAN_EQUAL} ${endDate}`,
  ]
    .map(item => (prefix ? `'${prefix}'.${item}` : item))
    .filter(Boolean)
    .join(IQL_CONDITION._AND_);
};

// 获取为 NULL 筛选项
const getNullValue = (value: any): any => {
  const nullValue = value.find(item => item.value === NULL);
  const nullIndex = value.findIndex(item => item.value === NULL);
  return {
    nullValue,
    nullIndex,
  };
};

// iql值转换
const getComponentValue: (selector: SelectCase) => componentValueProps = selector => {
  const { fieldName, component, expression, value: selectedValue } = selector;
  const isContainType = expression?.includes('_Contain');

  const useArray =
    isContainType &&
    !expression?.includes('Text_Contain') &&
    !expression?.includes('Text_Not_Contain');
  // 将包含条件 的值 都转成 数组
  const _value = useArray && !Array.isArray(selectedValue) ? [selectedValue] : selectedValue;

  const value = cloneDeep(_value);

  // 截取并存储值为NULL的数据
  let nullIql = '';
  if (useArray) {
    const { nullIndex } = getNullValue(value);
    if (nullIndex > -1) {
      (value as []).splice(nullIndex, 1);
      nullIql = `'${fieldName}' ${getNullCaseCondition(selector)} ${NULL}`;
    }
  }

  // 用户类型的 需要使用 用户名而非id
  if (['User', 'createdBy', 'updatedBy', 'Assignee', 'Reporter'].includes(component)) {
    const usernames = (value as { username: string }[])
      .map(user => {
        const name = user.username;
        // TODO，对函数的字符串处理
        if (name === 'currentUser') {
          return window.currentUser?.username;
        } else {
          return name;
        }
      })
      .filter(Boolean);
    const userGroupNameList = (value as { userGroupName: string }[])
      .filter(_user => !!_user.userGroupName)
      .map(_user => `membersOf(${_user?.userGroupName})`);
    // 包含条件的 就 使用数组
    if (useArray)
      return {
        curIqlValue: JSON.stringify([...usernames, ...userGroupNameList]),
        nullIql,
      };
    // 其他 条件直接使用用户名
    return { curIqlValue: `'${usernames[0] || userGroupNameList[0]}'`, nullIql };
  }

  // 空间类型、类型、事项组、优先级、绑定空间、状态类型 使用事项名称
  if (isUseOptionLabel(component)) {
    // 当条件是 属于_Contain 或 不属于_Not_Contain 时，需要支持多选
    if (isContainType) {
      return { curIqlValue: JSON.stringify((value as any[]).map(i => i.label || i)), nullIql };
    }
    return { curIqlValue: `'${value?.[0]?.label}'`, nullIql };
  }

  // 版本、迭代、下拉组件 使用事项值
  if (isUseOptionValue(component)) {
    // 当条件是 属于_Contain 或 不属于_Not_Contain 时，需要支持多选
    if (isContainType) {
      return { curIqlValue: JSON.stringify((value as any[]).map(i => i.value || i)), nullIql };
    }
    return { curIqlValue: `'${value?.[0]?.value}'`, nullIql };
  }
  if ([FIELD_TYPE_KEY_MAPPINGS.DataQuote].includes(component)) {
    return {
      curIqlValue: JSON.stringify(
        (value as any[]).reduce((pre, item) => pre.concat([item.key, item.name]), []),
      ),
      nullIql,
    };
  }

  // 如果值类型为 object 时，则进行兜底处理
  if (useArray && Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
    const getValFromSelector = data =>
      data ? data.value ?? data.objectId ?? data.label ?? data : null;

    if (isContainType) {
      return {
        curIqlValue: JSON.stringify((value as any[]).map(getValFromSelector)),
        nullIql,
      };
    }
    return { curIqlValue: `'${getValFromSelector(value?.[0])}'`, nullIql };
  }

  const nullValue = value === NULL ? null : `${value.toString()}`;

  return {
    curIqlValue: Array.isArray(value) ? `${JSON.stringify(value)}` : nullValue,
    nullIql,
  };
};

// iql 判断条件转换
const getCaseCondition: IQLCaseFormatter = selector => {
  const empty = '';
  const { expression, component } = selector;
  if (isDate(component)) return IQL_CONDITION.CONTAIN;
  if (!expression) return empty;
  if (expression.includes('Text_Contain')) return IQL_CONDITION.TEXT_CONTAIN;
  if (expression.includes('Text_Not_Contain')) return IQL_CONDITION.TEXT_NOT_CONTAIN;
  if (expression.includes('_Not_Equal')) return IQL_CONDITION.NOT_EQUAL;
  if (expression.includes('_Equal')) return IQL_CONDITION.EQUAL;
  if (expression.includes('_Not_Contain')) return IQL_CONDITION.NOT_CONTAIN;
  if (expression.includes('_Contain')) return IQL_CONDITION.CONTAIN;
  if (expression.includes('_Greater_Than')) return IQL_CONDITION.GREATER_THAN;
  if (expression.includes('_Less_Than')) return IQL_CONDITION.LESS_THAN;
  if (expression.includes('_Not_Empty')) return IQL_CONDITION.IS_NOT;
  if (expression.includes('_Empty')) return IQL_CONDITION.IS;
  return empty;
};

// iql 判断条件转换
const getNullCaseCondition: IQLCaseFormatter = selector => {
  const empty = '';
  const { expression } = selector;
  if (!expression) return empty;
  if (expression.includes('_Not_Contain')) return IQL_CONDITION.IS_NOT;
  if (expression.includes('_Contain')) return IQL_CONDITION.IS;
  return empty;
};

// iql NULL 值判断拼接条件转换
const getNullConnectCondition = (selector: SelectCase) => {
  const { expression } = selector;
  if (!expression) return '';
  if (expression.includes('_Not_Contain')) return IQL_CONDITION._AND_;
  if (expression.includes('_Contain')) return IQL_CONDITION._OR_;
  return '';
};

// 获取 最终 iql 条件
const getCurIqlValue = (fieldName: string, selector): IQL => {
  const condition = getCaseCondition(selector);
  const iql = getComponentValue(selector);
  const { curIqlValue = null, nullIql } = iql;
  const iqlBefore = `'${fieldName}' ${condition}`;
  // 确保 curIqlValue 不为空
  const hasCurlIql =
    curIqlValue?.length > 0 &&
    curIqlValue !== '[]' &&
    curIqlValue !== '{}' &&
    curIqlValue !== '[object Object]';
  if (hasCurlIql && nullIql) {
    return `(${iqlBefore} ${curIqlValue}${getNullConnectCondition(selector)}${nullIql})`;
  } else if (!hasCurlIql && nullIql) {
    return nullIql;
  }

  return `${iqlBefore} ${curIqlValue}`;
};

// 标题搜索 xx => (xx or yy)
const toIqlName = (selector: SelectCase) => {
  const { value, fieldLabel } = selector;
  const getIql = (label, val) => {
    if (!label?.length) return '';
    return label.reduce((prev, cur) => {
      const iql = `'${cur}' ${cur === 'key' ? '=' : '~'} '${val}'`;
      if (prev) {
        prev = `${prev} or ${iql}`;
      } else {
        prev = ` or ${iql}`;
      }
      return prev;
    }, '');
  };

  const costumeIql = fieldLabel?.filter(Boolean)?.length ? `${getIql(fieldLabel, value)}` : '';
  // or 'key' = '${value}'
  return value ? `('标题' ~ '${value}'${costumeIql})` : '';
};

// iql语句转换
const toIqlCase: IQLCaseFormatter = selector => {
  const { fieldName, fieldId, value, expression, component } = selector;
  const isDateType = isDate(component);
  const isNameType = fieldId === 'name';
  const isCollectionType = isCollection(component);

  if (
    isNil(value) ||
    (isNil(expression) && !isDateType && !isCollectionType) ||
    (isArray(value) && !value?.length)
  )
    return null;

  if (isDateType) return toIqlDateCase(selector);
  if (isNameType) return toIqlName(selector);
  if (isCollectionType) return toIqlCollection(selector);
  return getCurIqlValue(fieldName, selector);
};

export const buildOrderBy = (orderBys: OrderBy[]): IQL =>
  orderBys?.length
    ? ` ${IQL_CONDITION.ORDER_BY} ${orderBys
        .map(orderBy => `${orderBy.fieldName} ${orderBy.orderType}`)
        .join(',')}`
    : '';

// 选择器转IQL
export const selectorToIql = (selectors: Selectors): IQL => {
  if (isEmpty(selectors)) return null;
  const orderSelector = selectors[IQL_CONDITION.ORDER_BY];
  const _selectors = omit(selectors, IQL_CONDITION.ORDER_BY);
  let str = Object.keys(_selectors)
    .sort()
    .map(selectorKey => {
      const selector = selectors[selectorKey];
      if (!selector) return;
      if (typeof selector === 'string') {
        return `标题 ${IQL_CONDITION.TEXT_CONTAIN} '${replaceSingleQuote(selector)}'`;
      }

      return toIqlCase(selector);
    })
    .filter(Boolean)
    .join(IQL_CONDITION._AND_);

  // 添加排序
  if (orderSelector) {
    str += buildOrderBy(orderSelector.value as OrderBy[]);
  }
  return str;
};

/**
 * 合并IQL语句
 *
 * 如果 源IQL 带有排序信息 就用原来的排序
 * 如果没有就用 目标IQL 的排序
 *
 * @param sourceIQL 源IQL
 * @param targetIQL 目标IQL
 * @returns 合并后的IQL
 */
export const mergeIQL = (sourceIQL: IQL, targetIQL: IQL): IQL => {
  const source = sourceIQL?.trim?.();
  const target = targetIQL?.trim?.();
  if (!source) return target;
  if (!target) return source;
  const [prevIql, prevOrderBy] = source.split(IQL_CONDITION.ORDER_BY);
  const [currentIql, currentOrderBy] = target.split(IQL_CONDITION.ORDER_BY);
  const result = [prevIql, currentIql]
    .filter(value => value?.trim())
    .map(value => `(${value})`)
    .join(IQL_CONDITION._AND_);
  const orderBy = currentOrderBy || prevOrderBy;
  if (!orderBy) return result;
  return `${result} ${IQL_CONDITION.ORDER_BY} ${orderBy}`;
};

const iqlFunctions = ['linkedItemsOf'];

enum IndexErrorCode {
  NOT_FOUND = -1,
  NOT_MATCH_END = -3,
  NOT_MATCH_START = -2,
}

const INDEX_ERRORS: IndexErrorCode[] = [-1, -2, -3];

/**
 * 排除IQL函数体里面的内容
 * @param iql IQL
 * @returns 排除后的IQL
 */
export const excludeIqlFunctionContext = (iql: IQL): IQL => {
  if (!iql) return '';
  const result = iqlFunctions.reduce((prevIql, funcKey) => {
    const funcKeyIndex = iql.indexOf(funcKey);
    if (funcKeyIndex === IndexErrorCode.NOT_FOUND) return prevIql;
    const functionStartIndx = funcKeyIndex + funcKey.length;
    const functionEndIndex = matchBracket(prevIql, functionStartIndx);
    if (INDEX_ERRORS.includes(functionEndIndex)) return prevIql;
    prevIql = [...prevIql.slice(0, functionStartIndx + 1), ...prevIql.slice(functionEndIndex)].join(
      '',
    );
    return prevIql;
  }, iql);
  return result;
};

export const hasWorkspace = (iql: IQL): boolean => !!iql?.includes('所属空间');

export const hasItemType = (iql: IQL): boolean => !!iql?.includes('类型');

// 给IQL加上默认空间
export const withWorkspace = (iql: IQL, workspaceKey): IQL => {
  const workspaceCase =
    workspaceKey &&
    !hasWorkspace(excludeIqlFunctionContext(iql)) &&
    `workspaceKey ${IQL_CONDITION.EQUAL} '${workspaceKey}'`;
  const result = mergeIQL(iql, workspaceCase);
  return result;
};

// 给IQL加上默认类型
export const withItemType = (iql: IQL, itemType: string): IQL => {
  const itemTypeCase =
    itemType &&
    !hasItemType(excludeIqlFunctionContext(iql)) &&
    `itemTypeKey ${IQL_CONDITION.EQUAL} '${itemType}'`;
  const result = mergeIQL(iql, itemTypeCase);
  return result;
};

// 给IQL加上id
export const withItemId = (iql: IQL, itemIds: string[]): IQL => {
  if (!itemIds?.length) return iql;
  const itemTypeCase = `id ${IQL_CONDITION.CONTAIN} [${itemIds.map(id => `'${id}'`).join(',')}]`;
  const result = mergeIQL(iql, itemTypeCase);
  return result;
};

// 根据筛选器，拼接query
export const simpleToParse = (query, selector: SelectCase) => {
  if (isEmpty(selector)) return;
  const { component, expression, value, fieldId } = selector;
  const ids = (value as any)?.map(item => item.value);
  if (!ids?.length) return;
  // 是否有未分组的值
  const hasNullValue = ids.includes(SelectorNullValue);
  if (component === 'User') {
    if (expression.split(`${component}_`).join('') === 'Contain') {
      if (hasNullValue) {
        query.matchesKeyInQuery(
          'objectId',
          'objectId',
          Parse.Query.or(
            new Parse.Query(Test).doesNotExist(fieldId.split('test_').join('')),
            new Parse.Query(Test).containedIn(
              fieldId.split('test_').join(''),
              ids.map(id => User.createWithoutData(id)),
            ),
          ),
        );
      } else {
        query.containedIn(
          fieldId.split('test_').join(''),
          ids.map(id => User.createWithoutData(id)),
        );
      }
    } else {
      if (hasNullValue) {
        query.notContainedIn(
          fieldId.split('test_').join(''),
          ids.map(id => User.createWithoutData(id)),
        );
      } else {
        query.matchesKeyInQuery(
          'objectId',
          'objectId',
          Parse.Query.or(
            new Parse.Query(Test).notContainedIn(
              fieldId.split('test_').join(''),
              ids.map(id => User.createWithoutData(id)),
            ),
            new Parse.Query(Test).doesNotExist(fieldId.split('test_').join('')),
          ),
        );
      }
    }
  } else if (component === RepositoryModel) {
    // 未分组用例查询
    const notExistedRepositoryQuery = new Parse.Query(Test).doesNotExist('repository');
    const deletedRepositoryQuery = new Parse.Query(Test).doesNotMatchKeyInQuery(
      'repository',
      'objectId',
      new Parse.Query(Repository),
    );
    // 所属模块
    if (expression.split(`${component}_`).join('') === 'Contain') {
      if (hasNullValue) {
        // 存在未分组的用例需要将未分组的查询条件带上
        query.matchesKeyInQuery(
          'objectId',
          'objectId',
          Parse.Query.or(
            deletedRepositoryQuery,
            notExistedRepositoryQuery,
            new Parse.Query(Test).containedIn('repository', ids),
          ),
        );
      } else {
        query.containedIn('repository', ids);
      }
    } else {
      if (!hasNullValue) {
        query.matchesKeyInQuery(
          'objectId',
          'objectId',
          Parse.Query.or(
            deletedRepositoryQuery,
            notExistedRepositoryQuery,
            new Parse.Query(Test).notContainedIn('repository', ids),
          ),
        );
      } else {
        query.doesNotMatchKeyInQuery(
          'objectId',
          'objectId',
          Parse.Query.or(
            deletedRepositoryQuery,
            notExistedRepositoryQuery,
            new Parse.Query(Test).containedIn('repository', ids),
          ),
        );
      }
    }
  }
};

export const selectorToParse = (query, selectors) => {
  if (!isEmpty(selectors)) {
    const selectorValues = Object.values(selectors);
    let userQuery = null;
    selectorValues.forEach((selector: SelectCase) => {
      const { component } = selector;
      if (component === 'User') {
        // 执行人和最新操作执行人
        if (!userQuery) {
          userQuery = new Parse.Query(Test).equalTo('type', 'TestRun');
        }
        simpleToParse(userQuery, selector);
      } else if (component === RepositoryModel) {
        simpleToParse(query, selector);
      }
    });
    if (userQuery) {
      query.matchesKeyInQuery('objectId', 'runReferenceDetail', userQuery);
    }
  }
  return query;
};

/** 处理筛选器最新执行人字段 */
export const handleCustomerSelector = selectors => {
  const [systemSelector, customSelector] = selectors;
  const _customSelector = omit(customSelector, TestCaseStatusModel);
  const runStatusSelector = pick(customSelector, TestCaseStatusModel);

  return {
    selector: [systemSelector, _customSelector] as SearchSelectors,
    runStatusSelector,
  };
};

export const getTestCaseStatusModelValue = (runStatusSelector, status = []) => {
  const { value, expression } = runStatusSelector[TestCaseStatusModel];
  status = value.map(v => v.value).filter(v => v !== 'NULL');

  return {
    isExclude: FILTER_EXPR_NAME.Test_Status_Contain !== expression,
    status: status?.length ? status : null,
  };
};
