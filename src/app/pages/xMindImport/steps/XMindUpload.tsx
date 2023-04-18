import React from 'react';
import useI18n from '@/lib/hooks/useI18n';
import { StepComponentProp } from '../type';
import { useBoolean, useMemoizedFn } from 'ahooks';
import { UploadOutlined } from '@/icons';
import xmindTemplatePic from '@/assets/images/xmindTemplate.png';
import xmindTemplateEnPic from '@/assets/images/xmindTemplateEn.png';
import { Upload, Checkbox, Button, message, Tooltip } from 'antd';
import { parseXMindFile2MinderData, countMinderNodes, exportAndDownloadXMind } from '@/lib/minder';

import cx from './XMindUpload.less';
import { MinderNodeType } from 'common/constant';

const { Dragger } = Upload;

// TODO: 国际化
const getXMindTemplateNodes = t => {
  return {
    root: {
      data: {
        type: MinderNodeType.Module,
        text: t('minderExport.root'),
      },
      children: [
        {
          data: {
            type: MinderNodeType.Module,
            text: t('minderExport.module', { num: 1 }),
          },
          children: [
            {
              data: {
                type: MinderNodeType.TestCase,
                text: t('minderExport.case', { num: 1 }),
                priority: 'P1',
              },
              children: [
                {
                  data: {
                    type: MinderNodeType.Precondition,
                    text: t('minderExport.precondition', { num: 1 }),
                  },
                },
                {
                  data: {
                    type: MinderNodeType.Step,
                    text: t('minderExport.step', { num: 1 }),
                  },
                  children: [
                    {
                      data: {
                        type: MinderNodeType.Result,
                        text: t('minderExport.result', { num: 1 }),
                      },
                    },
                  ],
                },
                {
                  data: {
                    type: MinderNodeType.Step,
                    text: t('minderExport.step', { num: 2 }),
                  },
                  children: [
                    {
                      data: {
                        type: MinderNodeType.Result,
                        text: t('minderExport.result', { num: 2 }),
                      },
                      children: [
                        {
                          data: {
                            type: MinderNodeType.Data,
                            text: t('minderExport.data'),
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
                text: t('minderExport.case', { num: 2 }),
                priority: 'P0',
              },
              children: [
                {
                  data: {
                    type: MinderNodeType.Step,
                    text: t('minderExport.step', { num: 1 }),
                  },
                },
                {
                  data: {
                    type: MinderNodeType.Step,
                    text: t('minderExport.step', { num: 2 }),
                  },
                },
              ],
            },
          ],
        },
        {
          data: {
            type: MinderNodeType.Module,
            text: t('minderExport.module', { num: 2 }),
          },
          children: [
            {
              data: {
                type: MinderNodeType.TestCase,
                text: t('minderExport.caseZero'),
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
      const mergedModuleWithSameText = Object.values(
        moduleTypeNodeChildren.reduce((res, childNode) => {
          const { text } = childNode.data;
          res[text] = (res[text] || []).concat(childNode);
          return res;
        }, {}) as Record<string, any[]>,
      ).map(nodeArr => {
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
      });

      console.log('minderNode, repositoryNodes', mergedModuleWithSameText, repositoryNameMapping);

      const nodeChildren = mergedModuleWithSameText
        .map(node => {
          //  2. 对已存在 repository 设置 objectId
          const { text } = node.data;
          if (repositoryNameMapping[text]) {
            console.log('repositoryNameMapping[text]', repositoryNameMapping[text]);
            node.data.objectId = repositoryNameMapping[text].id;
          } else {
            node.data.objectId = undefined;
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

    if (node.data?.type === MinderNodeType.TestCase) {
      // 用例模块优先级推导
      if (!node.data?.priority && defaultPriority) {
        node.data.priority = defaultPriority;
      }
    } else if (node.data?.priority) {
      // 非用例模块优先级清空
      node.data.priority = '';
    }
    if (Array.isArray(node.children)) {
      node.children.forEach(child => deriveNodeData(child, node));
    }
    return node;
  };

  console.log('currentRepositorySubtree?.id', currentRepositorySubtree?.id);

  // 3. 根据 isIncludeRootNode 过滤根节点
  const minderRootNode = {
    data: {
      objectId: currentRepositorySubtree?.id,
      text: currentRepositorySubtree?.name,
      type: [MinderNodeType.Root, 'root'].includes(currentRepositorySubtree?.id)
        ? MinderNodeType.Root
        : MinderNodeType.Module,
    },
    children: isIncludeRootNode ? [minderData] : minderData?.children ?? [],
  };

  console.log('minderRootNodeminderRootNodeminderRootNode', minderRootNode);

  return deriveNodeData(traverse(minderRootNode, currentRepositorySubtree?.children ?? []));
};

const XMindUpload: React.FC<StepComponentProp> = ({ sharedState, onSharedStateChange }) => {
  const { t } = useI18n();
  const [isIncludeRootNode, { toggle: toggleIsIncludeRootNode }] = useBoolean(false);
  const [importData, setImportData] = React.useState(null);
  const { paths: repositoryPaths, currentRepositorySubtree } = React.useMemo(() => {
    let res = { paths: [], currentRepositorySubtree: null };
    const traverse = node => {
      if (node?.id === sharedState.repositoryId) {
        let parent = node;
        const paths = [];
        while (parent) {
          paths.unshift(parent.name ?? t('common.minderRootNodeName'));
          parent = parent.parent;
        }
        res = {
          paths,
          currentRepositorySubtree: node,
        };
      } else if (node && Array.isArray(node.children)) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(sharedState.repositoryTree);

    return res;
  }, [sharedState.repositoryId, sharedState.repositoryTree, t]);

  const updateMinderDataSharedState = useMemoizedFn((minderData, isIncludeRootNode) => {
    // 优化导入的数据节点
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
    if (!sharedState.canCreateTestCaseItem)
      throw message.error(t('page.xMindImport.uploadStep.noPermissionTip'));
    const { file, onProgress, onSuccess } = options;
    onProgress({ percent: 30 });
    const minderData = await parseXMindFile2MinderData(file, {
      priorityOptions: sharedState.priorityOptions,
    });
    setTimeout(onSuccess, 500);
    setImportData(minderData);
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
  }, [onSharedStateChange, isIncludeRootNode, importData, updateMinderDataSharedState]);

  const lang = t('lang');

  return (
    <div className={cx('container')}>
      <div className={cx('location')}>
        <strong style={{ marginRight: 8 }}>
          {t('page.xMindImport.uploadStep.importLocation')}
        </strong>
        <span>{repositoryPaths?.join(' > ')}</span>
      </div>
      <Dragger maxCount={1} accept=".xmind, x-xmind" customRequest={handleParseXMindFile}>
        <p className="ant-upload-drag-icon">
          <UploadOutlined />
        </p>
        <p className="ant-upload-text">{t('page.xMindImport.uploadStep.uploader.text')}</p>
        <p className="ant-upload-hint">{t('page.xMindImport.uploadStep.uploader.hint')}</p>
      </Dragger>
      <div className={cx('tips-container')}>
        <p className={'tip'}>
          <strong>{t('page.xMindImport.uploadStep.importTips')}</strong>
        </p>
        <ul>
          <div>
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
          </div>
          <li>
            {t('page.xMindImport.uploadStep.typeTip')}
            <Tooltip
              overlayStyle={{ maxWidth: 'unset' }}
              title={
                <img src={lang === 'en' ? xmindTemplateEnPic : xmindTemplatePic} width={500} />
              }
            >
              <a className={cx('example-link')}>{t('page.xMindImport.uploadStep.typeExample')}</a>
            </Tooltip>
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
