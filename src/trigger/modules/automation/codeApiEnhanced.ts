/**
 * Code API 增强模块
 * 提供仓库文件操作的高级API，支持文件列表获取、过滤和批量处理
 */

import { axios } from '@giteeteam/apps-team-api';

import { getCodePlatformConfig } from './config';

import {
  updateBatchFileProgress,
  logFileContentFetchFailure,
} from './queueStatistics';

/**
 * 文件内容接口
 */
export interface FileContent {
  filePath: string;
  content: string;
  size: number;
  encoding?: string;
}

/**
 * 仓库文件信息接口
 */
export interface RepositoryFile {
  id: string;
  name: string;
  type: 'blob' | 'tree';
  path: string;
  mode: string;
}

/**
 * Code API 增强类
 */
export class CodeApiEnhanced {
  /**
   * 获取仓库全量文件列表
   * @param projectId 项目ID
   * @param ref 分支名称
   * @param search 搜索关键词（可选）
   * @returns 文件路径列表
   */
  async getRepositoryFiles(projectId: string, ref: string, search?: string): Promise<string[]> {
    const requestId = `repo-files-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const config = await getCodePlatformConfig();

    console.log(`[CodeApiEnhanced] [${requestId}] 开始获取仓库文件列表`, {
      projectId,
      ref,
      hasSearch: !!search,
      baseUrl: config?.baseUrl,
      hasToken: !!config?.privateToken,
    });

    if (!config?.baseUrl || !config?.privateToken) {
      console.error(`[CodeApiEnhanced] [${requestId}] Code平台配置不完整`);
      throw new Error('Code平台配置不完整');
    }

    try {
      // 递归获取整个仓库的文件树
      const allFiles: string[] = [];
      await this.getRepositoryTreeRecursive(projectId, ref, '', allFiles, requestId);

      // 如果提供了搜索关键词，进行过滤
      let filteredFiles = allFiles;
      if (search && search.trim()) {
        filteredFiles = allFiles.filter(filePath =>
          filePath.toLowerCase().includes(search.toLowerCase()),
        );
        console.log(`[CodeApiEnhanced] [${requestId}] 搜索过滤完成`, {
          keyword: search,
          before: allFiles.length,
          after: filteredFiles.length,
        });
      }

      console.log(`[CodeApiEnhanced] [${requestId}] 获取文件列表成功`, {
        totalFiles: filteredFiles.length,
        duration: `${Date.now() - parseInt(requestId.split('-')[2])}ms`,
      });

      return filteredFiles;
    } catch (error) {
      console.error(`[CodeApiEnhanced] [${requestId}] 获取仓库文件列表失败`, {
        error: error.message,
        stack: error.stack?.split('\n')[0],
      });
      throw new Error(`获取仓库文件列表失败: ${error.message}`);
    }
  }

  /**
   * 递归获取仓库文件树
   */
  private async getRepositoryTreeRecursive(
    projectId: string,
    ref: string,
    path: string,
    allFiles: string[],
    requestId: string,
  ): Promise<void> {
    const config = await getCodePlatformConfig();

    try {
      const response = await axios({
        method: 'GET',
        url: `${config.baseUrl}/api/v4/projects/${projectId}/repository/tree`,
        headers: {
          'PRIVATE-TOKEN': config.privateToken,
        },
        params: {
          ref,
          path,
          recursive: false, // 手动递归以获得更好的控制
          per_page: 100,
        },
      });

      const files: RepositoryFile[] = response.data;

      // 只在根路径或重要路径记录响应结构
      if (path === '' || path.split('/').length <= 2) {
        console.log(`[CodeApiEnhanced] [${requestId}] Code API响应`, {
          path: path || '根目录',
          status: response.status,
          itemCount: files.length,
          sampleItems: files.slice(0, 3).map(f => ({ name: f.name, type: f.type })),
        });
      }

      for (const file of files) {
        if (file.type === 'blob') {
          // 文件类型，添加到结果中
          allFiles.push(file.path);
        } else if (file.type === 'tree') {
          // 目录类型，递归获取
          await this.getRepositoryTreeRecursive(projectId, ref, file.path, allFiles, requestId);
        }
      }
    } catch (error) {
      console.error(`[CodeApiEnhanced] [${requestId}] 获取目录树失败`, {
        path: path || '根目录',
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      // 继续处理其他路径，不抛出错误
    }
  }

  /**
   * 批量获取文件内容
   * @param projectId 项目ID
   * @param filePaths 文件路径列表
   * @param ref 分支名称
   * @param concurrency 并发数限制
   * @returns 文件内容列表
   */
  async getMultipleFileContents(
    projectId: string,
    filePaths: string[],
    ref = 'master',
    concurrency = 10,
  ): Promise<FileContent[]> {
    const requestId = `batch-content-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    console.log(`[CodeApiEnhanced] [${requestId}] 开始批量获取文件内容`, {
      totalFiles: filePaths.length,
      concurrency,
      projectId,
      ref,
      sampleFiles: filePaths.slice(0, 3),
    });

    const results: FileContent[] = [];
    const errors: Array<{ filePath: string; error: string }> = [];
    const startTime = Date.now();

    // 分批处理以控制并发
    for (let i = 0; i < filePaths.length; i += concurrency) {
      const batch = filePaths.slice(i, i + concurrency);
      const batchNumber = Math.floor(i / concurrency) + 1;
      const batchStartTime = Date.now();

      console.log(`[CodeApiEnhanced] [${requestId}] 开始处理批次 ${batchNumber}`, {
        batchNumber,
        batchSize: batch.length,
        startIndex: i,
        endIndex: Math.min(i + concurrency, filePaths.length) - 1,
        progress: `${Math.min(i + concurrency, filePaths.length)}/${filePaths.length}`,
        sampleFiles: batch.slice(0, 3).map(f => f.split('/').pop()),
      });

      const batchPromises = batch.map(async (filePath, index) => {
        const fileIndex = i + index + 1;
        const fileName = filePath.split('/').pop() || filePath;
        
        try {
          // 更新监控：开始获取文件
          await updateBatchFileProgress(
            requestId,
            batchNumber,
            fileIndex,
            filePaths.length,
            fileName,
            'fetching'
          );
          
          console.log(`[CodeApiEnhanced] [${requestId}] 正在获取文件 ${fileIndex}/${filePaths.length}: ${fileName}`);
          const content = await this.getSingleFileContent(projectId, filePath, ref, requestId);
          
          // 更新监控：获取成功
          await updateBatchFileProgress(
            requestId,
            batchNumber,
            fileIndex,
            filePaths.length,
            fileName,
            'success'
          );
          
          console.log(`[CodeApiEnhanced] [${requestId}] 文件获取成功 ${fileIndex}/${filePaths.length}: ${fileName} (${content.size} bytes)`);
          return content;
        } catch (error) {
          const errorMessage = error.message;
          const statusCode = error.response?.status;
          
          // 更新监控：获取失败
          await updateBatchFileProgress(
            requestId,
            batchNumber,
            fileIndex,
            filePaths.length,
            fileName,
            'failed',
            errorMessage
          );
          
          // 记录详细的失败日志
          await logFileContentFetchFailure(requestId, filePath, errorMessage, statusCode);
          
          console.error(`[CodeApiEnhanced] [${requestId}] 文件获取失败 ${fileIndex}/${filePaths.length}: ${fileName}`, {
            error: errorMessage,
            status: statusCode,
            statusText: error.response?.statusText,
          });
          errors.push({ filePath, error: errorMessage });
          return null;
        }
      });

      try {
        const batchResults = await Promise.all(batchPromises);
        const successCount = batchResults.filter(result => result !== null).length;
        const failCount = batchResults.filter(result => result === null).length;
        results.push(...batchResults.filter(result => result !== null));

        const batchDuration = Date.now() - batchStartTime;
        console.log(`[CodeApiEnhanced] [${requestId}] 批次 ${batchNumber} 完成`, {
          batchNumber,
          success: successCount,
          failed: failCount,
          total: batch.length,
          progress: `${Math.min(i + concurrency, filePaths.length)}/${filePaths.length}`,
          batchDuration: `${batchDuration}ms`,
          avgPerFile: `${Math.round(batchDuration / batch.length)}ms`,
        });
      } catch (batchError) {
        console.error(`[CodeApiEnhanced] [${requestId}] 批次 ${batchNumber} 处理异常`, {
          error: batchError.message,
          stack: batchError.stack?.split('\n')[0],
        });
        // 将整个批次的文件标记为失败
        batch.forEach(filePath => {
          errors.push({ filePath, error: `批次处理失败: ${batchError.message}` });
        });
      }

      // 如果是串行处理(concurrency=1)，添加延迟避免API限流
      if (concurrency === 1 && i + concurrency < filePaths.length) {
        console.log(`[CodeApiEnhanced] [${requestId}] 串行模式：等待1秒后处理下一个文件...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (errors.length > 0) {
      console.warn(`[CodeApiEnhanced] [${requestId}] 部分文件获取失败`, {
        failedCount: errors.length,
        sampleErrors: errors.slice(0, 3).map(e => ({ file: e.filePath, error: e.error })),
      });
    }

    console.log(`[CodeApiEnhanced] [${requestId}] 批量获取完成`, {
      successCount: results.length,
      totalCount: filePaths.length,
      failedCount: errors.length,
      duration: `${Date.now() - startTime}ms`,
    });

    return results;
  }

  /**
   * 获取单个文件内容
   */
  private async getSingleFileContent(
    projectId: string,
    filePath: string,
    ref: string,
    requestId?: string,
  ): Promise<FileContent> {
    const config = await getCodePlatformConfig();

    try {
      const response = await axios({
        method: 'GET',
        url: `${config.baseUrl}/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(
          filePath,
        )}`,
        headers: {
          'PRIVATE-TOKEN': config.privateToken,
        },
        params: {
          ref,
        },
      });

      const fileData = response.data;
      let content = '';

      // 处理不同的编码格式
      if (fileData.encoding === 'base64') {
        content = Buffer.from(fileData.content, 'base64').toString('utf-8');
      } else {
        content = fileData.content;
      }

      // 只记录第一个文件的响应结构，用于调试
      if (requestId && filePath.includes('Test.java')) {
        console.log(`[CodeApiEnhanced] [${requestId}] 文件内容API响应结构`, {
          filePath: filePath.split('/').pop(), // 只显示文件名
          status: response.status,
          encoding: fileData.encoding,
          size: fileData.size,
          hasContent: !!fileData.content,
          contentPreview: content.substring(0, 100) + '...',
        });
      }

      return {
        filePath,
        content,
        size: fileData.size,
        encoding: fileData.encoding,
      };
    } catch (error) {
      if (requestId) {
        console.error(`[CodeApiEnhanced] [${requestId}] 获取文件内容失败`, {
          filePath: filePath.split('/').pop(),
          error: error.message,
          status: error.response?.status,
        });
      }
      throw new Error(`获取文件内容失败: ${error.message}`);
    }
  }

  /**
   * 检查文件是否为Java测试文件
   * @param filePath 文件路径
   * @param content 文件内容（可选，如果提供则不会重新获取）
   * @returns 是否为Java测试文件
   */
  async isJavaTestFile(filePath: string, content?: string): Promise<boolean> {
    // 首先检查文件扩展名
    if (!filePath.endsWith('.java')) {
      return false;
    }

    // 如果没有提供内容，则需要获取文件内容进行检查
    if (!content) {
      console.log(`[CodeApiEnhanced] 检查Java测试文件需要获取内容: ${filePath}`);
      return false; // 在目录初始化流程中，内容检查会在解析阶段进行
    }

    // 检查文件内容是否包含@Test注解
    return this.containsTestAnnotations(content);
  }

  /**
   * 检查内容是否包含测试注解
   */
  private containsTestAnnotations(content: string): boolean {
    // 检查是否包含@Test注解
    const testAnnotationPattern =
      /@Test\s*(\([^)]*\))?\s*(public|protected|private)?\s+void\s+\w+\s*\(/;
    const importTestPattern = /import\s+org\.junit\./;

    return testAnnotationPattern.test(content) || importTestPattern.test(content);
  }

  /**
   * 按目录路径过滤文件列表（第一步过滤）
   * @param allFiles 全量文件列表
   * @param directoryPath 目录路径
   * @returns 过滤后的文件列表
   */
  filterFilesByDirectory(allFiles: string[], directoryPath: string): string[] {
    console.log(`[CodeApiEnhanced] 第一步过滤 - 按目录路径过滤: ${directoryPath}`);

    const filteredFiles = allFiles.filter(file => {
      return file.startsWith(directoryPath);
    });

    console.log(
      `[CodeApiEnhanced] 目录过滤完成: ${allFiles.length} -> ${filteredFiles.length} 个文件`,
    );
    return filteredFiles;
  }

  /**
   * 过滤Java文件（第二步过滤）
   * @param directoryFiles 目录下的文件列表
   * @returns Java文件列表
   */
  filterJavaFiles(directoryFiles: string[]): string[] {
    console.log(`[CodeApiEnhanced] 第二步过滤 - 过滤Java文件`);

    const javaFiles = directoryFiles.filter(file => {
      return file.endsWith('.java');
    });

    console.log(
      `[CodeApiEnhanced] Java文件过滤完成: ${directoryFiles.length} -> ${javaFiles.length} 个文件`,
    );
    return javaFiles;
  }

  /**
   * 获取目录下的测试文件（完整的三步过滤流程）
   * @param repositoryId 仓库ID
   * @param branch 分支名称
   * @param directoryPath 目录路径
   * @returns 测试文件路径列表
   */
  async getDirectoryTestFiles(
    repositoryId: string,
    branch: string,
    directoryPath: string,
  ): Promise<string[]> {
    console.log(`[CodeApiEnhanced] 开始三步过滤流程: ${directoryPath}`);

    // 第一步：获取仓库全量文件列表
    const allFiles = await this.getRepositoryFiles(repositoryId, branch);

    // 第二步：按目录路径过滤
    const directoryFiles = this.filterFilesByDirectory(allFiles, directoryPath);

    // 第三步：过滤Java文件
    const javaFiles = this.filterJavaFiles(directoryFiles);

    console.log(
      `[CodeApiEnhanced] 三步过滤完成: ${allFiles.length} -> ${directoryFiles.length} -> ${javaFiles.length} 个文件`,
    );

    // 注意：测试用例检查将在解析阶段进行，避免重复获取文件内容
    return javaFiles;
  }

  /**
   * 检查仓库连接状态
   * @param projectId 项目ID
   * @returns 连接是否正常
   */
  async checkRepositoryConnection(projectId: string): Promise<boolean> {
    try {
      const config = await getCodePlatformConfig();
      if (!config?.baseUrl || !config?.privateToken) {
        return false;
      }

      const response = await axios({
        method: 'GET',
        url: `${config.baseUrl}/api/v4/projects/${projectId}`,
        headers: {
          'PRIVATE-TOKEN': config.privateToken,
        },
      });

      return response.status === 200;
    } catch (error) {
      console.error('[CodeApiEnhanced] 仓库连接检查失败:', error);
      return false;
    }
  }
}

/**
 * 导出单例实例
 */
export const codeApiEnhanced = new CodeApiEnhanced();
