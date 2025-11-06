import { useEffect, useState } from 'react';

import Cache, { CACHE_KEY } from '../cache';
import { AllGlobalIqlFilterConds, GlobalIqlFilterCond } from '../type';

const useGlobalFilterIql = (
  uid: string,
): [GlobalIqlFilterCond[], React.Dispatch<React.SetStateAction<GlobalIqlFilterCond[]>>] => {
  // 编辑页全局筛选回显关联数据, setGlobalFiltersIql作用仅控制开关对应的全局筛选器
  const [globalFiltersIql, setGlobalFiltersIql] = useState<GlobalIqlFilterCond[]>([]);

  // 基础报表全局筛选关联图表数据信息回显
  useEffect(() => {
    // 获取缓存中的全局筛选器的值
    const allCacheIqlFilterConds: AllGlobalIqlFilterConds = Cache.getCacheItem(
      CACHE_KEY.BASE_GLOBAL_SEARCH_IQL_CONDS,
    );
    if (allCacheIqlFilterConds) {
      // 判断该图表有无相关的全局筛选条件
      const hasRelatedCharts = Object.values(allCacheIqlFilterConds).some(item => {
        const relatedCharts = item.relatedCharts;
        return relatedCharts && uid in relatedCharts;
      });

      // 有则把每个图表的筛选条件存起来，并默认开启全局筛选器
      if (hasRelatedCharts) {
        const globalIqlFilterConds = [];
        for (const key in allCacheIqlFilterConds) {
          const cacheIqlFilterConds = allCacheIqlFilterConds[key];
          const relatedCharts = cacheIqlFilterConds.relatedCharts;
          if (uid in relatedCharts) {
            // 图表进入详情编辑页面时，每个全局筛选器默认全部开启；
            cacheIqlFilterConds.disable = false;
            globalIqlFilterConds.push(cacheIqlFilterConds);
          }
        }
        setGlobalFiltersIql(globalIqlFilterConds);
      } else {
        setGlobalFiltersIql([]);
      }
    }
  }, [uid]);

  return [globalFiltersIql, setGlobalFiltersIql];
};

export default useGlobalFilterIql;
