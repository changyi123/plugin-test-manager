import React from 'react';
import { useMemoizedFn } from 'ahooks';
import { StepComponentProp } from '../type';
import { getLang } from '@/lib/utils/locale';
import MinderEditor from 'test-manager-minder';
import { useTranslation } from 'react-i18next';
import { MinderNodeType } from 'common/constant';

import cx from './MinderDraftEditor.less';
import { message } from 'antd';

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

    const buildValidatorStrategies = (node, parent) => {
      const validatorStrategies = {
        // 节点类型必须存在
        nodeTypeExisted: node => {
          if (!node.data.type) {
            return scopedT('nodeUnsetErrorMessage');
          }
        },
        // 节点类型必须合规
        nodeTypeLawyer: (node, parent) => {
          const nodeParentTypeMap = {
            [MinderNodeType.Data]: MinderNodeType.Result,
            [MinderNodeType.Result]: MinderNodeType.Step,
            [MinderNodeType.Precondition]: MinderNodeType.TestCase,
            [MinderNodeType.Step]: MinderNodeType.TestCase,
            [MinderNodeType.TestCase]: MinderNodeType.Module,
            [MinderNodeType.Module]: MinderNodeType.Module,
          };
          const getNodeParentType = n => nodeParentTypeMap[n.data.type];
          // 已校验节点跳过校验，节点为根节点跳过校验
          if (node._nodeTypeLawyerValidated || node.data.type === 'Root') return;
          // 父节点节点为根节点，当前节点为 TestCase Module 跳过校验
          if (
            parent.data.type === 'Root' &&
            [MinderNodeType.TestCase, MinderNodeType.Module].includes(node.data.type)
          )
            return;

          // 校验父级是否符合条件
          const checkNodeLevel = (curNode, pNode) => {
            const cType = getNodeParentType(curNode);
            const pType = pNode.data.type;
            if (cType !== pType) {
              return scopedT('lawyerErrorMessage', {
                nodeTypeName: globalT(`minderNodeTypeName.${cType}`),
              });
            }
            // 标记节点已经校验过
            curNode._nodeTypeLawyerValidated = true;
          };
          return checkNodeLevel(node, parent);
        },
        // module 节点层级不能超过 8 级
        moduleNodeLevelMaxCount: node => {
          if (node.data.type !== MinderNodeType.Module) return;
          let level = currentRepositoryLevel;
          let nodeParent = node;
          while (nodeParent) {
            level++;
            nodeParent = nodeParent.parent;
          }

          if (level >= 8) {
            return scopedT('maxLevelErrorMessage');
          }
        },
        // module 节点名称同层级不能重复
        moduleNodeNameRepeat: (node, parent) => {
          const siblings = parent?.children;
          if (!Array.isArray(siblings)) return;
          const moduleNameList = siblings
            .filter(node => node.data.type === MinderNodeType.Module)
            .map(sibling => sibling.data.text);

          if (
            moduleNameList.indexOf(node.data.text) !== moduleNameList.lastIndexOf(node.data.text)
          ) {
            return scopedT('duplicateErrorMessage');
          }
        },
        // 节点内容长度限制
        nodeTextMaxCount: node => {
          const textMaxCountMap = {
            [MinderNodeType.Data]: 2000,
            [MinderNodeType.Result]: 2000,
            [MinderNodeType.Step]: 2000,
            [MinderNodeType.Precondition]: 2000,
            // TestCase 节点名称无限制
            [MinderNodeType.Module]: 40,
          };

          if (node.data.text?.length > textMaxCountMap[node.data.type]) {
            return scopedT('nodeTextMaxLengthErrorMessage', {
              length: textMaxCountMap[node.data.type],
            });
          }
        },
      };

      // 校验成功则返回 true
      const validator = (types: (keyof typeof validatorStrategies)[]) => {
        let message = '';

        for (const type of types) {
          message = validatorStrategies[type]?.(node, parent);
          if (message) {
            errorList.push({
              id: node?.data.id,
              message,
            });
            break;
          }
        }
      };

      return validator;
    };

    const errorList = [];
    // 校验脑图节点数据
    const validateNode = (node, parent = null) => {
      const validator = buildValidatorStrategies(node, parent);
      if (!node.parent) {
        node.parent = parent;
      }
      // 一个节点最多只存在一种错误，所有错误类型按优先级排序
      validator([
        'nodeTypeExisted',
        'nodeTypeLawyer',
        'nodeTextMaxCount',
        'moduleNodeNameRepeat',
        'moduleNodeLevelMaxCount',
      ]);

      if (Array.isArray(node.children)) {
        node.children.forEach(child => {
          validateNode(child, node);
        });
      }
    };

    validateNode(rootNode);

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
    setTimeout(() => actionRef.current.validateMinderData());
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
