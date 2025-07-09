import { useSDK } from '@giteeteam/plugin-sdk';
import createProximaSdk from '@giteeteam/proxima-sdk-js';
import { TestLinkType, TestType } from 'common/constant';
import React, { FC, useCallback } from 'react';

import { getLinkedTestEntityByQuery } from '@/lib/api/item';

import { CellProp } from '../types';
const proxima = createProximaSdk();

const Cell: FC<CellProp> = props => {
  const { text, itemId } = props;
  const workspaceKey = useSDK()?.context?.env?.WORKSPACE_KEY;

  // 查询所有关联的测试用例
  const getAllLinkedCase = useCallback(async () => {
    const querySize = 50000;
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
    if (!text || !workspaceKey) {
      return;
    }
    const list = await getAllLinkedCase();
    proxima.execute('openItemDataQuoteListModal', {
      list,
      visible: true,
    });
  }, [text, props, workspaceKey]);

  return (
    <div className="field-cell-layout">
      <a
        onClick={showItemDataQuotoListModal}
        className="tooltip-overflow tooltip-maxline-1"
        title={text}
        style={{
          color: '#2662FF',
        }}
      >
        {text}
      </a>
    </div>
  );
};
Cell.displayName = 'TestReferenceCell';
export default Cell;
