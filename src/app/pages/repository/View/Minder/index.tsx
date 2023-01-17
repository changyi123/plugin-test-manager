import React from 'react';
import { v4 } from 'uuid';
import { Button, message } from 'antd';
import MinderEditor from 'test-manager-minder';
import { useRequest, useMemoizedFn } from 'ahooks';
import { useTestConfig } from '@/lib/hooks/useContext';
import { useHeaderExtraActionButton } from '../../hook';
import { useNoExpiredRequest } from '@/lib/hooks/useRequest';
import {
  getMinderData,
  getPriorityOptions,
  batchCreateTestCase,
  batchDeleteRepository,
  batchUpdateRepository,
} from '@/lib/api/minder';
import { ViewComponentProps } from '../type';
import { MinderNodeType } from 'common/constant';
import { createRepositories } from '@/lib/api/repository';
import { deleteTestEntity, updateTestEntity } from '@/lib/api/item';

// TODO: 同层级重名模块报错
const MaxModuleLevel = 8;

const TestManagerMinder: React.FC<ViewComponentProps> = ({
  selectedNode,
  folderTreeData,
  onFolderTreeChange,
}) => {
  const { workspace } = useTestConfig();
  const actionRef = React.useRef(null);
  const [saveLoading, setSaveLoading] = React.useState(false);

  const { data: minderData } = useRequest(
    async () => {
      const root = await getMinderData({
        workspaceKey: workspace?.key,
        repositoryKey: selectedNode?.key,
      });
      // 包装一个 root 节点
      return { root };
    },
    {
      ready: Boolean(workspace),
      // folderTreeData 变更也需要更新脑图数据
      refreshDeps: [workspace?.key, selectedNode?.key, folderTreeData],
    },
  );

  const { data: priorityOptions } = useNoExpiredRequest(getPriorityOptions, {
    cacheKey: 'priority',
  });

  /** 保存脑图数据
   * s1. 根据 modulePaths 层序创建 repository，生成 repository module paths
   * s2. 创建用例数据
   * s3. 处理 change 类型数据
   * s4. 处理 delete 类型数据
   */
  const handleSave = useMemoizedFn(async () => {
    if (saveLoading) return;
    const patches = actionRef.current.getMinderDataPatches();

    // 有 patches 数据需要处理
    if (Object.values(Object.assign({}, patches.create, patches.change, patches.remove)).length) {
      // await new Promise((resolve, reject) =>
      //   Modal.confirm({
      //     title: '提示',
      //     content: '你当前对脑图数据的修改将会保存至用例库中，是否继续？',
      //     okText: '继续',
      //     cancelText: '取消',
      //     onOk: () => {
      //       resolve(null);
      //     },
      //     onCancel() {
      //       reject(null);
      //     },
      //   }),
      // );
    } else {
      // 不需要持久化
      return;
    }

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
        throw message.error('模块已超过最大层级限制，请修改后再进行保存');
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
            repository: repository?.objectId,
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
              steps,
              precondition,
            };
          }
          if (name) {
            updateParams.name = name;
          }
          if (priority) {
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
        tasks.push(updateTestEntity(updateTestEntityParams));
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
        tasks.push(deleteTestEntity(needRemoveTestCaseIds));
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
      await Promise.all([
        createTestCase(levelModulePaths),
        changeTestData(levelModulePaths),
        removeTestData(),
      ]);
      message.success('数据更新成功');
      // 刷新左侧树
      onFolderTreeChange();
    } catch (err) {
      console.error('error', err);
      message.error('保存失败');
    } finally {
      setSaveLoading(false);
    }
  });

  const memoizedButtonNode = React.useMemo(() => {
    return (
      <Button onClick={handleSave} loading={saveLoading} type="primary">
        保存
      </Button>
    );
  }, [saveLoading, handleSave]);

  const headerExtraButton = useHeaderExtraActionButton(memoizedButtonNode);

  if (!priorityOptions || !minderData) return null;

  return (
    <>
      {headerExtraButton}
      <MinderEditor
        data={minderData}
        key={workspace.key}
        actionRef={actionRef}
        priorityOptions={priorityOptions}
      />
    </>
  );
};

export default React.memo(TestManagerMinder);
