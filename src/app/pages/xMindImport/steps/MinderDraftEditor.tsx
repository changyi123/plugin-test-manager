import React from 'react';
import { StepComponentProp } from '../type';
import { getLang } from '@/lib/utils/locale';
import MinderEditor from 'test-manager-minder';
import { MinderNodeType } from 'common/constant';
import { useMemoizedFn } from 'ahooks';

import cx from './MinderDraftEditor.less';
import { message } from 'antd';

const MinderDraftEditor: React.FC<StepComponentProp> = ({
  sharedState,
  saveButtonEmitter,
  onSharedStateChange,
}) => {
  const actionRef = React.useRef(null);
  const lang = getLang()?.replace(/-\w+/g, '');

  saveButtonEmitter.useSubscription(async type => {
    if (type === 'stepComponentTrigger') return;
    const passed = await actionRef.current.validateMinderData();
    if (!passed) {
      return message.error('当前导入数据节点存在错误，请修正后重试');
    }
    onSharedStateChange({
      canGoNext: true,
      submitMinderData: actionRef.current?.exportJson()?.root,
    });
    saveButtonEmitter.emit('stepComponentTrigger');
  });

  const validator = useMemoizedFn(rootNode => {
    const buildValidatorStrategies = (node, parent) => {
      const validatorStrategies = {
        // 节点类型必须存在
        nodeTypeExisted: node => {
          if (!node.data.type) {
            return '节点类型未设置';
          }
        },
        // 节点类型必须合规
        nodeTypeLawyer: (node, parent) => {
          const nodeParentTypeLevel = {
            [MinderNodeType.Data]: [
              MinderNodeType.Result,
              MinderNodeType.Step,
              MinderNodeType.TestCase,
              MinderNodeType.Module,
            ],
            [MinderNodeType.Result]: [
              MinderNodeType.Step,
              MinderNodeType.TestCase,
              MinderNodeType.Module,
            ],
            [MinderNodeType.Step]: [MinderNodeType.TestCase, MinderNodeType.Module],
            [MinderNodeType.Precondition]: [MinderNodeType.TestCase, MinderNodeType.Module],
          };
          // 校验合规后给节点打上标记，后续节点直接跳过
          const nodeTypeLevel = nodeParentTypeLevel[node.data.type] ?? [];
          let level = 0;

          let nodeParent = parent;
          while (nodeParent) {
            // 单独处理 TestCase 和 Module 类型节点
            if ([MinderNodeType.Module, MinderNodeType.TestCase].includes(node.data.type)) {
              while (nodeParent) {
                if (![MinderNodeType.Root, MinderNodeType.Module].includes(nodeParent.data.type)) {
                  return `节点类型不合规，父节点类型应为 ${MinderNodeType.Module}`;
                }
                nodeParent = nodeParent.parent;
              }
              break;
            }
            if (nodeTypeLevel.indexOf(nodeParent.data.type) !== level) {
              return `节点类型不合规，当前节点的父节点类型应为 ${nodeTypeLevel[level]}`;
            }
            // 跳过已经校验过的节点
            if (nodeParent._nodeTypeLawyerValidated) break;
            level++;
            nodeParent = nodeParent.parent;
          }
          // 标记节点已经校验过
          node._nodeTypeLawyerValidated = true;
        },
        // module 节点层级不能超过 8 级
        moduleNodeLevelMaxCount: (_node, parent) => {
          let level = 1;
          while (parent) {
            level++;
            parent = parent.parent;
          }
          if (level > 8) {
            return `模块节点层级超出最大限制，最大层级限制为 8`;
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
            return `同层级下模块名称重复`;
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

          if (node.data.text.length > textMaxCountMap[node.data.type]) {
            return `节点内容超出最大限制，最大限制为 ${textMaxCountMap[node.data.type]}`;
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
              id: node.data.id,
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

    return errorList;
  });

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
