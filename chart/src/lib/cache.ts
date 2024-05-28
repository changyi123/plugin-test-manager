const CACHE_KEY = {
  /**
   * @descripition
   * 业务：结合全局筛选使图表编辑和查看页数据一致
   * 对应缓存值：{
   *  [筛选器id]: {
   *    iql: 'xxx' // iql查询语句
   *    relatedCharts: {
   *       [图表id]: { id: 图表id, name: 图表名称 },
   *       ...
   *    }
   *  },
   *  ...
   * }
   */
  BASE_GLOBAL_SEARCH_IQL_CONDS: 'BASE_GLOBAL_SEARCH_IQL_CONDS',
  /**
   * @descripition
   * 业务：结合全局筛选使查看详情页的导出数据需跟当前全局筛选开关器一致
   * 对应缓存值：{
   *  [筛选器id]: 'xxx' // iql查询语句
   *  },
   *  ...
   * }
   */
  BASE_GLOBAL_SEARCH_IQL_CONDS_WITH_OPEN_SWITCH: 'BASE_GLOBAL_SEARCH_IQL_CONDS_WITH_OPEN_SWITCH',
};

class Cache {
  private cache;

  constructor() {
    this.initCacheObj();
  }

  initCacheObj() {
    if (!(window as any).proxima_plugin_chart_app_cahce) {
      (window as any).proxima_plugin_chart_app_cahce = {};
    }
    this.cache = (window as any).proxima_plugin_chart_app_cahce;
  }

  setCacheItem(key: string, value: any) {
    if (!this.cache) {
      this.initCacheObj();
    }
    this.cache[key] = value;
  }

  getCacheItem(key: string) {
    if (!this.cache) {
      this.initCacheObj();
    }
    return this.cache[key];
  }

  removeCacheItem(key: string) {
    delete this.cache[key];
  }

  cacheClear() {
    this.cache = null;
  }
}

export { CACHE_KEY };

export default new Cache();
