import { AppKey } from '../../../common/constant';
import { iqlSearch } from '../../lib/coreApi';
import { getItemCreateRequiredAttrs } from '../../lib/item';
import { getCommitDiff, getFileContent, scanDirectoryForJavaFiles } from './codeApi';
import { javaParser } from './parser';
import { findBestPathMapping } from './pathMappingEnhanced';
import { updateCaseGenerationProgress } from './queueStatistics';

/**
 * T5.8: 用例操作生成引擎
 * 对接T4.7-T4.9的文件级闭环决策结果，生成具体的用例操作对象
 */

// 用例操作对象 - T5.8的输出
export interface CaseOperation {
  // 基础标识
  operationType: 'CREATE' | 'UPDATE' | 'DELETE' | 'MIGRATE';
  testId: string;
  methodName: string;
  className: string;
  filePath: string;

  // 用例数据（CREATE/UPDATE需要）
  caseData?: {
    caseName: string; // 用例名称 = className + "." + methodName
    caseDesc: string; // 用例描述（从注释提取）
    modulePath: string; // 模块路径（来自config.mappings）
    sourceInfo: {
      filePath: string;
      startLine: number;
      endLine: number;
      commitId: string;
    };
  };

  // 历史用例信息（UPDATE/DELETE/MIGRATE需要）
  existingCaseInfo?: {
    caseId: string; // 现有用例ID
    testId: string; // 用例唯一标识
    name: string; // 用例名称
    oldClassName?: string; // 旧类名，用于类名变更场景
    [key: string]: any; // 其他字段
  };

  // 类名变更标记
  classNameChanged?: boolean;

  // 模块迁移信息（MIGRATE需要）
  moduleChange?: {
    oldModulePath: string;
    newModulePath: string;
    reason: string; // 迁移原因：重命名/配置变更
  };
}

// 文件决策结果接口（来自T4.7-T4.9）
export interface FileDecisionResult {
  filePath: string;
  oldFilePath?: string; // 重命名场景中的旧路径，用于查询历史用例
  decision:
    | 'create_all'
    | 'delete_all'
    | 'operation_a'
    | 'operation_b'
    | 'ignore'
    | 'merged_path_rename'
    | 'merged_module_change'
    | 'config_path_rename'
    | 'config_module_change'
    | 'config_mapping_added'
    | 'config_mapping_removed'
    | 'config_mapping_removed_smart';
  operations: any[];
  reason: string;
  deletedModule?: string; // 删除映射时的被删除模块，用于智能分析
  analysisHint?: string; // 分析提示信息
}

// 提交上下文信息
export interface CommitContext {
  repositoryId: string;
  commitId: string;
  branchName: string;
  workspaceKey: string; // 工作空间key，从 webhook.project.program_uuid 获取
  // Git相关信息
  gitCloneUrl?: string; // payload.project.git_ssh_url
  gitBranch?: string; // payload.ref (processed as branch)
  gitPath?: string; // payload.project.full_path
  // 测试框架信息
  testingFramework?: string; // 从config.testingFramework获取，如 "JUnit4.0" 或 "TestNG7.1.0"
  // 统计相关
  queueId?: string; // 队列ID，用于统计追踪
}

// 历史用例信息
export interface HistoryCaseInfo {
  caseId: string;
  testId: string;
  methodName: string;
  className: string;
  modulePath: string;
  filePath: string;
}

/**
 * T5.8主入口：处理文件决策结果，生成用例操作列表
 */
export async function processDecisionResults(
  fileDecisions: FileDecisionResult[],
  config: any,
  commitContext: CommitContext,
): Promise<CaseOperation[]> {
  console.log(`[DEBUG] ================= processDecisionResults START =================`);
  console.log(`[DEBUG] fileDecisions数量: ${fileDecisions.length}`);
  console.log(`[DEBUG] 第一个决策:`, JSON.stringify(fileDecisions[0], null, 2));
  console.log(`[T5.8] 🚀 开始处理 ${fileDecisions.length} 个文件决策`);
  const operations: CaseOperation[] = [];

  for (const fileDecision of fileDecisions) {
    console.log(`[T5.8] 处理文件决策: ${fileDecision.filePath} -> ${fileDecision.decision}`);

    let fileOperations: CaseOperation[] = [];

    try {
      switch (fileDecision.decision) {
        case 'create_all':
          fileOperations = await generateCreateAllOperations(fileDecision, config, commitContext);
          break;

        case 'delete_all':
          fileOperations = await generateDeleteAllOperations(fileDecision, config, commitContext);
          break;

        case 'operation_a': // 涉及模块变更
          fileOperations = await generateOperationAOperations(fileDecision, config, commitContext);
          break;

        case 'operation_b': // 正常更新
          fileOperations = await generateOperationBOperations(fileDecision, config, commitContext);
          break;

        // 配置文件协调处理的决策类型
        case 'merged_path_rename':
        case 'merged_module_change':
        case 'config_path_rename':
        case 'config_module_change':
        case 'config_mapping_added':
        case 'config_mapping_removed':
        case 'config_mapping_removed_smart':
          console.log(`[T5.8] 进入配置协调处理分支: ${fileDecision.decision}`);
          fileOperations = await generateConfigCoordinationOperations(
            fileDecision,
            config,
            commitContext,
          );
          console.log(`[T5.8] 配置协调处理完成，生成 ${fileOperations.length} 个操作`);
          break;

        case 'ignore':
          console.log(`[T5.8] 忽略文件: ${fileDecision.reason}`);
          continue;

        default:
          console.warn(`[T5.8] 未知决策类型: ${fileDecision.decision}`);
          continue;
      }

      operations.push(...fileOperations);
      console.log(`[T5.8] 文件 ${fileDecision.filePath} 生成 ${fileOperations.length} 个用例操作`);

      // 插入用例生成统计
      if (commitContext.queueId && fileOperations.length > 0) {
        await updateCaseGenerationProgress(
          commitContext.queueId,
          fileDecision.filePath,
          fileOperations,
        );
      }
    } catch (error) {
      console.error(`[T5.8] 处理文件 ${fileDecision.filePath} 失败:`, error);
      // 继续处理其他文件
    }
  }

  // 统计日志
  const stats = {
    CREATE: operations.filter(op => op.operationType === 'CREATE').length,
    UPDATE: operations.filter(op => op.operationType === 'UPDATE').length,
    DELETE: operations.filter(op => op.operationType === 'DELETE').length,
    MIGRATE: operations.filter(op => op.operationType === 'MIGRATE').length,
  };

  console.log(
    `[T5.8] 生成用例操作汇总: CREATE(${stats.CREATE}) UPDATE(${stats.UPDATE}) DELETE(${stats.DELETE}) MIGRATE(${stats.MIGRATE})`,
  );
  console.log(`[DEBUG] ================= processDecisionResults END =================`);
  console.log(`[DEBUG] 最终返回操作数量: ${operations.length}`);

  return operations;
}

/**
 * 处理create_all决策：新增文件或目录的所有测试方法
 */
async function generateCreateAllOperations(
  fileDecision: FileDecisionResult,
  config: any,
  commitContext: CommitContext,
): Promise<CaseOperation[]> {
  console.log(`[T7.6] 处理create_all: ${fileDecision.filePath}`);

  // 检查是否为目录级别的映射 (path不以.java结尾，通常是目录)
  const isDirectoryMapping = !fileDecision.filePath.endsWith('.java');

  let filesToProcess: string[] = [];

  if (isDirectoryMapping) {
    console.log(`[T7.6] 检测到目录级映射: ${fileDecision.filePath}，开始扫描目录下的Java文件`);
    filesToProcess = await scanDirectoryForJavaFiles(
      commitContext.repositoryId,
      fileDecision.filePath,
      commitContext.branchName,
    );
    console.log(`[T7.6] 目录扫描结果: 找到 ${filesToProcess.length} 个Java文件`);
  } else {
    console.log(`[T7.6] 文件级映射: ${fileDecision.filePath}`);
    filesToProcess = [fileDecision.filePath];
  }

  const allOperations: CaseOperation[] = [];

  // 2. 处理每个文件
  for (const filePath of filesToProcess) {
    console.log(`[T7.6] 处理文件: ${filePath}`);

    // 获取文件内容并解析
    const fileContent = await getFileContent(
      commitContext.repositoryId,
      filePath,
      commitContext.branchName,
    );
    if (!fileContent) {
      console.warn(`[T7.6] 无法获取文件内容: ${filePath}`);
      continue;
    }

    console.log(`[T7.6] 开始解析文件内容，长度: ${fileContent.length} 字符`);

    const className = javaParser.extractClassName(fileContent);
    const testMethods = javaParser.parseTestMethods(fileContent);
    const modulePath = findBestPathMapping(fileDecision.filePath, config.mappings); // 使用原始决策路径查找模块

    console.log(`[T7.6] 解析结果: 类名=${className}, 测试方法数=${testMethods.length}`);
    console.log(`[T7.6] 配置映射查询: ${fileDecision.filePath} -> ${modulePath}`);

    if (!modulePath) {
      console.warn(`[T7.6] 文件无模块映射: ${fileDecision.filePath}`);
      continue;
    }

    console.log(
      `[T5.8] 解析完成: 文件=${filePath}, 类=${className}, 方法数=${testMethods.length}, 模块=${modulePath}`,
    );

    // 为每个测试方法生成CREATE操作
    if (testMethods.length === 0) {
      console.log(`[T7.6] 文件中没有找到测试方法: ${filePath}`);
    }

    for (const method of testMethods) {
      console.log(`[T7.6] 处理测试方法: ${method.methodName}, testId: ${method.testId}`);
      const caseDesc = await extractCaseDescription(fileContent, method.startLine);

      allOperations.push({
        operationType: 'CREATE',
        testId: method.testId,
        methodName: method.methodName,
        className: className || 'UnknownClass',
        filePath: filePath, // 使用实际文件路径，不是目录路径
        caseData: {
          caseName: `${className}.${method.methodName}`,
          caseDesc: caseDesc || `测试用例: ${method.testId}`,
          modulePath: modulePath,
          sourceInfo: {
            filePath: filePath, // 使用实际文件路径
            startLine: method.startLine,
            endLine: method.endLine,
            commitId: commitContext.commitId,
          },
        },
      });

      console.log(
        `[T7.6] 生成CREATE操作: ${method.testId} -> ${className}.${method.methodName} (来自文件: ${filePath})`,
      );
    }
  }

  console.log(
    `[T5.8] create_all: ${fileDecision.filePath} 共处理 ${filesToProcess.length} 个文件，生成 ${allOperations.length} 个CREATE操作`,
  );
  return allOperations;
}

/**
 * 处理delete_all决策：删除文件的所有历史用例
 */
async function generateDeleteAllOperations(
  fileDecision: FileDecisionResult,
  config: any,
  commitContext: CommitContext,
): Promise<CaseOperation[]> {
  console.log(`[T5.8] 处理delete_all: ${fileDecision.filePath}`);

  // 对于重命名场景，优先使用旧路径查询历史用例
  const queryPath = fileDecision.oldFilePath || fileDecision.filePath;
  console.log(
    `[T5.8] 查询历史用例路径: ${queryPath} ${
      fileDecision.oldFilePath ? '(使用旧路径)' : '(使用当前路径)'
    }`,
  );

  // 获取事项类型key，用于过滤条件防止误删
  let itemTypeKey: string | undefined;
  if (commitContext.workspaceKey) {
    try {
      const requiredAttrs = await getItemCreateRequiredAttrs({ key: commitContext.workspaceKey });
      itemTypeKey = requiredAttrs.itemType?.key;
      console.log(`[T5.8] 获取到事项类型Key: ${itemTypeKey}`);
    } catch (error) {
      console.error(`[T5.8] 获取工作空间配置失败:`, error);
    }
  }

  // 获取该文件的所有历史用例，添加工作空间和事项类型过滤条件防止误删
  const historyCases = await getHistoryCasesForFile(
    queryPath,
    commitContext.workspaceKey,
    itemTypeKey,
  );
  const operations: CaseOperation[] = [];

  for (const [testId, historyCase] of historyCases) {
    operations.push({
      operationType: 'DELETE',
      testId: testId,
      methodName: historyCase.methodName,
      className: historyCase.className,
      filePath: fileDecision.filePath,
      existingCaseInfo: {
        caseId: historyCase.caseId,
        testId: testId,
        name: historyCase.methodName,
        currentModulePath: historyCase.modulePath,
      },
    });
  }

  console.log(`[T5.8] delete_all: ${fileDecision.filePath} 生成 ${operations.length} 个DELETE操作`);
  return operations;
}

/**
 * 处理operation_b决策：正常文件更新（增量同步）
 */
async function generateOperationBOperations(
  fileDecision: FileDecisionResult,
  config: any,
  commitContext: CommitContext,
): Promise<CaseOperation[]> {
  console.log(`[T5.8] 处理operation_b: ${fileDecision.filePath}`);

  // 1. 获取当前文件内容和历史映射
  const fileContent = await getFileContent(
    commitContext.repositoryId,
    fileDecision.filePath,
    commitContext.branchName,
  );
  if (!fileContent) {
    console.warn(`[T7.6] 无法获取文件内容: ${fileDecision.filePath}`);
    return [];
  }

  const className = javaParser.extractClassName(fileContent);
  const currentMethods = javaParser.parseTestMethods(fileContent);
  const modulePath = findBestPathMapping(fileDecision.filePath, config.mappings);

  if (!modulePath) {
    console.warn(`[T7.6] 文件无模块映射: ${fileDecision.filePath}`);
    return [];
  }

  // 2. 获取历史用例信息（用于检测类名变更）
  const historyCases = await getHistoryCasesForFile(
    fileDecision.filePath,
    commitContext.workspaceKey,
  );

  // 3. 分析受影响的方法（通过diff）
  const affectedMethods = await getAffectedMethodsFromDiff(
    commitContext.repositoryId,
    commitContext.commitId,
    fileDecision.filePath,
    currentMethods,
  );

  // 4. 分析diff中的@TestId变化和类名变更（优化版本：一次分析获取所有信息）
  const { addedTestIds, removedTestIds, classNameChanged, oldClassName, newClassName } =
    await analyzeTestIdChangesInDiff(
      commitContext.repositoryId,
      commitContext.commitId,
      fileDecision.filePath,
    );

  // 类名变更标记（从diff中直接获取，无需额外查询历史用例）
  const hasClassNameChanged = classNameChanged;

  const operations: CaseOperation[] = [];

  console.log(
    `[T5.8] operation_b分析: 当前方法=${currentMethods.length}, 受影响方法=${affectedMethods.length}`,
  );
  console.log(
    `[T5.8] diff分析: 新增TestId=${addedTestIds.length}, 删除TestId=${removedTestIds.length}`,
  );
  if (hasClassNameChanged && oldClassName && newClassName) {
    console.log(`[T5.8] 类名变更检测: ${oldClassName} -> ${newClassName}`);
  } else {
    console.log(`[T5.8] 类名变更检测: 未检测到类名变更`);
  }

  // 4. 处理每个当前方法
  for (const method of currentMethods) {
    const isAffected = affectedMethods.some(m => m.testId === method.testId);
    const isNewlyAdded = addedTestIds.includes(method.testId);
    const existsInHistory = historyCases.has(method.testId);

    if (isNewlyAdded) {
      // diff中新增的@TestId → CREATE
      const caseDesc = await extractCaseDescription(fileContent, method.startLine);

      console.log(`[T5.8] ${method.testId}: diff中新增@TestId -> CREATE`);

      operations.push({
        operationType: 'CREATE',
        testId: method.testId,
        methodName: method.methodName,
        className: className || 'UnknownClass',
        filePath: fileDecision.filePath,
        caseData: {
          caseName: `${className}.${method.methodName}`,
          caseDesc: caseDesc || `测试用例: ${method.testId}`,
          modulePath: modulePath,
          sourceInfo: {
            filePath: fileDecision.filePath,
            startLine: method.startLine,
            endLine: method.endLine,
            commitId: commitContext.commitId,
          },
        },
      });
    } else if (isAffected || (hasClassNameChanged && existsInHistory)) {
      // 已存在但受影响的方法 OR 类名变更的已存在方法 → UPDATE
      const caseDesc = await extractCaseDescription(fileContent, method.startLine);
      const historyCase = historyCases.get(method.testId);

      const updateReason = [];
      if (isAffected) updateReason.push('方法受diff影响');
      if (hasClassNameChanged && existsInHistory) {
        // 使用diff中解析出的类名信息
        const displayOldName = oldClassName || historyCase?.className || 'Unknown';
        const displayNewName = newClassName || className || 'Unknown';
        updateReason.push(`类名变更(${displayOldName} -> ${displayNewName})`);
      }

      console.log(`[T5.8] ${method.testId}: ${updateReason.join(' + ')} -> UPDATE`);

      operations.push({
        operationType: 'UPDATE',
        testId: method.testId,
        methodName: method.methodName,
        className: className || 'UnknownClass',
        filePath: fileDecision.filePath,
        caseData: {
          caseName: `${className}.${method.methodName}`,
          caseDesc: caseDesc || `测试用例: ${method.testId}`,
          modulePath: modulePath,
          sourceInfo: {
            filePath: fileDecision.filePath,
            startLine: method.startLine,
            endLine: method.endLine,
            commitId: commitContext.commitId,
          },
        },
        existingCaseInfo: {
          caseId: historyCase?.caseId || 'TBD',
          testId: method.testId,
          name: `${className}.${method.methodName}`,
          currentModulePath: modulePath,
          oldClassName: oldClassName || historyCase?.className, // 优先使用diff中的旧类名
        },
        classNameChanged: hasClassNameChanged && existsInHistory, // 标记类名是否变更
      });
    }
    // 未受影响且非新增的方法不需要操作
  }

  // 5. 处理删除的@TestId
  for (const removedTestId of removedTestIds) {
    console.log(`[T5.8] ${removedTestId}: diff中删除@TestId -> DELETE`);

    operations.push({
      operationType: 'DELETE',
      testId: removedTestId,
      methodName: 'Unknown',
      className: className || 'UnknownClass',
      filePath: fileDecision.filePath,
      existingCaseInfo: {
        caseId: 'TBD', // Will be enriched by caseOperationExecutor
        testId: removedTestId,
        name: 'Unknown',
        currentModulePath: modulePath,
      },
    });
  }

  console.log(`[T5.8] operation_b: ${fileDecision.filePath} 生成 ${operations.length} 个操作`);
  return operations;
}

/**
 * 处理operation_a决策：涉及模块变更的操作
 */
async function generateOperationAOperations(
  fileDecision: FileDecisionResult,
  config: any,
  commitContext: CommitContext,
): Promise<CaseOperation[]> {
  console.log(`[T5.8] 处理operation_a: ${fileDecision.filePath}`);

  // operation_a通常涉及模块路径变更，先按operation_b处理，然后增加MIGRATE操作
  const baseOperations = await generateOperationBOperations(fileDecision, config, commitContext);

  // 检查是否有模块路径变更需要MIGRATE操作
  const newModulePath = findBestPathMapping(fileDecision.filePath, config.mappings);

  for (const operation of baseOperations) {
    if (operation.operationType === 'UPDATE' && operation.existingCaseInfo) {
      const oldModulePath = operation.existingCaseInfo.currentModulePath;

      if (oldModulePath && newModulePath && oldModulePath !== newModulePath) {
        // 转换为MIGRATE操作
        operation.operationType = 'MIGRATE';
        operation.moduleChange = {
          oldModulePath: oldModulePath,
          newModulePath: newModulePath,
          reason: '文件重命名导致模块路径变更',
        };
      }
    }
  }

  console.log(`[T5.8] operation_a: ${fileDecision.filePath} 生成 ${baseOperations.length} 个操作`);
  return baseOperations;
}

/**
 * 处理配置文件协调相关的决策
 */
async function generateConfigCoordinationOperations(
  fileDecision: FileDecisionResult,
  config: any,
  commitContext: CommitContext,
): Promise<CaseOperation[]> {
  console.log(`[T5.8] 处理配置协调: ${fileDecision.decision} -> ${fileDecision.filePath}`);
  console.log(`[T5.8] 配置协调决策详情:`, JSON.stringify(fileDecision, null, 2));

  // 配置协调操作通常涉及复杂的MIGRATE和批量操作
  // 先简化实现，后续根据具体需求完善
  const operations: CaseOperation[] = [];

  switch (fileDecision.decision) {
    case 'config_path_rename':
    case 'merged_path_rename':
      // 路径重命名：更新文件路径，保持模块路径不变
      const historyCases = await getHistoryCasesForFile(
        fileDecision.filePath,
        commitContext.workspaceKey,
      );
      for (const [testId, historyCase] of historyCases) {
        operations.push({
          operationType: 'MIGRATE',
          testId: testId,
          methodName: historyCase.methodName,
          className: historyCase.className,
          filePath: fileDecision.filePath,
          existingCaseInfo: {
            caseId: historyCase.caseId,
            testId: testId,
            name: historyCase.methodName,
            currentModulePath: historyCase.modulePath,
          },
          moduleChange: {
            oldModulePath: historyCase.modulePath,
            newModulePath: historyCase.modulePath, // 模块路径不变
            reason: '配置文件中文件路径重命名',
          },
        });
      }
      break;

    case 'config_mapping_added':
      // 新增映射：扫描文件创建用例
      console.log(
        `[T5.8] config_mapping_added: 调用generateCreateAllOperations处理文件 ${fileDecision.filePath}`,
      );
      const createOps = await generateCreateAllOperations(fileDecision, config, commitContext);
      console.log(
        `[T5.8] config_mapping_added: generateCreateAllOperations返回 ${createOps.length} 个操作`,
      );
      return createOps;

    case 'config_mapping_removed':
      // 删除映射：删除相关用例
      return await generateDeleteAllOperations(fileDecision, config, commitContext);

    case 'config_mapping_removed_smart':
      // 智能删除映射：需要使用删除分析器分析影响
      console.log(`[T5.8] config_mapping_removed_smart: 开始智能分析删除影响`);
      console.log(
        `[T5.8] 删除路径: ${fileDecision.filePath}, 删除模块: ${fileDecision.deletedModule}`,
      );
      // TODO: 这里应该使用 mappingDeletionAnalyzer 进行智能分析
      // 目前先使用简单的删除逻辑，后续需要实现智能分析
      console.log(`[T5.8] 暂时使用简单删除逻辑，TODO: 实现智能优先级分析`);
      return await generateDeleteAllOperations(fileDecision, config, commitContext);

    case 'config_module_change':
    case 'merged_module_change':
      // 模块路径变更：将现有用例迁移到新模块路径
      return await generateModuleChangeOperations(fileDecision, config, commitContext);

    // 其他复杂场景待实现
    default:
      console.log(`[T5.8] 配置协调决策 ${fileDecision.decision} 暂未完全实现`);
  }

  console.log(`[T5.8] 配置协调: ${fileDecision.filePath} 生成 ${operations.length} 个操作`);
  return operations;
}

/**
 * 处理模块路径变更：生成MIGRATE操作
 */
async function generateModuleChangeOperations(
  fileDecision: FileDecisionResult,
  config: any,
  commitContext: CommitContext,
): Promise<CaseOperation[]> {
  console.log(`[T5.8] 处理模块变更: ${fileDecision.filePath}`);

  // 1. 获取文件内容并解析测试方法
  const fileContent = await getFileContent(
    commitContext.repositoryId,
    fileDecision.filePath,
    commitContext.branchName,
  );
  if (!fileContent) {
    console.warn(`[T7.6] 无法获取文件内容: ${fileDecision.filePath}`);
    return [];
  }

  const className = javaParser.extractClassName(fileContent);
  const currentMethods = javaParser.parseTestMethods(fileContent);
  const newModulePath = findBestPathMapping(fileDecision.filePath, config.mappings);

  if (!newModulePath) {
    console.warn(`[T7.6] 文件无模块映射: ${fileDecision.filePath}`);
    return [];
  }

  console.log(`[T5.8] 模块变更: ${fileDecision.filePath} -> ${newModulePath}`);
  console.log(`[T5.8] 找到 ${currentMethods.length} 个测试方法，需要生成MIGRATE操作`);

  const operations: CaseOperation[] = [];

  // 2. 为每个测试方法生成MIGRATE操作
  for (const method of currentMethods) {
    const caseDesc = await extractCaseDescription(fileContent, method.startLine);

    operations.push({
      operationType: 'MIGRATE',
      testId: method.testId,
      methodName: method.methodName,
      className: className || 'UnknownClass',
      filePath: fileDecision.filePath,
      caseData: {
        caseName: `${className}.${method.methodName}`,
        caseDesc: caseDesc || `测试用例: ${method.testId}`,
        modulePath: newModulePath,
        sourceInfo: {
          filePath: fileDecision.filePath,
          startLine: method.startLine,
          endLine: method.endLine,
          commitId: commitContext.commitId,
        },
      },
      existingCaseInfo: {
        caseId: 'TBD', // Will be enriched by caseOperationExecutor
        testId: method.testId,
        name: `${className}.${method.methodName}`,
        currentModulePath: 'TBD', // Old module path will be determined from existing case
      },
      moduleChange: {
        oldModulePath: 'TBD', // Will be determined from existing case
        newModulePath: newModulePath,
        reason: '配置文件中模块路径变更',
      },
    });
  }

  console.log(
    `[T5.8] config_module_change: ${fileDecision.filePath} 生成 ${operations.length} 个MIGRATE操作`,
  );
  return operations;
}

/**
 * 获取文件的历史用例映射
 * 通过IQL查询测试管理系统中与该文件路径关联的用例数据
 * @param filePath 文件路径
 * @param workspaceKey 工作空间key，用于过滤条件防止误删
 * @param itemTypeKey 事项类型key，用于过滤条件防止误删
 */
async function getHistoryCasesForFile(
  filePath: string,
  workspaceKey?: string,
  itemTypeKey?: string,
): Promise<Map<string, HistoryCaseInfo>> {
  console.log(`[T5.8] 查询文件历史用例: ${filePath}`);

  try {
    // 使用IQL查询该文件路径对应的所有用例，添加工作空间和类型过滤条件防止误删
    // 判断是否为目录路径：使用通用的目录判断逻辑
    const isDirectoryPathFlag = isDirectoryPath(filePath);
    let iql = isDirectoryPathFlag ? `文件路径 ~ "${filePath}"` : `文件路径 = "${filePath}"`;

    // 添加工作空间过滤条件（使用工作空间key）
    if (workspaceKey) {
      iql += ` and workspaceKey = '${workspaceKey}'`;
    }

    // 添加事项类型过滤条件（使用事项类型key）
    if (itemTypeKey) {
      iql += ` and itemTypeKey = '${itemTypeKey}'`;
    }

    console.log(`[T5.8] 历史用例IQL查询: ${iql}`);

    const result = await iqlSearch({
      iql,
      fields: [
        'id',
        'name',
        'values',
        'r_test_manager_atm_test_id',
        'r_test_manager_atm_file_path',
        'r_test_manager_atm_module_path',
        'r_test_manager_atm_class_name',
        'r_test_manager_atm_method_name',
      ],
      displayContext: AppKey,
      size: 10000, // 提高查询限制以处理大量用例的情况
    });

    const historyCases = new Map<string, HistoryCaseInfo>();

    if (result?.payload?.items) {
      console.log(`[T5.8] 找到 ${result.payload.items.length} 个历史用例`);

      result.payload.items.forEach((item: any) => {
        // 尝试从多个位置获取testId
        const testId =
          item.values?.r_test_manager_atm_test_id ||
          item.r_test_manager_atm_test_id ||
          item.r_test_manager_atm_test_id;

        const className =
          item.values?.r_test_manager_atm_class_name ||
          item.r_test_manager_atm_class_name ||
          item.r_test_manager_atm_class_name;

        const methodName =
          item.values?.r_test_manager_atm_method_name ||
          item.r_test_manager_atm_method_name ||
          item.r_test_manager_atm_method_name;

        const modulePath =
          item.values?.r_test_manager_atm_module_path ||
          item.r_test_manager_atm_module_path ||
          item.r_test_manager_atm_module_path;

        if (testId) {
          historyCases.set(testId, {
            caseId: item.id,
            testId: testId,
            methodName: methodName || 'Unknown',
            className: className || 'Unknown',
            modulePath: modulePath || '',
            filePath: filePath,
          });

          console.log(`[T5.8] - 历史用例: ${testId} (${item.id}) ${className}.${methodName}`);
        } else {
          console.warn(`[T5.8] - 用例缺少testId: ${item.id}`);
        }
      });
    } else {
      console.log(`[T5.8] 该文件没有找到历史用例: ${filePath}`);
    }

    return historyCases;
  } catch (error) {
    console.error(`[T5.8] 查询文件历史用例失败: ${filePath}`, error);
    return new Map();
  }
}

/**
 * 通过diff分析受影响的测试方法
 */
async function getAffectedMethodsFromDiff(
  repositoryId: string,
  commitId: string,
  filePath: string,
  allMethods: any[],
) {
  try {
    // 获取单个文件的diff（需要实现getFileDiff或类似功能）
    const diffData = await getCommitDiff(repositoryId, commitId);

    if (!Array.isArray(diffData)) {
      console.warn(`[T5.8] 无效的diff数据格式`);
      return [];
    }

    // 找到目标文件的diff
    const fileDiff = diffData.find(f => f.new_path === filePath || f.old_path === filePath);
    if (!fileDiff || !fileDiff.diff) {
      console.log(`[T5.8] 文件 ${filePath} 无diff内容`);
      return [];
    }

    // 使用parser分析受影响的方法
    const affectedMethods = javaParser.analyzeAffectedMethods(allMethods, fileDiff.diff);

    console.log(
      `[T5.8] diff分析: ${filePath} 中 ${affectedMethods.length}/${allMethods.length} 个方法受影响`,
    );
    return affectedMethods;
  } catch (error) {
    console.error(`[T5.8] diff分析失败: ${filePath}`, error);
    return [];
  }
}

/**
 * 判断一行代码是否被注释
 */
function isCommentedLine(line: string): boolean {
  const trimmedLine = line.trim();

  // 检查单行注释 //
  if (trimmedLine.startsWith('//')) {
    return true;
  }

  // 检查块注释 /* ... */
  if (trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
    return true;
  }

  // 检查行内注释（注释在代码前面）
  const beforeComment = line.match(/^\s*\/\//);
  if (beforeComment) {
    return true;
  }

  return false;
}

/**
 * 分析diff中@TestId的增删变化和类名变更
 */
async function analyzeTestIdChangesInDiff(
  repositoryId: string,
  commitId: string,
  filePath: string,
): Promise<{
  addedTestIds: string[];
  removedTestIds: string[];
  classNameChanged: boolean;
  oldClassName?: string;
  newClassName?: string;
}> {
  const addedTestIds: string[] = [];
  const removedTestIds: string[] = [];
  let classNameChanged = false;
  let oldClassName: string | undefined;
  let newClassName: string | undefined;

  try {
    // 获取diff数据
    const diffData = await getCommitDiff(repositoryId, commitId);
    if (!Array.isArray(diffData)) {
      console.warn(`[T5.8] 无效的diff数据格式`);
      return { addedTestIds, removedTestIds, classNameChanged };
    }

    // 找到目标文件的diff
    const fileDiff = diffData.find(f => f.new_path === filePath || f.old_path === filePath);
    if (!fileDiff || !fileDiff.diff) {
      console.log(`[T5.8] 文件 ${filePath} 无diff内容`);
      return { addedTestIds, removedTestIds, classNameChanged };
    }

    // 解析diff中的@TestId变化和类名变更
    const diffLines = fileDiff.diff.split('\n');

    // 类名检测的正则表达式：匹配各种访问修饰符的类声明
    const classPattern = /^\s*(?:public\s+|private\s+|protected\s+|static\s+)*class\s+(\w+)/;

    for (const line of diffLines) {
      // 检测@TestId变化
      if (line.includes('@TestId')) {
        const testIdMatch = /@TestId\s*\(\s*["']([^"']+)["']\s*\)/.exec(line);
        if (testIdMatch) {
          const testId = testIdMatch[1];

          if (line.startsWith('+') && !line.startsWith('+++')) {
            // 检查是否是注释掉的@TestId
            const lineContent = line.substring(1).trim(); // 去掉 '+' 符号
            if (isCommentedLine(lineContent)) {
              console.log(`[T5.8] 忽略注释掉的@TestId: ${testId}`);
              continue;
            }
            // 新增的@TestId
            if (!addedTestIds.includes(testId)) {
              addedTestIds.push(testId);
              console.log(`[T5.8] 发现新增@TestId: ${testId}`);
            }
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            // 检查被删除的行是否原本就是注释
            const lineContent = line.substring(1).trim(); // 去掉 '-' 符号
            if (isCommentedLine(lineContent)) {
              console.log(`[T5.8] 忽略原本就被注释的@TestId: ${testId}`);
              continue;
            }
            // 删除的@TestId
            if (!removedTestIds.includes(testId)) {
              removedTestIds.push(testId);
              console.log(`[T5.8] 发现删除@TestId: ${testId}`);
            }
          }
        }
      }

      // 检测类名变更
      if (line.includes(' class ') && (line.startsWith('+') || line.startsWith('-'))) {
        const lineContent = line.substring(1).trim(); // 去掉 '+' 或 '-' 符号

        // 忽略注释行
        if (isCommentedLine(lineContent)) {
          continue;
        }

        const classMatch = lineContent.match(classPattern);
        if (classMatch) {
          const className = classMatch[1];

          if (line.startsWith('-') && !line.startsWith('---')) {
            // 删除的类名（旧类名）
            oldClassName = className;
            console.log(`[T5.8] 发现删除的类名: ${className}`);
          } else if (line.startsWith('+') && !line.startsWith('+++')) {
            // 新增的类名（新类名）
            newClassName = className;
            console.log(`[T5.8] 发现新增的类名: ${className}`);
          }

          // 如果同时有旧类名和新类名，且不相同，则确认类名发生变更
          if (oldClassName && newClassName && oldClassName !== newClassName) {
            classNameChanged = true;
            console.log(`[T5.8] 检测到类名变更: ${oldClassName} -> ${newClassName}`);
          }
        }
      }
    }

    console.log(
      `[T5.8] Diff分析完成: TestId变化(+${addedTestIds.length} -${removedTestIds.length}), 类名变更: ${classNameChanged}`,
    );
    if (classNameChanged) {
      console.log(`[T5.8] 类名变更详情: ${oldClassName} -> ${newClassName}`);
    }
  } catch (error) {
    console.error(`[T5.8] 分析Diff变化失败: ${filePath}`, error);
  }

  return {
    addedTestIds,
    removedTestIds,
    classNameChanged,
    oldClassName,
    newClassName,
  };
}

/**
 * 判断路径是否为目录
 * 目录路径特征：
 * 1. 以/结尾（明确的目录标识）
 * 2. 不包含文件扩展名（没有.xxx的形式）
 */
function isDirectoryPath(path: string): boolean {
  // 明确以/结尾的是目录
  if (path.endsWith('/')) {
    return true;
  }

  // 检查是否包含文件扩展名（最后一个.后面是文件扩展名）
  const lastDotIndex = path.lastIndexOf('.');
  const lastSlashIndex = path.lastIndexOf('/');

  // 如果没有.，肯定是目录
  if (lastDotIndex === -1) {
    return true;
  }

  // 如果.在最后一个/之前，说明.是在目录名中，不是文件扩展名
  if (lastSlashIndex > lastDotIndex) {
    return true;
  }

  // 如果.在最后一个/之后，检查扩展名长度是否合理（1-10个字符）
  const extension = path.substring(lastDotIndex + 1);
  if (extension.length === 0 || extension.length > 10 || extension.includes('/')) {
    return true; // 不是有效的文件扩展名，认为是目录
  }

  // 其他情况认为是文件
  return false;
}

/**
 * 从Java代码中提取用例描述（从注释中）
 */
async function extractCaseDescription(
  fileContent: string,
  startLine: number,
): Promise<string | null> {
  try {
    const lines = fileContent.split('\n');

    // 从@TestId注解向上查找注释
    for (let i = startLine - 2; i >= Math.max(0, startLine - 10); i--) {
      const line = lines[i]?.trim();
      if (!line) continue;

      // 查找单行注释 //
      if (line.startsWith('//')) {
        const desc = line.replace(/^\/\/\s*/, '').trim();
        if (desc && !desc.includes('@')) {
          return desc;
        }
      }

      // 查找多行注释 /** */
      if (line.includes('/**') || line.includes('*/')) {
        const desc = line
          .replace(/\/\*\*?\s*/, '')
          .replace(/\*\/?\s*/, '')
          .replace(/^\*\s*/, '')
          .trim();
        if (desc && !desc.includes('@')) {
          return desc;
        }
      }
    }
  } catch (error) {
    console.warn(`[T5.8] 提取用例描述失败: ${error}`);
  }

  return null;
}
