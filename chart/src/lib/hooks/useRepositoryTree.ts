import { isEqual, uniqWith } from 'lodash';
import { useToken } from 'proxima-sdk/hooks/Hooks';
import fetch from 'proxima-sdk/lib/Fetch';
import { useEffect, useState } from 'react';

import { computeColumn, getEnvData } from '../util';

// 获取仓库树形结构
function fetchRepositoryTree(params) {
  const { PROXIMA_GATEWAY, PROXIMA_APP_ID } = getEnvData();

  return fetch.$post(
    `${PROXIMA_GATEWAY}/api/app/${PROXIMA_APP_ID}/test_manager/webhooks/api-module-repository-tree-v2`,
    params,
  );
}

export function useRepositoryTree(workspace) {
  const [loading, setLoading] = useState(true);
  const { sessionToken } = useToken();
  const [data, setData] = useState([]);
  useEffect(() => {
    if (!sessionToken || !workspace?.key) return;
    setLoading(true);
    fetchRepositoryTree({ sessionToken, workspaceKey: workspace?.key }).then(res => {
      setData(res.data);
      setLoading(false);
    });
  }, [sessionToken, workspace?.key]);
  return { loading, data };
}

function getParentRepositoryNameFromId(t, id: string, treeData) {
  let res = '';
  function getName(data) {
    let _res = '';
    if (id === data.key) {
      return data.name;
    }
    if (data.children?.length) {
      data.children.some(i => {
        const name = getName(i);
        if (name) {
          _res = name;
          return true;
        }
      });
    }
    return _res;
  }
  treeData?.children?.some(data => {
    const name = getName(data);
    if (name) {
      res = data.name;
      return true;
    }
  });
  return res;
}

// 数值合并
function add(a, b) {
  let res = '';
  // 是否有百分号
  const hasPercent = a.indexOf('%') > -1 || b.indexOf('%') > -1;
  const toNumber = (c) => {
    if (typeof c === 'string') {
      return Number(c.replace('%', ''));
    }
    return c;
  };
  res = `${toNumber(a) + toNumber(b)}`;
  if (hasPercent) {
    res += '%';
  }
  return res;
}

// 构建新的数据树
export function buildRepositoryStatics(t, statisticsData, treeData, params) {
  if (!statisticsData) return statisticsData;
  const {
    payload: { data: _data },
  } = statisticsData;
  const data = [];
  function updateCache(_statics) {
    const statics = [];
    _statics.forEach(i => {
      // 通过当前模块的id，获取父仓库的名称
      const name =
        i.name === 'root'
          ? t('views.gantt.default.groupedValue')
          : getParentRepositoryNameFromId(t, i.name, treeData) ||
            t('views.gantt.default.groupedValue');
      const targetIndex = statics.findIndex(s => s.name === name);
      // 不存在推送新值
      if (targetIndex === -1) {
        statics.push({ ...i, name });
      } else {
        // 对每一个值做加法
        const allKeys = Object.keys(i);
        allKeys.forEach(k => {
          if (k === 'name') return;
          if (typeof i[k] !== 'object') return;
          if (!statics[targetIndex][k]) {
            if (typeof i[k] === 'string') {
              statics[targetIndex][k] = add(statics[targetIndex][k], i[k]);
            } else {
              statics[targetIndex][k] = i[k];
            }
          } else {
            if (typeof statics[targetIndex][k] === 'object') {
              statics[targetIndex][k].count += i[k].count;
            } else {
              statics[targetIndex][k] = add(statics[targetIndex][k], i[k]);
            }
          }
        });
      }
    });
    // 组装数据
    data.push(statics);
  }
  _data.forEach(i => updateCache(i));
  // 计算结果
  const payload = computeColumn(
    JSON.parse(JSON.stringify(params)),
    JSON.parse(JSON.stringify({ ...statisticsData.payload, data })),
  );
  return { payload: { ...payload, cluster: uniqWith(payload.cluster, isEqual) } };
}
