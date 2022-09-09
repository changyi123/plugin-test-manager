export const enum Operator {
  Equal = '=',
  NotEqual = '!=',
  In = 'in',
  NotIn = 'not in',
  Like = '~',
  GreaterThan = '>',
  GreaterThanEqual = '>=',
  LessThan = '>',
  LessThanEqual = '<=',
}
export const enum Composition {
  And = 'and',
  Or = 'or',
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
  }
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
    value?: any | Composition,
    operator?: Operator,
    composition?: Composition,
  ) => {
    if (utils.isIQLBuilder(column)) {
      this._context.where.push({
        builder: column,
        composition: value ?? Composition.And,
      });
      return this;
    } else if (column && !value) {
      this._context.where.push({
        iqlStr: column,
      });
      return this;
    }

    if (Array.isArray(value)) {
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
    const whereIQLString = this._context.where.reduce((iql, where) => {
      const { column, value, operator, composition, builder, iqlStr } = where;
      let sub = '';
      if (builder) {
        sub = `(${builder.toString()})`;
      } else if (iqlStr) {
        sub = iqlStr;
      } else {
        sub = whereProcessor(column, value, operator);
      }

      if (!iql) return sub;

      sub = `(${iql}) ${composition} (${sub})`;

      return sub;
    }, '');

    return whereIQLString;
  };
}
