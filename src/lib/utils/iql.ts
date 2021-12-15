type Dash = '' | 'and' | 'or';

enum IQLWhereOperator {
  IN = 'IN',
  NOT = 'NOT',
  EQUAL = 'EQUAL',
}

/**
 * 条件生成
 */
const IQLWhereClauseGenerators: Record<IQLWhereOperator, (...args: any[]) => string> = {
  [IQLWhereOperator.IN]: (key: string, data: string[], operator: Dash = '') => {
    if (!Array.isArray(data)) return '';
    console.log(data.toString());
    return `${operator} ${key} in [${data.toString().replace(/([^,]+)(?=$|,)/g, `'$1'`)}]`;
  },
  [IQLWhereOperator.EQUAL]: (key: string, data: string, operator: Dash = '') => {
    if (!data) return '';
    return `${operator} ${key} = '${data}'`;
  },
  [IQLWhereOperator.NOT]: (key: string, data: string, operator: Dash = '') => {
    if (!data) return '';
    return `${operator} ${key} is not '${data}'`;
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

  where = (key: string, data: unknown, op: IQLWhereOperator = IQLWhereOperator.EQUAL) => {
    this._iql.where.push({ key, data, op });
    console.log('this._iql', key, this._iql);
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

  toString = () => {
    const whereClause = this._iql.where.reduce((acc, where) => {
      const IQLWhereGenerator = IQLWhereClauseGenerators[where.op];
      return acc + IQLWhereGenerator(where.key, where.data, acc ? 'and' : '');
    }, '');

    const orderClause = this._iql.order.reduce((acc, order) => {
      return acc + IQLOrderClauseGenerator(order.key, order.type, !acc);
    }, '');

    // 分隔符变为一个空格符
    return (whereClause + orderClause).trim().replace(/[^'](\s{2,})[^']/g, ' ');
  };
}
