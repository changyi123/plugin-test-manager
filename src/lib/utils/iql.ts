type Hyphen = '' | 'and' | 'or';

enum IQLWhereOperator {
  IN = 'IN',
  NOT = 'NOT',
  EQUAL = 'EQUAL',
  LIKE = 'LIKE',
}

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
