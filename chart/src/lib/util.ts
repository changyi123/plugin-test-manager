import { i18n } from 'proxima-sdk/lib/I18n';
import { mergeIQL } from 'proxima-sdk/lib/Iql';

import { ESResultFormatTmp, GlobalIqlFilterCond, ReportBody, ReportFormula } from './type';

// 是否是总计小计的行列
export const isIncludeTotal = function (str) {
  return (
    String(str).includes(i18n.t('reportPlugin.basicTableChart.util.subtotal') || '小计') ||
    String(str).includes(i18n.t('reportPlugin.basicTableChart.util.total') || '总计')
  );
};

// 是否是合法UUID
export const isValidUUID = function (str) {
  const regexExp = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;

  return regexExp.test(str);
};

// 阻止冒泡事件并且打开新的标签页
export const openNewTabWithoutBubble = (e, url) => {
  e.stopPropagation();
  e.preventDefault();
  if (url) {
    window.open(url, '_blank');
  }
};

// 获取图表当前页面已打开的全局筛选的条件
export const getOpenSwitchGlobalSearchIql = (
  relatedCacheIqlFilters: GlobalIqlFilterCond[],
): string => {
  const allRelatedIqls = relatedCacheIqlFilters?.map(relatedIqlFilterCond => {
    if (!relatedIqlFilterCond.disable) {
      return relatedIqlFilterCond.iql;
    }
  });

  // 如无关联全局筛选条件，无需更新图表
  if (!allRelatedIqls.length) return '';
  return allRelatedIqls.reduce((prevIql, nextIql) => mergeIQL(prevIql, nextIql));
};

export const getEnvData = (): EnvData => {
  const QianKunProps = window.QiankunProps;
  if (QianKunProps) {
    return {
      PROXIMA_APP_ID: QianKunProps?.context?.env?.PROXIMA_APP_ID,
      PROXIMA_GATEWAY: QianKunProps?.context?.env?.PROXIMA_GATEWAY,
      PROXIMA_BASE_PATH: (window as any).env.PROXIMA_BASE_PATH,
      GITEE_ONE_GATEWAY: (window as any).env.GITEE_ONE_GATEWAY,
      TENANT_KEY: QianKunProps?.context?.env?.TENANT_KEY,
      APP_KEY: QianKunProps?.frame?.app?.key,
    };
  } else {
    const env = window.proxy?.env ?? window?.env;
    return {
      PROXIMA_APP_ID: env?.PROXIMA_APP_ID,
      PROXIMA_GATEWAY: env?.PROXIMA_GATEWAY,
      PROXIMA_BASE_PATH: env?.PROXIMA_BASE_PATH,
      GITEE_ONE_GATEWAY: env?.GITEE_ONE_GATEWAY,
      TENANT_KEY: env?.TENANT_KEY,
      APP_KEY: env?.APP_KEY,
    };
  }
};

// 是否是合法的计算列字段名
export const isValidFormulaName = function (str) {
  const regexExp = /^[0-9A-Za-z_\u4e00-\u9fa5]+$/;

  return regexExp.test(str);
};

function getFormulasMap(
  body: ReportBody,
  result: ESResultFormatTmp,
): Map<string, Map<string, string[]>> {
  const formulas = body.formulas;
  const formulasMap = new Map();
  if (result.cluster) {
    // 合并cluster数组为一个数组
    const clusterList = result.cluster.reduce((pre, cur) => {
      return pre.concat(cur);
    }, []);
    for (let i = 0; i < formulas.length; i++) {
      const formulaMap = new Map();
      const formula = formulas[i];
      // 获取公式中所有单引号的字符串
      const strList = formula.formula.match(/'[^']*'/g);
      strList?.forEach(str => {
        let firstKey = undefined;
        let secondkey = undefined;
        for (const cluster of clusterList) {
          for (const value of body.value) {
            // 为处理表达式中包含 . 的情况，轮循拼接变量，直接命中表达式
            if (`'${cluster}.${value.name}'` === str) {
              firstKey = cluster;
              secondkey = value.key;
              formulaMap.set(str, [firstKey, secondkey]);
              return;
            }
          }
        }
        throw new Parse.Error(
          Parse.Error.VALIDATION_ERROR,
          `The parameter named ${str} which used to calculate column is error`,
        );
      });
      formulasMap.set(formula.name, formulaMap);
    }
  }
  return formulasMap;
}

function computeFormula(formula: ReportFormula, valueMap: Map<string, string>): string {
  let formulaStr = formula.formula;
  const prec = formula.precision;
  const type = formula.type;
  // 循环valueMap，替换公式中的变量
  valueMap.forEach((value, key) => {
    while (formulaStr.includes(key)) {
      formulaStr = formulaStr.replace(key, value);
    }
  });
  try {
    let resultStr;
    let result = Number(eval(formulaStr)) || 0;
    if (result === Infinity) {
      // throw new Parse.Error(Parse.Error.INVALID_QUERY, '除数为 0');
      result = 0; // 除数为 0
    }
    // 判断type是否为percentage，如果是，则乘以100
    if (type === 'percentage') {
      result = result * 100;
    }
    // 判断precision是否为空，如果为空，则直接返回result
    if (!prec) {
      resultStr = result.toString();
    }
    if (prec === 0) {
      resultStr = result.toFixed(0);
    } else {
      resultStr = (Math.round(result * Math.pow(10, prec)) / Math.pow(10, prec)).toFixed(prec);
    }
    if (type === 'percentage') {
      return resultStr + '%';
    } else {
      return resultStr;
    }
  } catch (e) {
    console.error('Calculation formula execution error', e);
    return undefined;
  }
}

/**
 * 计算列
 * @param resultList
 */
export function computeColumn(body: ReportBody, result: ESResultFormatTmp): ESResultFormatTmp {
  const formulasMap = getFormulasMap(body, result);
  // 判断formulasMap是否为空，如果为空，则直接返回result
  if (formulasMap.size === 0) {
    return result;
  }
  const formulas = body.formulas;
  // 将formulas中name组成数组，并加入result的cluster中
  const formulasName = [];
  for (const formula of formulas) {
    formulasName.push(formula.name);
  }
  result.cluster.push(formulasName);
  formulas.forEach(formula => {
    const formulaMap = formulasMap.get(formula.name);
    // 循环data二维数组，计算公式
    for (let i = 0; i < result.data.length; i++) {
      const row = result.data[i];
      for (let j = 0; j < row.length; j++) {
        const cell = row[j];
        // cell key是第一个字符串，value中包含第二个字符串。
        // 循环formulaMap，创建一个新的map，key是formulaMap的key，value是cell中的value
        const newMap = new Map();
        formulaMap.forEach((value, key) => newMap.set(key, cell[value[0]]?.[value[1]] || 0)); // 计算列取不到时使用默认取0
        // 公式计算结果，代入
        const computeValue = computeFormula(formula, newMap);
        if (computeValue !== undefined) {
          // 将计算结果有效时放入cell中
          cell[formula.name] = computeValue;
        }
      }
    }
  });
  return result;
}
