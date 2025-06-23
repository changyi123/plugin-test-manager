import { useSDK } from '@projectproxima/plugin-sdk';
import createProximaSdk from '@projectproxima/proxima-sdk-js';
import React, { FC, useCallback } from 'react';

import getDevConfig from '../../../../src/app/devEnv';
import { getLinkedTestEntityByQuery } from '../../../../src/app/lib/api/item';
import { TestLinkType, TestType } from '../../../../src/common/constant';
import { getEnv } from '../../../../src/common/utils/helper';
import { CellProp } from '../types';

const proxima = createProximaSdk();

const Cell: FC<CellProp> = props => {
  const { value, itemId } = props;
  const { context } = useSDK();
  const workspaceKey = context?.env?.WORKSPACE_KEY ?? getDevConfig().workspaceKey;
  // 查询所有关联的测试用例
  const getAllLinkedCase = useCallback(async () => {
    const querySize = getEnv()?.QUERY_SIZE ?? 50000;
    // 测试执行的用例范围
    const { list: runs } = await getLinkedTestEntityByQuery({
      query: {
        workspaceKey: workspaceKey,
      },
      limit: querySize,
      linkType: TestLinkType.RunLinkExecution,
      sourceIds: [itemId],
      destinationType: TestType.Run,
      select: ['id', 'referenceCase', 'referenceCaseSnapshot'],
    });
    return (runs || []).map(item => item.referenceCase);
  }, [itemId, workspaceKey]);

  const showItemDataQuotoListModal = useCallback(async () => {
    // 如果关联测试用例为0，则直接返回
    if (!value) {
      return;
    }
    const list = await getAllLinkedCase();
    proxima.execute('openItemDataQuoteListModal', { list, visible: true });
  }, [value, getAllLinkedCase]);

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
