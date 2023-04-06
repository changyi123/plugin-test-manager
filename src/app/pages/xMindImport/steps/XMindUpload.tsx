import React from 'react';
import useI18n from '@/lib/hooks/useI18n';
import { StepComponentProp } from '../type';
import { Upload, Checkbox, Button, message } from 'antd';
import { useRequest, useBoolean, useMemoizedFn } from 'ahooks';
import { parseXMindFile2MinderData, countMinderNodes, exportAndDownloadXMind } from '@/lib/minder';

import cx from './XMindUpload.less';
import { MinderNodeType } from 'common/constant';

const { Dragger } = Upload;

// TODO: 国际化
const getXMindTemplateNodes = t => {
  return {
    root: {
      data: {
        text: '用例导入',
      },
      children: [
        {
          data: {
            type: MinderNodeType.Module,
            text: '模块1',
          },
          children: [
            {
              data: {
                type: MinderNodeType.TestCase,
                text: '测试用例1',
                priority: 'P1',
              },
              children: [
                {
                  data: {
                    type: MinderNodeType.Precondition,
                    text: '前置条件',
                  },
                },
                {
                  data: {
                    type: MinderNodeType.Step,
                    text: '步骤1',
                  },
                  children: [
                    {
                      data: {
                        type: MinderNodeType.Result,
                        text: '预期结果1',
                      },
                    },
                  ],
                },
                {
                  data: {
                    type: MinderNodeType.Step,
                    text: '步骤2',
                  },
                  children: [
                    {
                      data: {
                        type: MinderNodeType.Result,
                        text: '预期结果2',
                      },
                      children: [
                        {
                          data: {
                            type: MinderNodeType.Data,
                            text: '数据',
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              data: {
                type: MinderNodeType.TestCase,
                text: '测试用例2',
                priority: 'P0',
              },
              children: [
                {
                  data: {
                    type: MinderNodeType.Step,
                    text: '步骤1',
                  },
                },
                {
                  data: {
                    type: MinderNodeType.Step,
                    text: '步骤2',
                  },
                },
              ],
            },
          ],
        },
        {
          data: {
            type: MinderNodeType.Module,
            text: '模块2',
          },
          children: [
            {
              data: {
                type: MinderNodeType.TestCase,
                text: '测试用例',
                priority: 'P1',
              },
            },
          ],
        },
      ],
    },
  };
};

// 优化脑图节点数据
// 1. 将同级同名的模块合并
// 2. 对已存在 repository 设置 objectId
// 3. 推导节点类型
// 4. 将测试用例节点设置默认优先级
const optimizeMinderData = ({
  minderData,
  defaultPriority,
  isIncludeRootNode,
  currentRepositorySubtree,
}) => {
  const traverse = (minderNode, repositoryNodes) => {
    if (Array.isArray(minderNode?.children)) {
      const repositoryNameMapping = repositoryNodes?.reduce((mapping, repo) => {
        return {
          ...mapping,
          [repo.name]: repo,
        };
      }, {});

      // 模块类型子节点
      const moduleTypeNodeChildren = minderNode.children.filter(
        node => node.data.type === MinderNodeType.Module,
      );
      // 其他类型子节点
      const otherTypeNodeChildren = minderNode.children.filter(
        node => node.data.type !== MinderNodeType.Module,
      );
      // 合并同级同名的模块数据
      const mergedModuleWithSameText = moduleTypeNodeChildren.reduce((res, childNode) => {
        const { text } = childNode.data;
        res[text] = (res[text] || []).concat(childNode);
        return res;
      }, {});

      const nodeChildren = Object.values(mergedModuleWithSameText as Record<string, any[]>)
        .map(nodeArr => {
          //   1. 合并同级同名的模块数据
          if (nodeArr.length <= 1) return nodeArr[0];

          const [first, ...rest] = nodeArr;
          const mergedChildren = rest.reduce((res, node) => {
            return res.concat(node.children);
          }, first.children ?? []);

          return {
            ...first,
            children: mergedChildren,
          };
        })
        .map(node => {
          //  2. 对已存在 repository 设置 objectId
          const { text } = node.data;
          if (repositoryNameMapping[text]) {
            node.data.objectId = repositoryNameMapping[text].id;
          }
          return node;
        })
        .concat(otherTypeNodeChildren);

      minderNode.children = nodeChildren.map(childNode => {
        const repositoryChildren = repositoryNodes
          .reduce((acc, nodes) => acc.concat(nodes.children), [])
          .filter(Boolean);

        return traverse(childNode, repositoryChildren);
      });
    }

    return minderNode;
  };

  // 推导未设置类型的节点
  const deriveNodeData = (node, parent = null) => {
    if (parent) {
      node.parent = parent;
    }
    // 节点类型推导
    const parentNodeTypeMapping = {
      [MinderNodeType.Step]: MinderNodeType.Result,
      [MinderNodeType.Result]: MinderNodeType.Data,
      [MinderNodeType.TestCase]: MinderNodeType.Step,
    };
    if (!node.data.type && parentNodeTypeMapping[parent?.data?.type]) {
      node.data.type = parentNodeTypeMapping[parent.data.type];
    }

    // 优先级推导
    if (!node.data?.priority && defaultPriority) {
      node.data.priority = defaultPriority;
    }
    if (Array.isArray(node.children)) {
      node.children.forEach(child => deriveNodeData(child, node));
    }
    return node;
  };

  // 3. 根据 isIncludeRootNode 过滤根节点
  const minderRootNode = {
    data: {
      objectId: currentRepositorySubtree?.id,
      text: currentRepositorySubtree?.name,
      type: MinderNodeType.Module,
    },
    children: isIncludeRootNode ? [minderData] : minderData?.children ?? [],
  };

  return deriveNodeData(traverse(minderRootNode, currentRepositorySubtree?.children ?? []));
};

const XMindUpload: React.FC<StepComponentProp> = ({ sharedState, onSharedStateChange }) => {
  const { t } = useI18n();
  const [isIncludeRootNode, { toggle: toggleIsIncludeRootNode }] = useBoolean(false);
  const [importData, setImportData] = React.useState(null);
  const { paths: repositoryPaths, currentRepositorySubtree } = React.useMemo(() => {
    const traverse = node => {
      if (node?.id === sharedState.repositoryId) {
        let parent = node;
        const paths = [];
        while (parent) {
          paths.unshift(parent.name ?? t('common.minderRootNodeName'));
          parent = parent.parent;
        }
        return {
          paths,
          currentRepositorySubtree: node,
        };
      } else if (node && Array.isArray(node.children)) {
        for (const child of node.children) {
          return traverse(child);
        }
      }
    };
    return traverse(sharedState.repositoryTree) ?? { paths: [], currentRepositorySubtree: null };
  }, [sharedState.repositoryId, sharedState.repositoryTree, t]);

  const updateMinderDataSharedState = useMemoizedFn((minderData, isIncludeRootNode) => {
    const optimizedMinderData = optimizeMinderData({
      minderData,
      isIncludeRootNode,
      currentRepositorySubtree,
      defaultPriority: sharedState.priorityOptions[0]?.key,
    });
    const testCaseNodeCount = countMinderNodes(optimizedMinderData, MinderNodeType.TestCase);
    if (testCaseNodeCount > 1000) {
      throw message.error(t('page.xMindImport.uploadStep.countLimitTip'));
    }
    onSharedStateChange({
      canGoNext: true,
      minderData: optimizedMinderData,
    });
  });

  const handleParseXMindFile = useMemoizedFn(async options => {
    const { file, onProgress, onSuccess } = options;
    onProgress({ percent: 30 });
    console.log('sharedState.priorityOptions', sharedState.priorityOptions);
    const minderData = await parseXMindFile2MinderData(file, {
      priorityOptions: sharedState.priorityOptions,
    });
    setImportData(minderData);
    setTimeout(onSuccess, 500);
  });

  React.useEffect(() => {
    if (importData) {
      updateMinderDataSharedState(importData, isIncludeRootNode);
    } else {
      onSharedStateChange({
        canGoNext: false,
        minderData: null,
      });
    }
  }, [onSharedStateChange, isIncludeRootNode, importData]);

  return (
    <div className={cx('container')}>
      <div className={cx('location')}>
        <strong style={{ marginRight: 8 }}>
          {t('page.xMindImport.uploadStep.importLocation')}
        </strong>
        <span>{repositoryPaths?.join(' > ')}</span>
      </div>
      <Dragger maxCount={1} accept=".xmind, x-xmind" customRequest={handleParseXMindFile}>
        <p className="ant-upload-drag-icon"></p>
        <p className="ant-upload-text">{t('page.xMindImport.uploadStep.uploader.text')}</p>
        <p className="ant-upload-hint">{t('page.xMindImport.uploadStep.uploader.hint')}</p>
      </Dragger>
      <div className={cx('tips-container')}>
        <p className={'tip'}>
          <strong>{t('page.xMindImport.uploadStep.importTips')}</strong>
        </p>
        <ul>
          <li>
            {t('page.xMindImport.uploadStep.includeRootTip')}
            <div>
              <Checkbox
                className={cx('checkbox')}
                checked={isIncludeRootNode}
                onChange={() => toggleIsIncludeRootNode()}
              />
              <span
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => toggleIsIncludeRootNode()}
              >
                {t('page.xMindImport.uploadStep.importIncludeRoot')}
              </span>
            </div>
          </li>
          <li>
            {t('page.xMindImport.uploadStep.typeTip')}
            <a className={cx('example-link')}>{t('page.xMindImport.uploadStep.typeExample')}</a>
          </li>
          <li>{t('page.xMindImport.uploadStep.levelTip')}</li>
          <li>{t('page.xMindImport.uploadStep.countLimitTip')}</li>
        </ul>
      </div>
      <Button onClick={() => exportAndDownloadXMind(getXMindTemplateNodes(t), { t })}>
        {t('page.xMindImport.uploadStep.downloadTemplate')}
      </Button>
    </div>
  );
};

export default XMindUpload;
