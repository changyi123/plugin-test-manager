import createProximaSdk from '@giteeteam/proxima-sdk-js';
import { message } from 'antd';
import axios from 'axios';
import React, { FC, useCallback } from 'react';

import { useGetWorkspaceKeyById } from '@/hooks';
import { t } from '@/i18n';
import { getPluginWebTriggerBaseUrl } from '@/utils';

import { CellProp } from '../types';

const pluginWebTriggerBaseUrl = getPluginWebTriggerBaseUrl();
// 关联查询
export const getLinkedTestEntityByQuery = async props => {
  const _props = Object.assign({ descending: [], onlySelectId: false }, { ...props });
  const {
    data: { data },
  } = await axios.post(`${pluginWebTriggerBaseUrl}/api-query-linked-test-entity`, {
    ..._props,
  });
  return {
    list: data.list ?? [],
    total: data.total ?? 0,
  };
};

const proxima = createProximaSdk();

const Cell: FC<CellProp> = props => {
  const { value, workspaceId, itemId } = props;
  const workspaceKey = useGetWorkspaceKeyById(workspaceId);

  // 查询所有关联的测试用例
  const getSearchIQL = useCallback(async () => {
    const querySize = 50000;
    // 测试执行的用例范围
    const { list: runs } = await getLinkedTestEntityByQuery({
      query: {
        workspaceKey: workspaceKey,
      },
      limit: querySize,
      linkType: 'RunLinkExecution',
      sourceIds: [itemId],
      destinationType: 'TestRun',
      select: ['id', 'referenceCase', 'referenceCaseSnapshot'],
    });
    const caseIds = (runs || []).map(item => item.referenceCase).filter(Boolean);
    const snapshotIds = (runs || []).map(item => item.referenceCaseSnapshot).filter(Boolean);
    let result = '';
    if (caseIds?.length) {
      result += `(id in [${caseIds.map(item => `'${item}'`).join(',')}])`;
    }
    if (snapshotIds?.length) {
      if (result) {
        result += ' or ';
      }
      result += `(id in [${snapshotIds
        .map(item => `'${item}'`)
        .join(',')}] and 'baseLineSources' in ['BaseLineItemVersion'])`;
    }
    return result;
  }, [itemId, workspaceKey]);
  const showItemDataQuotoListModal = useCallback(async () => {
    // 如果关联测试用例为0，则直接返回
    if (!value || !workspaceKey) {
      return;
    }
    const iql = await getSearchIQL();
    if (!iql) {
      message.error(t('dataHasRemove'));
      return;
    }
    proxima.execute('openItemDataQuoteListModal', {
      iql,
      visible: true,
    });
  }, [value, workspaceKey, getSearchIQL]);

  return (
    <div className="field-cell-layout">
      <a
        onClick={showItemDataQuotoListModal}
        className="tooltip-overflow tooltip-maxline-1"
        title={value}
      >
        {value}
      </a>
    </div>
  );
};

export default Cell;
