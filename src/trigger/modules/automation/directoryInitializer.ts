/**
 * 目录初始化模块
 * 负责批量初始化目录下的测试用例
 */

import { codeApiEnhanced } from './codeApiEnhanced';
import { javaParser } from './parser';
import { enhancedPathMapping } from './pathMappingEnhanced';

/**
 * 目录初始化参数接口
 */
export interface DirectoryInitParams {
  repositoryId: string;
  branch: string;
  directoryPath: string;
  targetPath: string;
  dryRun?: boolean;
  excludeFiles?: string[];
  includeSubdirectories?: boolean;
}

/**
 * 初始化结果接口
 */
export interface InitializeResult {
  totalFiles: number;
  processedFiles: number;
  createdCases: number;
  skippedFiles: string[];
  errors: ProcessingError[];
  duration: number;
  mappingUpdated: boolean;
}

/**
 * 处理错误接口
 */
export interface ProcessingError {
  file: string;
  error: string;
  details?: any;
}

/**
 * 预览参数接口
 */
export interface PreviewParams {
  repositoryId: string;
  branch: string;
  directoryPath: string;
  targetPath: string;
  excludeFiles?: string[];
}

/**
 * 预览结果接口
 */
export interface PreviewResult {
  matchedFiles: string[];
  existingMappings: ExistingMapping[];
  newFiles: string[];
  estimatedCases: number;
  conflictFiles: ConflictFile[];
}

/**
 * 已有映射接口
 */
export interface ExistingMapping {
  file: string;
  currentMapping: string;
}

/**
 * 冲突文件接口
 */
export interface ConflictFile {
  file: string;
  conflicts: string[];
}

/**
 * 解析结果接口
 */
export interface ParseResult {
  filePath: string;
  testCases: any[];
  status: 'success' | 'error';
  error?: string;
}

/**
 * 目录初始化器类
 */
export class DirectoryInitializer {
  /**
   * 获取仓库全量文件列表
   */
  async getRepositoryAllFiles(repositoryId: string, branch: string): Promise<string[]> {
    return await codeApiEnhanced.getRepositoryFiles(repositoryId, branch);
  }

  /**
   * 第一步过滤：按目录路径过滤文件
   */
  filterFilesByDirectory(allFiles: string[], directoryPath: string): string[] {
    return codeApiEnhanced.filterFilesByDirectory(allFiles, directoryPath);
  }

  /**
   * 第二步过滤：过滤Java文件
   */
  filterJavaFiles(directoryFiles: string[]): string[] {
    return codeApiEnhanced.filterJavaFiles(directoryFiles);
  }

  /**
   * 完整的两步过滤流程
   * （第三步内容检查合并到解析阶段，避免重复获取文件内容）
   */
  async getDirectoryTestFiles(
    repositoryId: string,
    branch: string,
    directoryPath: string,
  ): Promise<string[]> {
    return await codeApiEnhanced.getDirectoryTestFiles(repositoryId, branch, directoryPath);
  }

  /**
   * 批量初始化测试用例
   */
  async initializeDirectory(params: DirectoryInitParams): Promise<InitializeResult> {
    const requestId = `dir-init-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const startTime = Date.now();

    console.log(`[DirectoryInit] [${requestId}] 开始目录初始化`, {
      directoryPath: params.directoryPath,
      targetPath: params.targetPath,
      repositoryId: params.repositoryId,
      branch: params.branch,
      dryRun: params.dryRun,
      excludeFileCount: params.excludeFiles?.length || 0,
    });

    const result: InitializeResult = {
      totalFiles: 0,
      processedFiles: 0,
      createdCases: 0,
      skippedFiles: [],
      errors: [],
      duration: 0,
      mappingUpdated: false,
    };

    try {
      // 1. 获取目录下的Java文件
      const javaFiles = await this.getDirectoryTestFiles(
        params.repositoryId,
        params.branch,
        params.directoryPath,
      );

      result.totalFiles = javaFiles.length;
      console.log(`[DirectoryInit] [${requestId}] 目录扫描完成`, {
        totalJavaFiles: javaFiles.length,
        sampleFiles: javaFiles.slice(0, 3),
      });

      // 2. 排除指定的文件
      let filesToProcess = javaFiles;
      if (params.excludeFiles && params.excludeFiles.length > 0) {
        filesToProcess = javaFiles.filter(file => !params.excludeFiles!.includes(file));
        const excludedCount = javaFiles.length - filesToProcess.length;
        console.log(`[DirectoryInit] [${requestId}] 排除指定文件`, {
          excludedCount,
          remainingFiles: filesToProcess.length,
        });
      }

      // 3. 排除已有精确映射的文件
      const { configMappings } = await this.loadConfigMappings();
      const filesWithExistingMapping = filesToProcess.filter(file => configMappings[file]);
      result.skippedFiles = filesWithExistingMapping;

      const finalFilesToProcess = filesToProcess.filter(file => !configMappings[file]);

      console.log(`[DirectoryInit] [${requestId}] 文件过滤完成`, {
        existingMappingCount: filesWithExistingMapping.length,
        finalProcessCount: finalFilesToProcess.length,
        sampleExistingMappings: filesWithExistingMapping.slice(0, 3),
      });

      // 4. 如果是预览模式，只返回统计信息
      if (params.dryRun) {
        console.log(`[DirectoryInit] [${requestId}] 预览模式完成`, {
          estimatedProcessFiles: finalFilesToProcess.length,
        });
        result.processedFiles = finalFilesToProcess.length;
        result.duration = Date.now() - startTime;
        return result;
      }

      // 5. 批量处理文件
      const parseResults = await this.parseTestCasesFromFiles(
        finalFilesToProcess,
        params.repositoryId,
        params.branch,
        requestId,
      );

      // 6. 统计结果
      for (const parseResult of parseResults) {
        if (parseResult.status === 'success') {
          result.processedFiles++;
          result.createdCases += parseResult.testCases.length;
        } else {
          result.errors.push({
            file: parseResult.filePath,
            error: parseResult.error || '解析失败',
          });
        }
      }

      // 7. 更新映射配置（如果需要）
      if (result.processedFiles > 0) {
        await this.updateMappingConfig(params.directoryPath, params.targetPath);
        result.mappingUpdated = true;
      }

      result.duration = Date.now() - startTime;

      console.log(`[DirectoryInit] [${requestId}] 初始化完成`, {
        processedFiles: result.processedFiles,
        createdCases: result.createdCases,
        errorCount: result.errors.length,
        mappingUpdated: result.mappingUpdated,
        duration: `${result.duration}ms`,
      });

      return result;
    } catch (error) {
      console.error(`[DirectoryInit] [${requestId}] 初始化失败`, {
        error: error.message,
        stack: error.stack?.split('\n')[0],
      });
      result.errors.push({
        file: 'GLOBAL',
        error: error.message,
        details: error,
      });
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * 预览初始化结果
   */
  async previewInitialization(params: PreviewParams): Promise<PreviewResult> {
    console.log(`[DirectoryInit] 开始预览: ${params.directoryPath}`);

    try {
      // 1. 获取目录下的Java文件
      const javaFiles = await this.getDirectoryTestFiles(
        params.repositoryId,
        params.branch,
        params.directoryPath,
      );

      // 2. 加载当前映射配置
      const { configMappings } = await this.loadConfigMappings();

      // 3. 分析文件映射状态
      const existingMappings: ExistingMapping[] = [];
      const newFiles: string[] = [];
      const conflictFiles: ConflictFile[] = [];

      for (const file of javaFiles) {
        if (configMappings[file]) {
          // 已有精确映射
          existingMappings.push({
            file,
            currentMapping: configMappings[file],
          });
        } else {
          // 检查是否通过目录映射匹配到其他路径
          const currentMapping = enhancedPathMapping.findBestMapping(file, configMappings);
          if (currentMapping && currentMapping !== params.targetPath) {
            // 存在冲突：通过其他目录映射匹配到不同路径
            conflictFiles.push({
              file,
              conflicts: [currentMapping, params.targetPath],
            });
          } else {
            // 新文件
            newFiles.push(file);
          }
        }
      }

      // 4. 估算测试用例数量（简单估算：假设每个文件平均3个测试用例）
      const estimatedCases = newFiles.length * 3;

      console.log(
        `[DirectoryInit] 预览完成: 总计 ${javaFiles.length} 个文件，新文件 ${newFiles.length} 个，已映射 ${existingMappings.length} 个，冲突 ${conflictFiles.length} 个`,
      );

      return {
        matchedFiles: javaFiles,
        existingMappings,
        newFiles,
        estimatedCases,
        conflictFiles,
      };
    } catch (error) {
      console.error('[DirectoryInit] 预览失败:', error);
      throw error;
    }
  }

  /**
   * 解析文件中的测试用例（合并内容检查）
   */
  private async parseTestCasesFromFiles(
    javaFiles: string[],
    repositoryId: string,
    branch: string,
    requestId: string,
  ): Promise<ParseResult[]> {
    console.log(`[DirectoryInit] [${requestId}] 开始解析测试用例`, {
      totalFiles: javaFiles.length,
      concurrency: 5,
    });

    const results: ParseResult[] = [];
    const startTime = Date.now();

    // 批量获取文件内容
    const fileContents = await codeApiEnhanced.getMultipleFileContents(
      repositoryId,
      javaFiles,
      branch,
      5, // 限制并发数为5，避免对Code平台造成压力
    );

    // 为每个文件解析测试用例
    let successCount = 0;
    let skipCount = 0;

    for (const fileContent of fileContents) {
      try {
        const testMethods = javaParser.parseTestMethods(fileContent.content);

        if (testMethods.length > 0) {
          // 文件包含测试用例
          results.push({
            filePath: fileContent.filePath,
            testCases: testMethods,
            status: 'success',
          });
          successCount++;

          // 只记录前几个成功案例的详情
          if (successCount <= 3) {
            console.log(`[DirectoryInit] [${requestId}] 解析成功`, {
              fileName: fileContent.filePath.split('/').pop(),
              testMethodCount: testMethods.length,
              sampleMethods: testMethods.slice(0, 2).map(m => m.methodName),
            });
          }
        } else {
          // 文件不包含测试用例
          skipCount++;
          console.log(`[DirectoryInit] [${requestId}] 跳过文件`, {
            fileName: fileContent.filePath.split('/').pop(),
            reason: '未找到测试用例',
          });
        }
      } catch (error) {
        console.warn(`[DirectoryInit] [${requestId}] 解析失败`, {
          fileName: fileContent.filePath.split('/').pop(),
          error: error.message,
        });
        results.push({
          filePath: fileContent.filePath,
          testCases: [],
          status: 'error',
          error: error.message,
        });
      }
    }

    // 处理获取内容失败的文件
    const processedPaths = fileContents.map(fc => fc.filePath);
    const failedFiles = javaFiles.filter(file => !processedPaths.includes(file));
    for (const failedFile of failedFiles) {
      results.push({
        filePath: failedFile,
        testCases: [],
        status: 'error',
        error: '获取文件内容失败',
      });
    }

    const successFiles = results.filter(r => r.status === 'success').length;
    const errorFiles = results.filter(r => r.status === 'error').length;

    console.log(`[DirectoryInit] [${requestId}] 解析完成`, {
      successFiles,
      errorFiles,
      skipFiles: skipCount,
      totalTestCases: results.reduce((sum, r) => sum + r.testCases.length, 0),
      duration: `${Date.now() - startTime}ms`,
    });

    return results;
  }

  /**
   * 加载当前映射配置
   */
  private async loadConfigMappings(): Promise<{ configMappings: Record<string, string> }> {
    // TODO: 实现从配置文件或数据库加载映射配置
    // 这里暂时返回空配置，实际实现时需要从配置源加载
    console.log('[DirectoryInit] 加载映射配置 (TODO: 实现配置加载逻辑)');
    return {
      configMappings: {},
    };
  }

  /**
   * 更新映射配置
   */
  private async updateMappingConfig(directoryPath: string, targetPath: string): Promise<void> {
    // TODO: 实现映射配置更新逻辑
    // 将新的目录映射添加到配置文件中
    console.log(
      `[DirectoryInit] 更新映射配置: ${directoryPath} -> ${targetPath} (TODO: 实现配置更新逻辑)`,
    );
  }
}

/**
 * 导出单例实例
 */
export const directoryInitializer = new DirectoryInitializer();
