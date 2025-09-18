import { axios } from '@giteeteam/apps-team-api';

import { getCodePlatformConfig } from './config';
import { findBestPathMapping } from './pathMappingEnhanced';
import { logFileProcessing, updateCurrentFileProgress } from './queueStatistics';

/**
 * 获取commit的diff
 */
export async function getCommitDiff(projectId: string, commitId: string) {
  const { apiBaseUrl, enterprise, privateToken } = getCodePlatformConfig();
  const url = `${apiBaseUrl}/projects/${projectId}/repository/commits/${commitId}/diff`;

  try {
    const response = await axios({
      method: 'GET',
      url: url,
      headers: {
        enterprise: enterprise,
        'Private-Token': privateToken,
      },
    });
    console.log(`[AutoSync] diff为：${JSON.stringify(response)}`);
    return response;
  } catch (error) {
    console.error(`[AutoSync] 获取diff失败 [${commitId}]:`, error);
    throw error;
  }
}

/**
 * 使用闭环逻辑处理文件变更决策（支持配置文件协调处理）
 */
export async function processFilesWithClosedLoop(
  diffData: any[],
  config: any,
  historyMappings: Map<string, any>,
  queueId?: string,
  commitId?: string,
) {
  if (!config?.mappings) {
    console.log('[AutoSync] 配置文件无mappings，跳过所有文件');
    return [];
  }

  // Step 1: 先检查是否有配置文件变更
  const hasConfigChange = diffData.some(
    f => (f.new_path || f.old_path) === 'automation-test-map.json',
  );

  if (hasConfigChange) {
    console.log('[AutoSync] 检测到配置文件变更，进入协调处理模式');
    return processWithConfigCoordination(diffData, config, historyMappings, queueId, commitId);
  } else {
    // 无配置文件变更，正常处理每个文件
    const fileDecisions = [];

    for (let i = 0; i < diffData.length; i++) {
      const file = diffData[i];
      const startTime = Date.now();

      // 更新当前处理文件进度
      if (queueId) {
        await updateCurrentFileProgress(
          queueId,
          file.new_path || file.old_path || 'unknown',
          i + 1,
          diffData.length,
        );
      }

      const decision = processFileWithClosedLoop(file, config, historyMappings);
      if (decision.decision !== 'ignore') {
        fileDecisions.push(decision);
      }

      // 记录文件处理日志
      if (queueId && commitId) {
        await logFileProcessing(
          queueId,
          commitId,
          file.new_path || file.old_path || 'unknown',
          decision.decision !== 'ignore',
          Date.now() - startTime,
        );
      }
    }

    console.log(`[AutoSync] 闭环决策结果: ${fileDecisions.length}个文件需要处理`);
    fileDecisions.forEach(decision => {
      console.log(`[AutoSync] - ${decision.filePath}: ${decision.decision} (${decision.reason})`);
      console.log(`[AutoSync]   操作数量: ${decision.operations.length}`);
    });

    return fileDecisions;
  }
}

/**
 * 协调处理模式：当配置文件变更时的智能处理
 */
async function processWithConfigCoordination(
  diffData: any[],
  config: any,
  historyMappings: Map<string, any>,
  queueId?: string,
  commitId?: string,
) {
  // Step 1: 分离配置文件和测试文件
  const configFile = diffData.find(f => (f.new_path || f.old_path) === 'automation-test-map.json');
  const testFiles = diffData.filter(f => (f.new_path || f.old_path) !== 'automation-test-map.json');

  // Step 2: 解析配置文件变更
  const configChanges = parseConfigChanges(configFile.diff);
  const affectedFiles = extractAffectedFiles(configChanges);

  console.log(`[AutoSync] 配置文件变更影响 ${affectedFiles.length} 个文件`);
  affectedFiles.forEach(f => console.log(`[AutoSync] - 受影响文件: ${f.oldPath || f.newPath}`));

  const decisions = [];

  // Step 3: 处理配置文件变更中涉及的文件
  for (const affectedFile of affectedFiles) {
    const testFileChange = testFiles.find(
      f =>
        f.new_path === affectedFile.newPath ||
        f.old_path === affectedFile.oldPath ||
        f.new_path === affectedFile.oldPath || // 处理重命名场景
        f.old_path === affectedFile.newPath,
    );

    if (testFileChange) {
      // 该文件同时在配置和代码中都有变更，合并处理
      console.log(
        `[AutoSync] 文件 ${
          affectedFile.oldPath || affectedFile.newPath
        } 同时有配置和代码变更，执行合并处理`,
      );
      decisions.push(handleMergedChange(affectedFile, testFileChange, config, historyMappings));
    } else {
      // 仅配置文件中有变更，执行配置变更操作
      console.log(`[AutoSync] 文件 ${affectedFile.oldPath || affectedFile.newPath} 仅有配置变更`);
      decisions.push(handleConfigOnlyChange(affectedFile, config, historyMappings));
    }
  }

  // Step 4: 处理未被配置文件变更影响的测试文件
  for (const testFile of testFiles) {
    const isAffected = affectedFiles.some(
      f =>
        testFile.new_path === f.newPath ||
        testFile.old_path === f.oldPath ||
        testFile.new_path === f.oldPath ||
        testFile.old_path === f.newPath,
    );

    if (!isAffected) {
      // 正常处理测试文件变更
      const decision = processFileWithClosedLoop(testFile, config, historyMappings);
      if (decision.decision !== 'ignore') {
        decisions.push(decision);
      }
    }
  }

  console.log(`[AutoSync] 协调处理完成，共 ${decisions.length} 个决策`);

  // 输出每个决策的详细信息
  decisions.forEach((decision, index) => {
    console.log(`[AutoSync] 决策 ${index + 1}: ${decision.decision} - ${decision.filePath}`);
    console.log(`[AutoSync] 原因: ${decision.reason}`);
    if (decision.deletedModule) {
      console.log(`[AutoSync] 删除模块: ${decision.deletedModule}`);
    }
  });

  return decisions;
}

/**
 * 核心闭环决策函数
 */
function processFileWithClosedLoop(file: any, config: any, historyMappings: Map<string, any>) {
  console.log(`[AutoSync] 开始处理文件: ${file.new_path || file.old_path}`);

  // Step 1: 判断是否为新增文件
  if (file.new_file === true) {
    return handleNewFile(file, config);
  }

  // Step 2: 判断是否为删除文件
  if (file.deleted_file === true) {
    return handleDeletedFile(file, config, historyMappings);
  }

  // Step 3: 判断是否修改了文件名或路径
  // 重命名判断：old_path和new_path不同，且不是新增文件
  if (file.old_path && file.new_path && file.old_path !== file.new_path && !file.new_file) {
    return handleRenamedFile(file, config, historyMappings);
  }

  // Step 4: 处理普通修改文件
  return handleModifiedFile(file, config, historyMappings);
}

/**
 * 处理新增文件
 */
function handleNewFile(file: any, config: any) {
  const filePath = file.new_path;

  // 配置文件中是否有map映射?
  const modulePath = findBestPathMapping(filePath, config.mappings);
  if (modulePath) {
    console.log(`[AutoSync] 新增文件有映射: ${filePath} -> ${modulePath}`);

    return {
      filePath,
      decision: 'create_all',
      operations: [], // T5.8将基于这个decision生成具体操作
      reason: '新增文件，配置中有映射，创建所有用例',
    };
  } else {
    console.log(`[AutoSync] 新增文件无映射，忽略: ${filePath}`);
    return {
      filePath,
      decision: 'ignore',
      operations: [],
      reason: '新增文件，配置中无映射，忽略处理',
    };
  }
}

/**
 * 处理删除文件
 */
function handleDeletedFile(file: any, config: any, historyMappings: Map<string, any>) {
  const filePath = file.old_path;

  console.log(`[AutoSync] 处理删除文件: ${filePath}`);

  return {
    filePath,
    decision: 'delete_all',
    operations: [], // 暂时为空，在T5.8中实现具体操作生成
    reason: '文件被删除，删除所有相关用例',
  };
}

/**
 * 处理重命名文件
 */
function handleRenamedFile(file: any, config: any, historyMappings: Map<string, any>) {
  const oldPath = file.old_path;
  const newPath = file.new_path;

  // 新路径在配置中是否有映射?
  const newModulePath = findBestPathMapping(newPath, config.mappings);
  if (!newModulePath) {
    console.log(`[AutoSync] 重命名后无映射，删除所有用例: ${oldPath} -> ${newPath}`);

    return {
      filePath: newPath,
      oldFilePath: oldPath, // 添加旧路径信息，供T5.8查询历史用例使用
      decision: 'delete_all',
      operations: [], // T5.8将基于这个decision生成具体操作
      reason: '文件重命名后配置中无映射，删除所有相关用例',
    };
  }

  // 判断模块路径是否变化 - 这里需要在T5.8中实现历史数据查询
  const oldModulePath = getModulePathFromHistory(oldPath, historyMappings);

  if (oldModulePath && oldModulePath !== newModulePath) {
    console.log(`[AutoSync] 重命名涉及模块变更: ${oldModulePath} -> ${newModulePath}`);

    return {
      filePath: newPath,
      decision: 'operation_a',
      operations: [], // T5.8将基于这个decision生成具体操作
      reason: '文件重命名且模块路径变更，执行操作A',
    };
  } else {
    console.log(`[AutoSync] 重命名但模块路径未变更: ${oldPath} -> ${newPath}`);

    return {
      filePath: newPath,
      decision: 'operation_b',
      operations: [], // T5.8将基于这个decision生成具体操作
      reason: '文件重命名但模块路径未变更，执行操作B',
    };
  }
}

/**
 * 处理普通修改文件
 */
function handleModifiedFile(file: any, config: any, historyMappings: Map<string, any>) {
  const filePath = file.new_path;
  const modulePath = findBestPathMapping(filePath, config.mappings);

  if (!modulePath) {
    console.log(`[AutoSync] 修改文件无映射，忽略: ${filePath}`);
    return {
      filePath,
      decision: 'ignore',
      operations: [],
      reason: '修改文件在配置中无映射，忽略处理',
    };
  }

  console.log(`[AutoSync] 处理普通修改文件: ${filePath}`);

  return {
    filePath,
    decision: 'operation_b',
    operations: [], // 暂时为空，在T5.8中实现具体操作生成
    reason: '普通文件修改，执行操作B',
  };
}

/**
 * 从历史映射中获取模块路径
 */
function getModulePathFromHistory(
  filePath: string,
  historyMappings: Map<string, any>,
): string | null {
  // 这里需要在T5.8中实现，暂时返回null
  return null;
}

/**
 * 检查文件是否在映射配置中
 */
function isFileInMappings(filePath: string, mappingPaths: string[]): boolean {
  if (!filePath) return false;

  // 1. 精确匹配
  if (mappingPaths.includes(filePath)) {
    return true;
  }

  // 2. 目录匹配（支持目录级别的配置）
  for (const mappingPath of mappingPaths) {
    // 如果配置的是目录，检查文件是否在该目录下
    if (mappingPath.endsWith('/') && filePath.startsWith(mappingPath)) {
      return true;
    }

    // 如果配置的是文件，但文件被重命名了，检查目录是否匹配
    if (filePath.includes('/') && mappingPath.includes('/')) {
      const fileDir = filePath.substring(0, filePath.lastIndexOf('/'));
      const mappingDir = mappingPath.substring(0, mappingPath.lastIndexOf('/'));
      if (fileDir === mappingDir && filePath.endsWith('.java')) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 获取文件变更类型描述
 */
function getFileChangeType(file: any): string {
  if (file.deleted_file) return '删除';
  if (file.new_file) return '新增';
  if (file.renamed_file) return '重命名';
  return '修改';
}

/**
 * 获取文件内容
 */
export async function getFileContent(projectId: string, filePath: string, ref = 'master') {
  const { apiBaseUrl, enterprise, privateToken } = getCodePlatformConfig();
  const encodedPath = encodeURIComponent(filePath);
  const url = `${apiBaseUrl}/projects/${projectId}/repository/files/${encodedPath}/raw`;

  try {
    const response = await axios({
      method: 'GET',
      url: url,
      params: { ref: ref },
      headers: {
        enterprise: enterprise,
        'Private-Token': privateToken,
      },
      responseType: 'text',
    });
    // axios返回的是response对象，需要取.data属性
    const content = response.data || response;
    console.log(`[AutoSync] 获取到文件内容，长度: ${content?.length || 0} 字符`);
    return content;
  } catch (error) {
    console.log(`[AutoSync] 文件不存在: ${filePath}`);
    return null;
  }
}

/**
 * 扫描目录下的Java测试文件
 * @param projectId 项目ID
 * @param directoryPath 目录路径
 * @param branch 分支名
 * @returns Java文件路径列表
 */
export async function scanDirectoryForJavaFiles(
  projectId: string,
  directoryPath: string,
  branch = 'master',
): Promise<string[]> {
  const { apiBaseUrl, enterprise, privateToken } = getCodePlatformConfig();

  try {
    console.log(`[AutoSync] 扫描目录下的Java文件: ${directoryPath}`);

    // 使用代码平台API获取目录下的文件列表
    const encodedPath = encodeURIComponent(directoryPath);
    const url = `${apiBaseUrl}/projects/${projectId}/repository/tree`;

    const response = await axios({
      method: 'GET',
      url: url,
      params: {
        path: directoryPath,
        ref: branch,
        recursive: true, // 递归获取子目录中的文件
      },
      headers: {
        enterprise: enterprise,
        'Private-Token': privateToken,
      },
    });

    const files = response.data || response || [];
    console.log(`[AutoSync] 目录API返回 ${files.length} 个文件/目录`);

    // 过滤出Java文件
    const javaFiles = files
      .filter(
        (item: any) =>
          item.type === 'blob' && // 确保是文件不是目录
          item.path &&
          item.path.endsWith('.java'), // 只要是Java文件即可，不限制命名规范
      )
      .map((item: any) => item.path);

    console.log(`[AutoSync] 找到 ${javaFiles.length} 个Java文件:`);
    javaFiles.forEach((file: string) => console.log(`[AutoSync] - ${file}`));

    return javaFiles;
  } catch (error) {
    console.error(`[AutoSync] 扫描目录失败: ${directoryPath}`, error);
    return [];
  }
}

/**
 * 获取自动化测试配置文件
 */
export async function getAutomationConfig(projectId: string, branch = 'master') {
  try {
    console.log(`[AutoSync] 开始获取配置文件: projectId=${projectId}, branch=${branch}`);

    const content = await getFileContent(projectId, 'automation-test-map.json', branch);

    console.log(`[AutoSync] getFileContent返回值: ${typeof content}, content=${content}`);
    if (!content) {
      console.log(
        `[AutoSync] 未找到automation-test-map.json配置文件: projectId=${projectId}, branch=${branch}`,
      );
      return null;
    }

    console.log(`[AutoSync] 配置文件内容: ${content.substring(0, 200)}...`);
    const config = JSON.parse(content);
    // 不要stringify config，可能有循环引用
    console.log(`[AutoSync] 配置文件解析成功`);

    if (!config.testingFramework || !config.mappings) {
      console.error(`[AutoSync] 配置文件格式错误: 缺少testingFramework或mappings字段`);
      return null;
    }

    console.log(`[AutoSync] 配置文件解析成功: mappings数量=${Object.keys(config.mappings).length}`);
    return config;
  } catch (error) {
    console.error(`[AutoSync] 解析配置文件失败:`, error);
    return null;
  }
}

/**
 * 解析配置文件的diff，提取变更内容
 * 修复JSON逗号问题：过滤掉仅因逗号变化导致的误判
 */
function parseConfigChanges(diff: string): any[] {
  const changes = [];
  if (!diff) return changes;

  console.log(`[ConfigParser] 开始解析配置文件diff`);

  // 解析diff中的增加和删除行
  const lines = diff.split('\n');
  const removedMappings = new Map();
  const addedMappings = new Map();

  for (const line of lines) {
    if (line.startsWith('-')) {
      // 删除的映射 - 匹配任何以引号开头的路径映射
      const match = /"(.+?)"\s*:\s*"(.+?)"(,?)/.exec(line);
      if (match) {
        const path = match[1];
        const module = match[2];
        const hasComma = match[3] === ',';
        // 存储标准化的模块值（不含逗号）
        removedMappings.set(path, module);
        console.log(
          `[ConfigParser] 检测到删除映射: ${path} -> ${module}${hasComma ? ' (有逗号)' : ''}`,
        );
      }
    } else if (line.startsWith('+')) {
      // 新增的映射 - 匹配任何以引号开头的路径映射
      const match = /"(.+?)"\s*:\s*"(.+?)"(,?)/.exec(line);
      if (match) {
        const path = match[1];
        const module = match[2];
        const hasComma = match[3] === ',';
        // 存储标准化的模块值（不含逗号）
        addedMappings.set(path, module);
        console.log(
          `[ConfigParser] 检测到新增映射: ${path} -> ${module}${hasComma ? ' (有逗号)' : ''}`,
        );
      }
    }
  }

  console.log(
    `[ConfigParser] 初步解析: 删除${removedMappings.size}个, 新增${addedMappings.size}个`,
  );

  // 过滤掉仅因逗号变化的映射
  const filteredRemovedMappings = new Map();
  const filteredAddedMappings = new Map(addedMappings);

  for (const [path, module] of removedMappings) {
    if (addedMappings.has(path) && addedMappings.get(path) === module) {
      // 同一路径的删除和新增具有相同的模块值，这是逗号变化，过滤掉
      filteredAddedMappings.delete(path);
      console.log(`[ConfigParser] 过滤逗号变化（新增/删除最后一行导致）: ${path} -> ${module}`);
    } else {
      // 真正的删除
      filteredRemovedMappings.set(path, module);
    }
  }

  console.log(
    `[ConfigParser] 过滤后: 真正删除${filteredRemovedMappings.size}个, 真正新增${filteredAddedMappings.size}个`,
  );

  // 分析变更类型 (使用过滤后的映射)
  for (const [oldPath, oldModule] of filteredRemovedMappings) {
    let changeType = 'mapping_removed';
    let newPath = null;
    let newModule = null;

    // 检查是否有对应的新增（可能是路径或模块变更）
    for (const [addPath, addModule] of filteredAddedMappings) {
      if (oldModule === addModule && oldPath !== addPath) {
        // 检查是否是目录路径修正（添加或移除尾随斜杠）
        const isTrailingSlashChange = oldPath + '/' === addPath || oldPath === addPath + '/';

        if (isTrailingSlashChange) {
          // 目录路径修正，语义相同，不需要实际操作
          changeType = 'path_format_corrected';
          newPath = addPath;
          newModule = addModule;
          console.log(`[ConfigParser] 检测到目录路径格式修正: ${oldPath} -> ${addPath}`);
        } else {
          // 真正的路径变更
          changeType = 'path_renamed';
          newPath = addPath;
          newModule = addModule;
        }
        filteredAddedMappings.delete(addPath); // 标记为已处理
        break;
      } else if (oldPath === addPath && oldModule !== addModule) {
        // 模块变更，路径相同
        changeType = 'module_changed';
        newPath = addPath;
        newModule = addModule;
        filteredAddedMappings.delete(addPath); // 标记为已处理
        break;
      }
    }

    changes.push({
      type: changeType,
      oldPath: oldPath,
      newPath: newPath,
      oldModule: oldModule,
      newModule: newModule,
    });
  }

  // 处理剩余的新增映射 (使用过滤后的映射)
  for (const [path, module] of filteredAddedMappings) {
    changes.push({
      type: 'mapping_added',
      oldPath: null,
      newPath: path,
      oldModule: null,
      newModule: module,
    });
  }

  console.log(`[ConfigParser] 最终变更统计: 总计${changes.length}个变更`);

  // 输出详细的变更类型统计
  const changeTypeCounts = {};
  changes.forEach(change => {
    changeTypeCounts[change.type] = (changeTypeCounts[change.type] || 0) + 1;
  });

  console.log(`[ConfigParser] 变更类型分布:`, changeTypeCounts);

  // 输出每个变更的详细信息
  if (changes.length > 0) {
    console.log(`[ConfigParser] 变更详情:`);
    changes.forEach((change, index) => {
      console.log(
        `[ConfigParser] ${index + 1}. ${change.type}: ${change.oldPath || 'N/A'} -> ${
          change.newPath || 'N/A'
        }`,
      );
      console.log(
        `[ConfigParser]    模块: ${change.oldModule || 'N/A'} -> ${change.newModule || 'N/A'}`,
      );
    });
  }

  return changes;
}

/**
 * 从配置变更中提取受影响的文件列表
 */
function extractAffectedFiles(configChanges: any[]): any[] {
  const affectedFiles = [];

  for (const change of configChanges) {
    affectedFiles.push({
      oldPath: change.oldPath,
      newPath: change.newPath,
      changeType: change.type,
      oldModule: change.oldModule,
      newModule: change.newModule,
    });
  }

  return affectedFiles;
}

/**
 * 处理配置和代码同时变更的文件
 */
function handleMergedChange(
  configChange: any,
  testFileChange: any,
  config: any,
  historyMappings: Map<string, any>,
) {
  const filePath = configChange.newPath || testFileChange.new_path;

  console.log(`[AutoSync] 合并处理: ${filePath}`);
  console.log(`[AutoSync] - 配置变更类型: ${configChange.changeType}`);
  console.log(
    `[AutoSync] - 代码变更: 新增=${testFileChange.new_file}, 删除=${testFileChange.deleted_file}`,
  );

  // 根据配置变更类型决定主要操作
  if (configChange.changeType === 'path_renamed') {
    // 路径重命名 + 代码变更
    return {
      filePath: filePath,
      decision: 'merged_path_rename',
      operations: [], // TODO: 在T5.8中实现具体操作
      reason: '文件路径重命名并有代码变更，需要更新路径并同步代码变更',
    };
  } else if (configChange.changeType === 'module_changed') {
    // 模块变更 + 代码变更
    return {
      filePath: filePath,
      decision: 'merged_module_change',
      operations: [], // TODO: 在T5.8中实现具体操作
      reason: '模块路径变更并有代码变更，需要迁移模块并同步代码变更',
    };
  }

  // 默认按普通变更处理
  return processFileWithClosedLoop(testFileChange, config, historyMappings);
}

/**
 * 处理仅配置文件变更的情况
 */
function handleConfigOnlyChange(configChange: any, config: any, historyMappings: Map<string, any>) {
  const filePath = configChange.newPath || configChange.oldPath;

  console.log(`[AutoSync] 仅配置变更: ${filePath}`);
  console.log(`[AutoSync] - 变更类型: ${configChange.changeType}`);

  if (configChange.changeType === 'path_renamed') {
    return {
      filePath: filePath,
      decision: 'config_path_rename',
      operations: [], // TODO: 在T5.8中实现具体操作
      reason: '配置文件中路径重命名，需要更新所有相关用例的文件路径',
    };
  } else if (configChange.changeType === 'path_format_corrected') {
    return {
      filePath: filePath,
      decision: 'ignore',
      operations: [],
      reason: '配置文件中目录路径格式修正（添加/移除尾随斜杠），语义相同，无需操作',
    };
  } else if (configChange.changeType === 'module_changed') {
    return {
      filePath: filePath,
      decision: 'config_module_change',
      operations: [], // TODO: 在T5.8中实现具体操作
      reason: '配置文件中模块变更，需要迁移所有相关用例到新模块',
    };
  } else if (configChange.changeType === 'mapping_added') {
    return {
      filePath: filePath,
      decision: 'config_mapping_added',
      operations: [], // TODO: 在T5.8中实现具体操作
      reason: '配置文件新增映射，需要扫描文件并创建用例',
    };
  } else if (configChange.changeType === 'mapping_removed') {
    // 删除映射需要智能分析影响
    // 注意：这里简化处理，实际的影响分析应该在T5.8中使用 mappingDeletionAnalyzer
    console.log(`[AutoSync] 生成删除映射决策: ${filePath}, 删除模块: ${configChange.oldModule}`);
    return {
      filePath: filePath,
      decision: 'config_mapping_removed_smart',
      operations: [], // TODO: 在T5.8中使用 mappingDeletionAnalyzer 分析
      deletedModule: configChange.oldModule,
      reason: '配置文件删除映射，需要智能分析影响（考虑优先级）',
      analysisHint: '需要检查是否有其他映射覆盖，决定是删除还是迁移用例',
    };
  }

  return {
    filePath: filePath,
    decision: 'ignore',
    operations: [],
    reason: '未知的配置变更类型',
  };
}
