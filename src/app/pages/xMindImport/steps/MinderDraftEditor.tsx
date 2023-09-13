import { useMemoizedFn } from 'ahooks';
import { message } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { MinderEditor } from '@/components/dynamicComponents';
import { validateMinderData } from '@/lib/minder';
import { getLang } from '@/lib/utils/locale';

import { StepComponentProp } from '../type';
import cx from './MinderDraftEditor.less';

const MinderDraftEditor: React.FC<StepComponentProp> = ({
  sharedState,
  onSharedStateChange,
  nextStepButtonClickRef,
}) => {
  const { t: globalT } = useTranslation();
  const { t: scopedT } = useTranslation('', {
    keyPrefix: 'page.xMindImport.draftEditorStep',
  });
  const actionRef = React.useRef(null);
  const lang = getLang()?.replace(/-\w+/g, '');

  const validator = useMemoizedFn(rootNode => {
    let currentRepositoryLevel = 0;
    const traverseRepoNode = repoNode => {
      if (repoNode.id === rootNode.data.objectId ?? 'root') {
        let parent = repoNode;
        while (parent && parent.id !== 'root') {
          currentRepositoryLevel++;
          parent = parent.parent;
        }
      }
      repoNode.children?.forEach(traverseRepoNode);
    };
    traverseRepoNode(sharedState.repositoryTree);

    const errorList = validateMinderData(
      { rootNode, rootNodeLevel: currentRepositoryLevel },
      globalT,
    );

    // 存在错误则禁用下一步按钮
    if (errorList.length) {
      onSharedStateChange({
        canGoNext: false,
      });
    } else {
      // parent 存在循环引用，在提交的时候需要去掉
      const pureMinderData = JSON.parse(
        JSON.stringify(rootNode, (key, value) => {
          if (key === 'parent') return;
          return value;
        }),
      );
      onSharedStateChange({
        canGoNext: true,
        submitMinderData: pureMinderData,
      });
    }

    return errorList;
  });

  React.useImperativeHandle(nextStepButtonClickRef, () => async () => {
    const passed = await actionRef.current.validateMinderData();
    if (!passed) {
      throw message.error(scopedT('hasExistedError'));
    }
  });

  React.useEffect(() => {
    if (!sharedState.minderData) return;
    // return message.warn('当前导入数据节点存在错误，请修正后重试');
    const timer = setInterval(() => {
      if (typeof actionRef.current?.validateMinderData === 'function') {
        actionRef.current.validateMinderData();
        clearInterval(timer);
      }
    }, 300);
  }, [sharedState.minderData]);

  return (
    <div className={cx('container')}>
      {sharedState.minderData && sharedState.priorityOptions && (
        <MinderEditor
          lang={lang}
          importDraftMode
          validator={validator}
          actionRef={actionRef}
          data={sharedState.minderData}
          priorityOptions={sharedState.priorityOptions}
        />
      )}
    </div>
  );
};

export default MinderDraftEditor;
