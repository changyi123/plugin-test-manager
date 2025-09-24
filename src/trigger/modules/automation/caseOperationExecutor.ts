import { storage } from '@giteeteam/apps-api';
import { getParseModel, getParseQuery, saveAllObject } from '@giteeteam/apps-team-api';

import { AppKey, RepositoryClassName } from '../../../common/constant';
import { batchDeleteItems } from '../../lib/batchRequest';
import { forgeCreateItem, forgeUpdateItem, iqlSearch } from '../../lib/coreApi';
import { getItemCreateRequiredAttrs } from '../../lib/item';
import { CaseOperation } from './operationsGenerator';

/**
 * T7.6: 高性能批量用例操作执行器
 * 基于现有的批量操作API实现，支持大规模用例的高效同步
 */

/**
 * 已存在的用例信息
 */
export interface ExistingCaseInfo {
  caseId: string;
  testId: string;
  name: string;
  [key: string]: any;
}

export interface ExecutionResult {
  success: boolean;
  operation: CaseOperation;
  caseId?: string;
  error?: string;
  message?: string;
}

export interface ExecutionSummary {
  total: number;
  successful: number;
  failed: number;
  results: ExecutionResult[];
  stats: {
    CREATE: { attempted: number; successful: number };
    UPDATE: { attempted: number; successful: number };
    DELETE: { attempted: number; successful: number };
    MIGRATE: { attempted: number; successful: number };
  };
}

/**
 * 主入口：执行用例操作列表
 */
export async function executeCaseOperations(
  operations: CaseOperation[],
  workspaceKey?: string,
  commitContext?: any, // 添加commitContext参数
): Promise<ExecutionSummary> {
  console.log(`[AutoSync] 🚀 开始批量执行 ${operations.length} 个用例操作`);

  if (operations.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      results: [],
      stats: {
        CREATE: { attempted: 0, successful: 0 },
        UPDATE: { attempted: 0, successful: 0 },
        DELETE: { attempted: 0, successful: 0 },
        MIGRATE: { attempted: 0, successful: 0 },
      },
    };
  }

  const results: ExecutionResult[] = [];

  // 1. 按操作类型分组，实现批量处理
  const grouped = groupOperationsByType(operations);

  // 2. 查询现有用例信息，用于UPDATE和DELETE操作
  await enrichOperationsWithExistingCaseInfo(operations, workspaceKey);

  // 3. 暂时只处理CREATE操作，其他操作跳过
  if (grouped.CREATE.length > 0) {
    const createResults = await executeBatchCreate(grouped.CREATE, workspaceKey, commitContext);
    results.push(...createResults);
  }

  // 处理UPDATE操作
  if (grouped.UPDATE.length > 0) {
    const updateResults = await executeBatchUpdate(grouped.UPDATE, workspaceKey, commitContext);
    results.push(...updateResults);
  }

  // 处理DELETE操作
  if (grouped.DELETE.length > 0) {
    const deleteResults = await executeBatchDelete(grouped.DELETE, workspaceKey);
    results.push(...deleteResults);
  }

  // 处理MIGRATE操作
  if (grouped.MIGRATE.length > 0) {
    const migrateResults = await executeBatchMigrate(grouped.MIGRATE, workspaceKey);
    results.push(...migrateResults);
  }

  return generateExecutionSummary(operations, results);
}

/**
 * 并发创建用例 - 使用单个创建API并发调用
 */
async function executeBatchCreate(
  operations: CaseOperation[],
  workspaceKey?: string,
  commitContext?: any,
): Promise<ExecutionResult[]> {
  console.log(`[AutoSync] 并发创建 ${operations.length} 个用例，每次并发5个`);

  try {
    // 获取工作空间配置
    if (!workspaceKey) {
      throw new Error('缺少工作空间key');
    }

    const requiredAttrs = await getItemCreateRequiredAttrs({ key: workspaceKey });
    console.log(`[AutoSync] 获取到工作空间配置:`, JSON.stringify(requiredAttrs, null, 2));
    console.log(`[AutoSync] - workspace.objectId: ${requiredAttrs.workspace?.objectId}`);
    console.log(`[AutoSync] - itemType.key: ${requiredAttrs.itemType?.key}`);

    // 1. 预先创建所有需要的Repository，避免并发创建同一个Repository
    const uniqueModulePaths = [...new Set(operations.map(op => op.caseData.modulePath))];
    console.log(`[AutoSync] 预先创建 ${uniqueModulePaths.length} 个不同的模块路径Repository`);

    const repositoryCache = new Map<string, string>();
    for (const modulePath of uniqueModulePaths) {
      const repositoryId = await resolveRepositoryId(modulePath, workspaceKey);
      repositoryCache.set(modulePath, repositoryId);
      console.log(`[AutoSync] - 模块路径: ${modulePath} -> Repository: ${repositoryId}`);
    }

    // 2. 准备创建数据
    const createDataList = operations.map(op => {
      const repositoryId = repositoryCache.get(op.caseData.modulePath) || '';

      return {
        name: op.caseData.caseName,
        ancestors: [],
        workspace: {
          __type: 'Pointer',
          className: 'Workspace',
          objectId: requiredAttrs.workspace.objectId,
        },
        itemType: {
          key: requiredAttrs.itemType.key,
        },
        values: {
          description: op.caseData.caseDesc,
          // 自定义字段 - 所属模块使用repository字段
          r_test_manager_repository: repositoryId,
          r_test_manager_atm_test_id: op.testId,
          r_test_manager_atm_file_path: op.caseData.sourceInfo.filePath,
          r_test_manager_atm_class_name: op.className,
          r_test_manager_atm_method_name: op.methodName,
          r_test_manager_atm_module_path: op.caseData.modulePath,
          r_test_manager_atm_commit_id: op.caseData.sourceInfo.commitId,
          r_test_manager_atm_start_line: op.caseData.sourceInfo.startLine.toString(),
          r_test_manager_atm_end_line: op.caseData.sourceInfo.endLine.toString(),
          r_test_manager_atm_framework: commitContext?.testingFramework || 'JUnit',
          r_test_manager_atm_last_sync: new Date().toISOString(),
          // 添加Git相关字段
          ...(commitContext?.gitCloneUrl && {
            r_test_manager_atm_git_clone_url: commitContext.gitCloneUrl,
          }),
          ...(commitContext?.gitBranch && {
            r_test_manager_atm_git_branch: commitContext.gitBranch,
          }),
          ...(commitContext?.gitPath && { r_test_manager_atm_git_path: commitContext.gitPath }),
        },
      };
    });

    console.log(`[AutoSync] 第一个创建数据示例:`);
    console.log(`[AutoSync] - name: ${createDataList[0].name}`);
    console.log(`[AutoSync] - values字段数量: ${Object.keys(createDataList[0].values).length}`);
    console.log(
      `[AutoSync] - values.r_test_manager_atm_test_id: ${createDataList[0].values.r_test_manager_atm_test_id}`,
    );
    console.log(
      `[AutoSync] - values.r_test_manager_atm_file_path: ${createDataList[0].values.r_test_manager_atm_file_path}`,
    );

    // 分批并发创建，每次5个
    const BATCH_SIZE = 5;
    const results: ExecutionResult[] = [];

    for (let i = 0; i < createDataList.length; i += BATCH_SIZE) {
      const batch = createDataList.slice(i, i + BATCH_SIZE);
      const batchOperations = operations.slice(i, i + BATCH_SIZE);

      console.log(
        `[AutoSync] 处理第 ${Math.floor(i / BATCH_SIZE) + 1} 批，共 ${batch.length} 个事项`,
      );

      // 并发创建当前批次
      const batchPromises = batch.map(async (createData, index) => {
        try {
          console.log(`[AutoSync] 开始创建事项: ${createData.name}`);
          const createdItem = await forgeCreateItem(createData);
          console.log(
            `[AutoSync] 成功创建事项: ${createdItem.objectId || createdItem.id}, name: ${
              createdItem.name
            }`,
          );

          // 记录成功日志
          const operation = batchOperations[index];
          await logSyncOperation({
            operationType: 'CREATE',
            testId: operation.testId,
            caseId: createdItem.objectId || createdItem.id,
            success: true,
            details: `并发创建用例: ${operation.caseData.caseName}`,
          });

          return {
            success: true,
            operation,
            caseId: createdItem.objectId || createdItem.id,
            message: `创建成功: ${createdItem.objectId || createdItem.id}`,
            createdItem,
          };
        } catch (error) {
          console.error(`[AutoSync] 创建事项失败: ${createData.name}`, error);

          // 记录失败日志
          const operation = batchOperations[index];
          await logSyncOperation({
            operationType: 'CREATE',
            testId: operation.testId,
            success: false,
            error: `并发创建失败: ${error}`,
          });

          return {
            success: false,
            operation,
            error: `创建失败: ${error}`,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 检查是否有成功创建的事项并验证自定义字段
      const successfulItems = batchResults.filter(r => r.success && r.createdItem);
      if (successfulItems.length > 0) {
        const firstItem = successfulItems[0].createdItem;
        console.log(`[AutoSync] 验证第一个成功创建的事项自定义字段:`);
        console.log(`[AutoSync] - objectId: ${firstItem.objectId}`);
        console.log(`[AutoSync] - name: ${firstItem.name}`);
        if (firstItem.values) {
          console.log(`[AutoSync] - values.atm_test_id: ${firstItem.values.atm_test_id}`);
          console.log(`[AutoSync] - values.atm_file_path: ${firstItem.values.atm_file_path}`);
          console.log(`[AutoSync] - values字段总数: ${Object.keys(firstItem.values).length}`);
        } else {
          console.log(`[AutoSync] - 警告: values字段为空或未返回`);
        }
      }

      // 避免请求过于频繁，稍作延迟
      if (i + BATCH_SIZE < createDataList.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[AutoSync] 并发创建完成: ${successCount}/${results.length} 成功`);

    return results;
  } catch (error) {
    console.error(`[AutoSync] 并发创建失败:`, error);

    // 记录失败日志
    await Promise.all(
      operations.map(async op => {
        await logSyncOperation({
          operationType: 'CREATE',
          testId: op.testId,
          success: false,
          error: `并发创建失败: ${error}`,
        });
      }),
    );

    return operations.map(op => ({
      success: false,
      operation: op,
      error: `并发创建失败: ${error}`,
    }));
  }
}

/**
 * 并发更新用例 - 使用单个更新API并发调用
 */
async function executeBatchUpdate(
  operations: CaseOperation[],
  workspaceKey?: string,
  commitContext?: any,
): Promise<ExecutionResult[]> {
  console.log(`[AutoSync] 并发更新 ${operations.length} 个用例，每次并发5个`);

  try {
    // 1. 预先创建所有需要的Repository，避免并发创建同一个Repository
    const uniqueModulePaths = [...new Set(operations.map(op => op.caseData.modulePath))];
    console.log(`[AutoSync] 预先创建 ${uniqueModulePaths.length} 个不同的模块路径Repository`);

    const repositoryCache = new Map<string, string>();
    for (const modulePath of uniqueModulePaths) {
      const repositoryId = await resolveRepositoryId(modulePath, workspaceKey);
      repositoryCache.set(modulePath, repositoryId);
      console.log(`[AutoSync] - 模块路径: ${modulePath} -> Repository: ${repositoryId}`);
    }

    // 2. 准备更新数据
    const updateDataList = operations.map(op => {
      const repositoryId = repositoryCache.get(op.caseData.modulePath) || '';

      return {
        objectId: op.existingCaseInfo.caseId,
        updateData: {
          name: op.caseData.caseName, // 更新用例名称
          values: {
            description: op.caseData.caseDesc,
            // 自定义字段 - 所属模块使用repository字段
            r_test_manager_repository: repositoryId,
            r_test_manager_atm_test_id: op.testId,
            r_test_manager_atm_file_path: op.caseData.sourceInfo.filePath,
            r_test_manager_atm_class_name: op.className,
            r_test_manager_atm_method_name: op.methodName,
            r_test_manager_atm_module_path: op.caseData.modulePath,
            r_test_manager_atm_commit_id: op.caseData.sourceInfo.commitId,
            r_test_manager_atm_start_line: op.caseData.sourceInfo.startLine.toString(),
            r_test_manager_atm_end_line: op.caseData.sourceInfo.endLine.toString(),
            r_test_manager_atm_framework: commitContext?.testingFramework || 'JUnit',
            r_test_manager_atm_last_sync: new Date().toISOString(),
            // 添加Git相关字段
            ...(commitContext?.gitCloneUrl && {
              r_test_manager_atm_git_clone_url: commitContext.gitCloneUrl,
            }),
            ...(commitContext?.gitBranch && {
              r_test_manager_atm_git_branch: commitContext.gitBranch,
            }),
            ...(commitContext?.gitPath && { r_test_manager_atm_git_path: commitContext.gitPath }),
          },
        },
      };
    });

    console.log(`[AutoSync] 第一个更新数据示例:`);
    console.log(`[AutoSync] - objectId: ${updateDataList[0].objectId}`);
    console.log(
      `[AutoSync] - values字段数量: ${Object.keys(updateDataList[0].updateData.values).length}`,
    );

    // 分批并发更新，每次5个
    const BATCH_SIZE = 5;
    const results: ExecutionResult[] = [];

    for (let i = 0; i < updateDataList.length; i += BATCH_SIZE) {
      const batch = updateDataList.slice(i, i + BATCH_SIZE);
      const batchOperations = operations.slice(i, i + BATCH_SIZE);

      console.log(
        `[AutoSync] 处理第 ${Math.floor(i / BATCH_SIZE) + 1} 批更新，共 ${batch.length} 个事项`,
      );

      // 并发更新当前批次
      const batchPromises = batch.map(async (updateItem, index) => {
        try {
          console.log(`[AutoSync] 开始更新事项: ${updateItem.objectId}`);
          const updatedItem = await forgeUpdateItem(updateItem.objectId, updateItem.updateData);
          console.log(
            `[AutoSync] 成功更新事项: ${updateItem.objectId} (API返回: ${
              updatedItem?.objectId || updatedItem?.id || 'success'
            })`,
          );

          // 记录成功日志
          const operation = batchOperations[index];
          await logSyncOperation({
            operationType: 'UPDATE',
            testId: operation.testId,
            caseId: operation.existingCaseInfo.caseId,
            success: true,
            details: `并发更新用例: ${operation.caseData.caseName}`,
          });

          return {
            success: true,
            operation,
            caseId: operation.existingCaseInfo.caseId,
            message: `更新成功: ${operation.existingCaseInfo.caseId}`,
          };
        } catch (error) {
          console.error(`[AutoSync] 更新事项失败: ${updateItem.objectId}`, error);

          // 记录失败日志
          const operation = batchOperations[index];
          await logSyncOperation({
            operationType: 'UPDATE',
            testId: operation.testId,
            caseId: operation.existingCaseInfo?.caseId,
            success: false,
            error: `并发更新失败: ${error}`,
          });

          return {
            success: false,
            operation,
            error: `更新失败: ${error}`,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 避免请求过于频繁，稍作延迟
      if (i + BATCH_SIZE < updateDataList.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[AutoSync] 并发更新完成: ${successCount}/${results.length} 成功`);

    return results;
  } catch (error) {
    console.error(`[AutoSync] 并发更新失败:`, error);

    // 记录失败日志
    await Promise.all(
      operations.map(async op => {
        await logSyncOperation({
          operationType: 'UPDATE',
          testId: op.testId,
          caseId: op.existingCaseInfo?.caseId,
          success: false,
          error: `并发更新失败: ${error}`,
        });
      }),
    );

    return operations.map(op => ({
      success: false,
      operation: op,
      error: `并发更新失败: ${error}`,
    }));
  }
}

/**
 * 批量删除用例
 */
async function executeBatchDelete(
  operations: CaseOperation[],
  _workspaceKey?: string,
): Promise<ExecutionResult[]> {
  console.log(`[AutoSync] 批量删除 ${operations.length} 个用例`);

  const caseIds = operations
    .filter(op => op.existingCaseInfo?.caseId && op.existingCaseInfo.caseId !== 'TBD')
    .map(op => op.existingCaseInfo.caseId);

  if (caseIds.length === 0) {
    return operations.map(op => ({
      success: true,
      operation: op,
      message: '用例不存在，跳过删除',
    }));
  }

  // 当删除数量较大时，记录警告
  if (caseIds.length > 50) {
    console.warn(`[CaseOperationExecutor] ⚠️ 警告：即将删除 ${caseIds.length} 个用例，可能需要较长时间`);
    console.log(`[CaseOperationExecutor] 批次大小限制: DELETE_V1.batchSize = 10`);
    console.log(`[CaseOperationExecutor] 预计需要 ${Math.ceil(caseIds.length / 10)} 批次处理`);
  }

  try {
    // 使用现有的批量删除API并检查返回结果
    console.log(`[CaseOperationExecutor] 准备删除 ${caseIds.length} 个用例`);
    console.log(`[CaseOperationExecutor] 前10个用例ID:`, caseIds.slice(0, 10));
    
    const startTime = Date.now();
    const deleteResult = await batchDeleteItems(caseIds);
    const endTime = Date.now();
    
    console.log(`[CaseOperationExecutor] 删除操作耗时: ${(endTime - startTime) / 1000}秒`);
    console.log(`[CaseOperationExecutor] 删除API返回结果:`, JSON.stringify(deleteResult));
    
    // 检查删除结果
    const failedIds = new Set<string>();
    if (deleteResult && deleteResult.items && Array.isArray(deleteResult.items)) {
      // deleteResult.items 包含删除失败的用例ID
      deleteResult.items.forEach((failedId: string) => failedIds.add(failedId));
    }
    
    // 为每个操作生成结果并记录日志
    const results = await Promise.all(
      operations.map(async op => {
        const caseId = op.existingCaseInfo?.caseId;
        const success = caseId && !failedIds.has(caseId);
        
        await logSyncOperation({
          operationType: 'DELETE',
          testId: op.testId,
          caseId: caseId,
          success: success,
          details: success ? `成功删除用例: ${op.testId}` : `删除用例失败: ${op.testId}`,
          error: success ? undefined : `用例ID ${caseId} 删除失败`,
        });
        
        return {
          success: success,
          operation: op,
          caseId: caseId,
          message: success ? `批量删除成功: ${caseId}` : `批量删除失败: ${caseId}`,
          error: success ? undefined : `用例ID ${caseId} 删除失败`,
        };
      }),
    );

    return results;
  } catch (error) {
    console.error(`[AutoSync] 批量删除失败:`, error);
    console.error(`[AutoSync] 错误类型:`, error?.constructor?.name);
    console.error(`[AutoSync] 错误消息:`, error?.message);
    console.error(`[AutoSync] 错误堆栈:`, error?.stack);
    
    // 检查是否是超时错误
    if (error?.message?.includes('timeout') || error?.message?.includes('ETIMEDOUT')) {
      console.error(`[AutoSync] ⚠️ 删除操作超时！可能因为用例数量过多 (${caseIds.length} 个)`);
    }

    // 记录失败日志
    await Promise.all(
      operations.map(async op => {
        await logSyncOperation({
          operationType: 'DELETE',
          testId: op.testId,
          caseId: op.existingCaseInfo?.caseId,
          success: false,
          error: `批量删除失败: ${error?.message || error}`,
          details: `尝试删除 ${caseIds.length} 个用例时失败`,
        });
      }),
    );

    return operations.map(op => ({
      success: false,
      operation: op,
      error: `批量删除失败: ${error?.message || error}`,
      message: `删除失败 - 共尝试删除 ${caseIds.length} 个用例`,
    }));
  }
}

/**
 * 批量迁移用例（实际上是批量更新到新模块）
 */
async function executeBatchMigrate(
  operations: CaseOperation[],
  workspaceKey?: string,
): Promise<ExecutionResult[]> {
  console.log(`[AutoSync] 批量迁移 ${operations.length} 个用例`);

  // MIGRATE操作实际上是UPDATE操作，只是模块路径发生了变化
  return await executeBatchUpdate(operations, workspaceKey);
}

/**
 * 按操作类型分组
 */
function groupOperationsByType(operations: CaseOperation[]): {
  CREATE: CaseOperation[];
  UPDATE: CaseOperation[];
  DELETE: CaseOperation[];
  MIGRATE: CaseOperation[];
} {
  const grouped = {
    CREATE: [] as CaseOperation[],
    UPDATE: [] as CaseOperation[],
    DELETE: [] as CaseOperation[],
    MIGRATE: [] as CaseOperation[],
  };

  for (const operation of operations) {
    grouped[operation.operationType].push(operation);
  }

  return grouped;
}

/**
 * 解析模块路径到Repository ID（实时查询）
 * @param modulePath 模块路径，如: 全部用例库/工作台
 * @param workspaceKey 工作空间key
 * @returns repository objectId
 */
async function resolveRepositoryId(modulePath: string, workspaceKey: string): Promise<string> {
  try {
    // 如果是根路径或未分组，返回空字符串
    if (!modulePath || modulePath === '/' || modulePath === '') {
      return '';
    }

    // 解析模块路径，创建Repository层级结构
    const pathParts = modulePath.split('/').filter(part => part.trim() !== '');

    // 如果第一级是"全部用例库"，跳过它，从第二级开始处理
    if (pathParts[0] === '全部用例库') {
      pathParts.shift(); // 移除"全部用例库"
    }

    // 如果移除后没有路径了，返回空（表示在根目录）
    if (pathParts.length === 0) {
      return '';
    }

    let parentId = null; // root repository的parent为null
    let repositoryId = '';

    for (const pathPart of pathParts) {
      // 查询现有的Repository
      const repositoryQuery = getParseQuery(false, RepositoryClassName);

      const existingRepo = await repositoryQuery
        .equalTo('workspaceKey', workspaceKey)
        .equalTo('name', pathPart)
        .equalTo(
          'parent',
          parentId ? getParseModel(false, RepositoryClassName).createWithoutData(parentId) : null,
        )
        .first({
          useMasterKey: true,
        });

      if (existingRepo) {
        // Repository已存在，使用现有的objectId
        repositoryId = existingRepo.get('objectId');
        parentId = repositoryId;
      } else {
        // Repository不存在，创建新的Repository
        try {
          const RepositoryModel = getParseModel(false, RepositoryClassName);
          const repository = new RepositoryModel();

          repository.set('name', pathPart);
          repository.set('workspaceKey', workspaceKey);
          repository.set('sortIndex', new Date().getTime());

          if (parentId) {
            repository.set('parent', RepositoryModel.createWithoutData(parentId));
          }

          const [savedRepo] = await saveAllObject([repository]);
          repositoryId = savedRepo.id;
          parentId = repositoryId;

          console.log(`[AutoSync] 创建新Repository: ${pathPart} (objectId: ${repositoryId})`);
        } catch (createError) {
          // 可能是并发创建导致的唯一性约束违反，重新查询一次
          console.log(`[AutoSync] Repository创建失败，尝试重新查询: ${pathPart}`);

          const retryQuery = getParseQuery(false, RepositoryClassName);
          const retryRepo = await retryQuery
            .equalTo('workspaceKey', workspaceKey)
            .equalTo('name', pathPart)
            .equalTo(
              'parent',
              parentId
                ? getParseModel(false, RepositoryClassName).createWithoutData(parentId)
                : null,
            )
            .first({
              useMasterKey: true,
            });

          if (retryRepo) {
            repositoryId = retryRepo.get('objectId');
            parentId = repositoryId;
            console.log(`[AutoSync] 重新查询到Repository: ${pathPart} (objectId: ${repositoryId})`);
          } else {
            console.error(`[AutoSync] Repository创建和查询都失败: ${pathPart}`, createError);
            throw createError;
          }
        }
      }
    }

    return repositoryId;
  } catch (error) {
    console.error(`[AutoSync] 解析Repository失败: ${modulePath}`, error);
    // 返回空字符串表示未分组
    return '';
  }
}

/**
 * 生成执行汇总
 */
function generateExecutionSummary(
  operations: CaseOperation[],
  results: ExecutionResult[],
): ExecutionSummary {
  const stats = {
    CREATE: { attempted: 0, successful: 0 },
    UPDATE: { attempted: 0, successful: 0 },
    DELETE: { attempted: 0, successful: 0 },
    MIGRATE: { attempted: 0, successful: 0 },
  };

  operations.forEach(op => {
    stats[op.operationType].attempted++;
  });

  results.forEach(result => {
    if (result.success) {
      stats[result.operation.operationType].successful++;
    }
  });

  const summary: ExecutionSummary = {
    total: operations.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
    stats,
  };

  console.log(`[AutoSync] 🎯 执行完成: ${summary.successful}/${summary.total} 成功`);
  Object.entries(stats).forEach(([type, stat]) => {
    if (stat.attempted > 0) {
      console.log(`[AutoSync] - ${type}: ${stat.successful}/${stat.attempted} 成功`);
    }
  });

  return summary;
}

/**
 * 记录同步操作日志
 */
/**
 * 使用IQL查询获取现有用例信息
 * @param testIds 用例唯一标识数组
 * @param workspaceKey 工作空间key
 * @param itemTypeKey 事项类型key，从工作空间配置中获取
 * @returns 现有用例信息映射
 */
async function queryExistingCasesByTestIds(
  testIds: string[],
  workspaceKey?: string,
  itemTypeKey?: string,
): Promise<Map<string, ExistingCaseInfo>> {
  console.log(`[AutoSync] 🔍 IQL查询现有用例，testIds: ${testIds.join(', ')}`);

  if (testIds.length === 0) {
    return new Map();
  }

  try {
    // 构建IQL查询语句 - 使用 or 条件连接，因为用例唯一标识不支持 in 操作符
    const orConditions = testIds.map(id => `用例唯一标识 = '${id}'`).join(' or ');
    let iql = `(${orConditions})`;

    // 添加事项类型过滤条件
    if (itemTypeKey) {
      iql += ` and itemTypeKey = '${itemTypeKey}'`;
    }

    // 添加工作空间过滤条件
    if (workspaceKey) {
      iql += ` and workspaceKey = '${workspaceKey}'`;
    }

    console.log(`[AutoSync] IQL查询语句: ${iql}`);

    const result = await iqlSearch({
      iql,
      fields: [
        'id',
        'name',
        'values',
        'r_test_manager_atm_test_id',
        'r_test_manager_atm_file_path',
        'r_test_manager_atm_module_path',
      ],
      displayContext: AppKey,
      size: testIds.length,
    });

    const existingCases = new Map<string, ExistingCaseInfo>();

    if (result?.payload?.items) {
      console.log(`[AutoSync] IQL查询结果: 找到 ${result.payload.items.length} 个现有用例`);
      console.log(`[AutoSync] 完整查询结果:`, JSON.stringify(result.payload.items, null, 2));

      result.payload.items.forEach((item: any, index: number) => {
        console.log(`[AutoSync] - 事项 ${index + 1}:`);
        console.log(`[AutoSync]   - id: ${item.id}`);
        console.log(`[AutoSync]   - name: ${item.name}`);
        console.log(`[AutoSync]   - values:`, JSON.stringify(item.values, null, 2));

        // 尝试从多个位置获取testId
        const testId =
          item.values?.r_test_manager_atm_test_id ||
          item.r_test_manager_atm_test_id ||
          item.r_test_manager_atm_test_id;

        console.log(`[AutoSync]   - 提取的testId: ${testId}`);

        if (testId) {
          existingCases.set(testId, {
            caseId: item.id,
            testId: testId,
            name: item.name,
            ...item.values,
            ...item,
          });
          console.log(
            `[AutoSync] - 找到用例: testId=${testId}, caseId=${item.id}, name=${item.name}`,
          );
        } else {
          console.log(`[AutoSync] - 警告: 无法从事项中提取testId`);
        }
      });
    } else {
      console.log(`[AutoSync] IQL查询结果: 未找到任何现有用例`);
    }

    return existingCases;
  } catch (error) {
    console.error(`[AutoSync] IQL查询现有用例失败:`, error);
    return new Map();
  }
}

/**
 * 丰富操作信息，添加现有用例的详细信息
 */
async function enrichOperationsWithExistingCaseInfo(
  operations: CaseOperation[],
  workspaceKey?: string,
): Promise<void> {
  // 提取所有需要查询的testId
  const testIds = operations.map(op => op.testId);

  // 获取工作空间配置以获取itemTypeKey
  let itemTypeKey: string | undefined;
  if (workspaceKey) {
    try {
      const requiredAttrs = await getItemCreateRequiredAttrs({ key: workspaceKey });
      itemTypeKey = requiredAttrs.itemType?.key;
      console.log(`[AutoSync] 获取到事项类型Key: ${itemTypeKey}`);
    } catch (error) {
      console.error(`[AutoSync] 获取工作空间配置失败:`, error);
    }
  }

  // 批量查询现有用例
  const existingCasesMap = await queryExistingCasesByTestIds(testIds, workspaceKey, itemTypeKey);

  // 为每个操作添加现有用例信息
  operations.forEach(op => {
    const existingCase = existingCasesMap.get(op.testId);
    if (existingCase) {
      op.existingCaseInfo = existingCase;
      console.log(
        `[AutoSync] 操作 ${op.operationType} - testId: ${op.testId} 找到现有用例: ${existingCase.caseId}`,
      );
    } else {
      console.log(`[AutoSync] 操作 ${op.operationType} - testId: ${op.testId} 未找到现有用例`);
    }
  });
}

async function logSyncOperation(logData: {
  operationType: string;
  testId: string;
  caseId?: string;
  success: boolean;
  details?: string;
  error?: string;
}): Promise<void> {
  try {
    const syncLog = {
      operationType: logData.operationType,
      testId: logData.testId,
      caseId: logData.caseId,
      success: logData.success,
      details: logData.details,
      error: logData.error,
      timestamp: new Date(),
      syncSource: 'T7.6-批量执行器',
    };

    await storage.entity('AutomationSyncLog').add(syncLog);
  } catch (error) {
    console.error('[AutoSync] 记录同步日志失败:', error);
    // 日志失败不应该影响主流程
  }
}
