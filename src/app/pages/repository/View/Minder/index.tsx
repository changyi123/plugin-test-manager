import { useBoolean, useMemoizedFn, useRequest } from 'ahooks';
import { Button, Dropdown, message, Spin } from 'antd';
import { MinderNodeType, TestType } from 'common/constant';
import React from 'react';
import MinderEditor from 'test-manager-minder';
import { v4 } from 'uuid';

import { CustomMore } from '@/icons';
import { deleteTestEntity, updateTestEntity } from '@/lib/api/item';
import {
  batchCreateTestCase,
  batchDeleteRepository,
  batchUpdateRepository,
  getMinderData,
  getPriorityOptions,
} from '@/lib/api/minder';
import { createRepositories } from '@/lib/api/repository';
import { getAppEnv } from '@/lib/appEnv';
import { useTestConfig } from '@/lib/hooks/useContext';
import { useBaseAction } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { useNoExpiredRequest } from '@/lib/hooks/useRequest';
import { exportAndDownloadXMind, validateMinderData } from '@/lib/minder';
import { getProximaBasePath, getRootContainer, getTenantKey, isInOne } from '@/lib/utils/helper';
import { getLang } from '@/lib/utils/locale';

import { ViewComponentProps } from '../type';
import cx from './index.less';
import { openMaxRenderNodeConfirm } from './MaxRenderNodeConfirm';

// TODO: 同层级重名模块报错
const MaxModuleLevel = 8;
const MaxRenderNodeCount = getAppEnv('MAX_RENDER_NODE_COUNT');
const LargeNodeModeLimit = getAppEnv('LARGE_NODE_MODE_LIMIT');

const EmptyNodeId = 'EmptyNodeId';

const TestManagerMinder: React.FC<ViewComponentProps> = ({
  selectedNode,
  folderTreeData,
  toggleViewModel,
  onFolderTreeChange,
}) => {
  const { t } = useI18n();
  const actionRef = React.useRef(null);
  const { workspace } = useTestConfig();
  const validatePassedRef = React.useRef(false);
  const { getCreatePermission } = useBaseAction();
  const [saveLoading, setSaveLoading] = React.useState(false);
  const [cancelRender, setCancelRender] = React.useState(false);
  const [
    canRequestMinderData,
    { setTrue: enableRequestMinderData, setFalse: disableRequestMinderData },
  ] = useBoolean(false);
  const [
    minderInitialLoading,
    { setTrue: startMinderInitialLoading, setFalse: endMinderInitialLoading },
  ] = useBoolean(true);

  const {
    data: minderData,
    mutate: mutateMinderData,
    loading: requestMinderDataLoading,
  } = useRequest(
    async () => {
      const root = await getMinderData({
        workspaceKey: workspace.key,
        repositoryKey: selectedNode.key,
      });
      // 包装一个 root 节点
      return { root };
    },
    {
      ready: Boolean(workspace && selectedNode && canRequestMinderData),
      // folderTreeData 变更也需要更新脑图数据
      refreshDeps: [workspace?.key, selectedNode?.key, folderTreeData],
    },
  );

  const { data: priorityOptions } = useNoExpiredRequest(getPriorityOptions, {
    cacheKey: 'priority',
  });

  /** 渲染完成的时间 */
  const handleAllLayoutFinish = useMemoizedFn(minderData => {
    if (minderData.root.data?.id !== EmptyNodeId) {
      endMinderInitialLoading();
    }
  });

  /**
   * 校验保存数据是否合法
   * s1. 校验同层级下用例和模块名称都不一样
   */
  const validator = useMemoizedFn(minderData => {
    const errorList = validateMinderData({ rootNode: minderData }, t);
    return errorList;
  });

  React.useEffect(() => {
    function fullscreenChange() {
      if (document.fullscreenElement) {
        message.config({
          getContainer: () => document.querySelector('[data-element-id="minder-editor-content"]'),
        });
      } else {
        message.config({
          getContainer: getRootContainer,
        });
      }
    }

    document.addEventListener('fullscreenchange', fullscreenChange);
  }, [minderData]);

  /** 保存脑图数据
   * s1. 根据 modulePaths 层序创建 repository，生成 repository module paths
   * s2. 创建用例数据
   * s3. 处理 change 类型数据
   * s4. 处理 delete 类型数据
   */
  const handleSave = useMemoizedFn(async () => {
    if (saveLoading) return;
    // 校验数据是否合法
    validatePassedRef.current = await actionRef.current.validateMinderData();
    if (!validatePassedRef.current) {
      return message.error(t('page.repository.view.minder.hasExistedError'));
    }

    const patches = actionRef.current.getMinderDataPatches();

    const getRepositoryDataFromLevelModulePaths = (levelModulePaths, modulePath) => {
      const moduleLevel = modulePath.length - 1;
      const parentModule = modulePath[moduleLevel];
      const repository = levelModulePaths[moduleLevel]?.find(p => p.name === parentModule.name);
      return repository;
    };

    // 创建模块并返回新建 module paths
    const createRepositoriesAndReturnLevelModulePaths = async () => {
      // 获取所有的 modulePath，校验测试模块层级是否合规
      const modulePaths = []
        .concat(patches.change, patches.create)
        .filter(patch => patch.modulePath)
        // 处理 create module 节点类型的层级
        .map(patch => {
          const { nodeType, type, modulePath } = patch;
          // 新增的节点，需要把 moduleType 追加到 ModulePath 中
          if (nodeType === MinderNodeType.Module && type === 'Create') {
            patch.modulePath = modulePath.concat({
              name: patch.name,
              // 新建的 objectId 和 module 中的保持一致设置为 undefined
              objectId: undefined,
            });
          }
          return patch;
        })
        .map(patch => {
          const { modulePath } = patch;
          let parentToken = null;
          // 增加 token 标识，因为有可能存在不同层级重名的模块，同层级出现重名的不做处理
          return modulePath.map((path, index) => {
            const res = {
              ...path,
              token: `#${index + 1}_${path.name}`,
              parentToken,
            };
            parentToken = res.token;
            return res;
          });
        });

      const overMaxLevelModulePath = modulePaths.find(path => path.length > MaxModuleLevel);

      // 超过最大层级，报错，阻止后续流程
      if (overMaxLevelModulePath) {
        throw message.error(t('page.repository.view.minder.overMaxLevelModulePath'));
      }

      // 合并路径的，将所有的 module path 按照层级进行展示
      const levelModulePaths = modulePaths.reduce((mergedModulePaths, paths) => {
        paths.forEach((path, index) => {
          const mergedPaths = mergedModulePaths[index] ?? [];
          const mergedPathTokens = mergedPaths.map(path => path.token);
          if (!mergedPathTokens.includes(path.token)) {
            mergedPaths.unshift(path);
          }
          mergedModulePaths[index] = mergedPaths;
        });
        return mergedModulePaths;
      }, []);

      let parentLevelRepositories = [];
      // 层序创建 repository
      for (let i = 0; i < levelModulePaths.length; i++) {
        const paths = levelModulePaths[i];
        // 获取不存在的 repository
        const notExistedPaths = paths.filter(path => !path.objectId);
        const createRepositoriesParam = notExistedPaths.map(path => ({
          parent: parentLevelRepositories.find(parentPath => parentPath.token === path.parentToken)
            ?.objectId,
          workspaceKey: workspace?.key,
          name: path.name,
        }));

        let createdRepositoriesData = [];
        if (createRepositoriesParam.length) {
          // 创建模块
          createdRepositoriesData = await createRepositories(createRepositoriesParam);
        }

        parentLevelRepositories = levelModulePaths[i] = paths.map(path => ({
          ...path,
          ...createdRepositoriesData.find(data => data.name === path.name),
        }));
      }
      return levelModulePaths;
    };

    // 创建测试用例
    const createTestCase = async levelModulePaths => {
      const testCaseCreateParams = patches.create
        .filter(patch => patch.nodeType === MinderNodeType.TestCase)
        .map(patch => {
          const { modulePath } = patch;
          const repository = getRepositoryDataFromLevelModulePaths(levelModulePaths, modulePath);

          return {
            name: patch.name,
            detail: {
              precondition: patch.precondition,
              steps: patch.steps.map(step => ({
                ...step,
                id: v4(),
              })),
            },
            values: {
              priority: patch.priority,
            },
            repository: repository?.objectId ?? 'UNGROUPED',
          };
        });

      if (testCaseCreateParams.length) {
        await batchCreateTestCase({
          workspaceId: workspace.objectId,
          data: testCaseCreateParams,
        });
      }
    };

    // 更新测试用例
    const changeTestData = async levelModulePaths => {
      const tasks = [];
      const updateTestEntityParams = patches.change
        .filter(patch => patch.nodeType === MinderNodeType.TestCase)
        .map(patch => {
          const { objectId, name, modulePath, priority, steps, precondition } = patch;
          const updateParams = {
            objectId,
          } as any;

          if (modulePath) {
            const repository = getRepositoryDataFromLevelModulePaths(levelModulePaths, modulePath);
            updateParams.repository = repository?.objectId ?? 'UNGROUPED';
          }
          if (steps || precondition) {
            updateParams.detail = {
              steps: steps.map(step => ({
                ...step,
                // 容错处理：给未含有 id 的 step 增加 uid
                id: step.id ?? v4(),
              })),
              precondition,
            };
          }
          if (name) {
            updateParams.name = name;
          }
          // 如果为空对象则不存储
          if (priority && Object.keys(priority).length) {
            updateParams.values = { priority };
          }

          return updateParams;
        });

      const updateRepositoryParams = patches.change
        .filter(patch => patch.nodeType === MinderNodeType.Module)
        .map(patch => {
          const { objectId, name, modulePath } = patch;
          const updateParams = {
            objectId,
          } as any;

          if (modulePath) {
            const repository = getRepositoryDataFromLevelModulePaths(levelModulePaths, modulePath);
            updateParams.parent = repository?.objectId ?? null;
          }

          if (name) {
            updateParams.name = name;
          }

          return updateParams;
        });

      if (updateRepositoryParams.length) {
        tasks.push(batchUpdateRepository(updateRepositoryParams));
      }

      if (updateTestEntityParams.length) {
        tasks.push(
          updateTestEntity(updateTestEntityParams).then(resp => {
            if (resp?.status === 'error') {
              throw new Error(resp.data);
            }
            return resp;
          }),
        );
      }

      await Promise.all(tasks);
    };

    // 删除测试数据
    const removeTestData = async () => {
      const tasks = [];
      const needRemoveTestCaseIds = patches.remove
        .filter(patch => patch.nodeType === MinderNodeType.TestCase)
        .map(i => i.objectId);

      const needRemoveRepositoryIds = patches.remove
        .filter(patch => patch.nodeType === MinderNodeType.Module)
        .map(i => i.objectId);

      if (needRemoveTestCaseIds.length) {
        tasks.push(
          deleteTestEntity(needRemoveTestCaseIds).then(resp => {
            if (resp?.status === 'error') {
              throw new Error(resp.data);
            }
            return resp;
          }),
        );
      }

      if (needRemoveRepositoryIds.length) {
        tasks.push(batchDeleteRepository(needRemoveRepositoryIds));
      }

      return Promise.all(tasks);
    };

    try {
      setSaveLoading(true);
      // 创建测试用例
      const levelModulePaths = await createRepositoriesAndReturnLevelModulePaths();
      try {
        await Promise.all([
          createTestCase(levelModulePaths),
          changeTestData(levelModulePaths),
          removeTestData(),
        ]);
        message.success(t('page.repository.view.minder.updateDataSuccess'));
        // 刷新左侧树
        onFolderTreeChange();
      } catch (e) {
        message.error(`${t('common.updateFail')}， ${e.message}`);
      }
    } catch (err) {
      console.error('error', err);
      message.error(t('page.repository.view.minder.saveFail'));
    } finally {
      setSaveLoading(false);
    }
  });

  // 导出 XMind 数据
  const handleXMindExport = useMemoizedFn(async () => {
    if (requestMinderDataLoading)
      return message.warn(t('page.repository.view.minder.waitForMinderDataLoading'));
    const hide = message.loading(t('page.repository.view.minder.exportLoadingMessage'));

    setTimeout(async () => {
      await exportAndDownloadXMind(minderData, {
        t,
        priorityOptions,
      });
      setTimeout(hide, 500);
    }, 200);
  });

  // 导入 XMind 数据，打开新页面
  const handleXMindImport = useMemoizedFn(() => {
    const currentPageUrl = location.href.split('?')[0];
    const baseUrl = getProximaBasePath() ? `${getProximaBasePath()}` : '/';
    let layoutParams = '';
    if (isInOne()) {
      layoutParams = '&hiddenHeader=true&hiddenSider=true';
    }
    // 跳转到导入页面
    const href = `${baseUrl}/${getTenantKey()}/workspaces/${
      workspace.key
    }/plugin/test_manager_test-xmindimport?repositoryId=${
      selectedNode?.key
    }&redirectLink=${encodeURIComponent(currentPageUrl)}${layoutParams}`;

    window.open(href, '_blank');
  });

  const memoizedButtonNode = React.useMemo(() => {
    const canCreateTestCase = !getCreatePermission(TestType.Case);
    return (
      <div>
        <Button
          type="primary"
          onClick={handleSave}
          loading={saveLoading}
          disabled={cancelRender || !canCreateTestCase}
        >
          {t('common.save')}
        </Button>
        <Dropdown
          getPopupContainer={() =>
            document.querySelector('[data-element-id="minder-editor-container"]')
          }
          onOpenChange={() => enableRequestMinderData()}
          menu={{
            items: [
              canCreateTestCase && {
                key: 'XMindImport',
                label: t('page.repository.view.minder.import'),
                onClick: handleXMindImport,
              },
              {
                key: 'XMindExport',
                label: t('page.repository.view.minder.export'),
                onClick: handleXMindExport,
              },
            ].filter(Boolean),
          }}
        >
          <Button className={cx('menu-action')} icon={<CustomMore />} />
        </Dropdown>
      </div>
    );
  }, [
    getCreatePermission,
    handleSave,
    saveLoading,
    cancelRender,
    t,
    handleXMindImport,
    handleXMindExport,
    enableRequestMinderData,
  ]);

  // 渲染数据
  const minderRenderData = React.useMemo(() => {
    if (!selectedNode) return { root: {} };
    const EmptyRootNode = {
      root: {
        data: { id: EmptyNodeId, type: MinderNodeType.Module, text: selectedNode.name },
      },
    };
    // 正在数据请求时返回 root 节点占位符号
    if (!canRequestMinderData || requestMinderDataLoading) return EmptyRootNode;
    // 取消加载时返回 root 节点占位符
    if (cancelRender) return EmptyRootNode;
    return minderData ?? EmptyRootNode;
  }, [selectedNode, requestMinderDataLoading, cancelRender, canRequestMinderData, minderData]);

  // 模块切换先判断是否需要渲染，避免大数据量节点渲染导致页面卡顿
  React.useEffect(() => {
    if (!selectedNode?.key) return;
    // 切换模块时，重置渲染状态
    disableRequestMinderData();
    setCancelRender(false);
    startMinderInitialLoading();
    // 切换模块时，重置脑图数据
    mutateMinderData(undefined);
    // 超过最大渲染数量需要增加是否继续渲染的弹窗提示
    if (selectedNode.counts[1] > MaxRenderNodeCount) {
      openMaxRenderNodeConfirm({
        onNext: () => {
          enableRequestMinderData();
        },
        onGoBack: () => {
          toggleViewModel('list');
        },
        onCancel: () => {
          setCancelRender(true);
          endMinderInitialLoading();
          enableRequestMinderData();
        },
      });
    } else {
      enableRequestMinderData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode?.key]);

  React.useEffect(() => {
    // 判断是否有错误节点数据，如果有则重新校验
    if (validatePassedRef.current) {
      validatePassedRef.current = actionRef.current.validateMinderData();
    }
  }, [minderRenderData]);

  // 只保留语言，不保留地区
  const lang = getLang()?.replace(/-\w+/g, '');

  if (!priorityOptions) return null;

  const spinning = !cancelRender && minderInitialLoading;

  return (
    <div className={cx('minder-view-container')}>
      <Spin spinning={spinning}>
        <MinderEditor
          lang={lang}
          key={workspace.key}
          actionRef={actionRef}
          validator={validator}
          data={minderRenderData}
          priorityOptions={priorityOptions}
          largeNodeModeLimit={LargeNodeModeLimit}
          onAllLayoutFinish={handleAllLayoutFinish}
          renderFixRightAction={() => memoizedButtonNode}
        />
      </Spin>
    </div>
  );
};

export default React.memo(TestManagerMinder);
