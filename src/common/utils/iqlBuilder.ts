export const enum Operator {
  Equal = '=',
  NotEqual = '!=',
  In = 'in',
  NotIn = 'not in',
  Like = '~',
  GreaterThan = '>',
  GreaterThanEqual = '>=',
  LessThan = '<',
  LessThanEqual = '<=',
  DateRange = 'DateRange',
}
export const enum Composition {
  And = 'and',
  Or = 'or',
}
export const enum OrderKeyword {
  DESC = 'desc',
  ASC = 'asc',
}

/** 条件处理 */
const whereProcessor = (column, value, operator: Operator) => {
  switch (operator) {
    case Operator.In:
    case Operator.NotIn:
      value = Array.isArray(value) ? value : [value];
      return `'${column}' ${operator} [${value.map(val => `"${val}"`).join(', ')}]`;
    case Operator.Like:
    case Operator.Equal:
    case Operator.NotEqual:
      if (typeof value === 'number') return `'${column}' ${operator} ${value}`;
      return `'${column}' ${operator} "${value}"`;
    case Operator.GreaterThan:
    case Operator.GreaterThanEqual:
    case Operator.LessThan:
    case Operator.LessThanEqual:
      // value 不为 number 类型则忽略此条件
      return typeof value === 'number' ? `'${column}' ${operator} "${value}"` : '';
    case Operator.DateRange:
      return Array.isArray(value)
        ? `'${column}' >= '${value[0]}' and '${column}' <= '${value[1]}'`
        : '';
  }
};

const OrderProcessor = (column, order: OrderKeyword) => {
  return `${column} ${order}`;
};

const utils = {
  isIQLBuilder: arg => arg instanceof IQLBuilder,
};

export default class IQLBuilder {
  _context = {
    where: [],
    order: [],
  };

  // 兼容子条件查询
  where = (
    column: string | IQLBuilder,
    value?: any,
    operator?: Operator,
    composition?: Composition,
  ) => {
    if (utils.isIQLBuilder(column)) {
      this._context.where.push({
        operator,
        builder: column,
        composition: value ?? Composition.And,
      });
      return this;
    } else if (column && !value && !operator && composition) {
      // 处理子句聚合查询
      this._context.where.push({
        iqlStr: column,
        composition,
      });
      return this;
    }

    // 处理 value 为数组类型的值的操作符
    if (Array.isArray(value) && !operator) {
      operator = Operator.In;
    }

    this._context.where.push({
      value,
      column,
      composition: composition ?? Composition.And,
      operator: operator ?? Operator.Equal,
    });

    return this;
  };

  order = (column: string | { type: OrderKeyword; column: string }) => {
    let order = null;
    if (typeof column === 'string') {
      // 倒序
      if (column.startsWith('-')) {
        order = {
          type: OrderKeyword.DESC,
          column: column.replace(/^-/, ''),
        };
      } else {
        order = {
          type: OrderKeyword.ASC,
          column: column,
        };
      }
    } else if (column?.type && column?.column) {
      order = column;
    }
    order && this._context.order.push(order);
  };

  and = (...ops: (IQLBuilder | string)[]) => this._composition(Composition.And, ...ops);
  or = (...ops: (IQLBuilder | string)[]) => this._composition(Composition.Or, ...ops);

  _composition(composition: Composition, ...ops: (IQLBuilder | string)[]) {
    if (ops.length < 2) return;
    ops.forEach(op => {
      const where = {} as any;

      if (utils.isIQLBuilder(op)) {
        where.builder = op;
      } else {
        where.iqlStr = op;
      }

      this._context.where.push({
        ...where,
        composition,
      });
    });
    return this;
  }

  build = () => {
    const iqlWhereString = this._context.where.reduce((iql, where) => {
      const { column, value, operator, composition, builder, iqlStr } = where;
      let isComplexSubIql = false;
      let sub = '';
      if (builder) {
        sub = builder.build();
        isComplexSubIql = true;
      } else if (iqlStr) {
        sub = iqlStr;
        isComplexSubIql = true;
      } else {
        sub = whereProcessor(column, value, operator);
      }

      if (isComplexSubIql) {
        sub = `(${sub})`;
      }

      return iql ? `${iql} ${composition} ${sub}` : sub;
    }, '');

    const iqlOrderString = this._context.order.reduce((iql, order, index) => {
      const orderSyntaxStr = !iql ? 'order by' : '';
      const endToken = index + 1 !== this._context.order.length ? ',' : '';
      return `${iql}${orderSyntaxStr} ${OrderProcessor(order.column, order.type)}${endToken}`;
    }, '');

    return `${iqlWhereString} ${iqlOrderString}`;
  };
}
