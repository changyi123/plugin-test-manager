/**
 * 目录映射相关API接口
 */

import {
  directoryInitializer,
  DirectoryInitParams,
  PreviewParams,
} from '../automation/directoryInitializer';
import { enhancedPathMapping } from '../automation/pathMappingEnhanced';

/**
 * 执行目录初始化
 */
export async function initializeDirectory(params: DirectoryInitParams) {
  const requestId = `api-init-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  console.log(`[DirectoryMappingAPI] [${requestId}] 收到目录初始化请求`, {
    directoryPath: params.directoryPath,
    targetPath: params.targetPath,
    repositoryId: params.repositoryId,
    branch: params.branch,
    dryRun: params.dryRun,
  });

  try {
    // 参数验证
    if (!params.repositoryId || !params.branch || !params.directoryPath || !params.targetPath) {
      console.error(`[DirectoryMappingAPI] [${requestId}] 参数验证失败`, {
        hasRepositoryId: !!params.repositoryId,
        hasBranch: !!params.branch,
        hasDirectoryPath: !!params.directoryPath,
        hasTargetPath: !!params.targetPath,
      });
      throw new Error('缺少必要参数: repositoryId, branch, directoryPath, targetPath');
    }

    // 验证目录路径格式
    if (!params.directoryPath.endsWith('/')) {
      params.directoryPath = params.directoryPath + '/';
      console.log(
        `[DirectoryMappingAPI] [${requestId}] 自动修正目录路径格式: ${params.directoryPath}`,
      );
    }

    const result = await directoryInitializer.initializeDirectory(params);

    console.log(`[DirectoryMappingAPI] [${requestId}] 目录初始化成功`, {
      processedFiles: result.processedFiles,
      createdCases: result.createdCases,
      errorCount: result.errors.length,
      duration: result.duration,
      mappingUpdated: result.mappingUpdated,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(`[DirectoryMappingAPI] [${requestId}] 目录初始化失败`, {
      error: error.message,
      stack: error.stack?.split('\n')[0],
    });
    return {
      success: false,
      error: {
        message: error.message,
        details: error.stack,
      },
    };
  }
}

/**
 * 预览目录映射结果
 */
export async function previewDirectoryMapping(params: {
  repositoryId: string;
  branch: string;
  directoryPath: string;
  targetPath: string;
  excludeFiles?: string[];
}) {
  const requestId = `api-preview-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  console.log(`[DirectoryMappingAPI] [${requestId}] 收到目录映射预览请求`, {
    directoryPath: params.directoryPath,
    targetPath: params.targetPath,
    repositoryId: params.repositoryId,
    branch: params.branch,
    excludeFileCount: params.excludeFiles?.length || 0,
  });

  try {
    // 参数验证
    if (!params.repositoryId || !params.branch || !params.directoryPath || !params.targetPath) {
      console.error(`[DirectoryMappingAPI] [${requestId}] 参数验证失败`);
      throw new Error('缺少必要参数: repositoryId, branch, directoryPath, targetPath');
    }

    // 验证目录路径格式
    if (!params.directoryPath.endsWith('/')) {
      params.directoryPath = params.directoryPath + '/';
    }

    const previewParams: PreviewParams = {
      repositoryId: params.repositoryId,
      branch: params.branch,
      directoryPath: params.directoryPath,
      targetPath: params.targetPath,
      excludeFiles: params.excludeFiles,
    };

    const result = await directoryInitializer.previewInitialization(previewParams);

    console.log(`[DirectoryMappingAPI] [${requestId}] 目录映射预览完成`, {
      totalFiles: result.matchedFiles.length,
      newFiles: result.newFiles.length,
      existingMappings: result.existingMappings.length,
      conflicts: result.conflictFiles.length,
      estimatedCases: result.estimatedCases,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(`[DirectoryMappingAPI] [${requestId}] 目录映射预览失败`, {
      error: error.message,
      stack: error.stack?.split('\n')[0],
    });
    return {
      success: false,
      error: {
        message: error.message,
        details: error.stack,
      },
    };
  }
}

/**
 * 验证映射配置
 */
export async function validateMappings(params: { mappings: Record<string, string> }) {
  console.log(`[API] 收到映射配置验证请求: ${Object.keys(params.mappings).length} 个映射`);

  try {
    if (!params.mappings || typeof params.mappings !== 'object') {
      throw new Error('mappings参数必须是一个对象');
    }

    const result = enhancedPathMapping.validateMappings(params.mappings);

    console.log(`[API] 映射配置验证完成: ${result.isValid ? '通过' : '失败'}`);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('[API] 映射配置验证失败:', error);
    return {
      success: false,
      error: {
        message: error.message,
        details: error.stack,
      },
    };
  }
}

/**
 * 获取目录映射列表
 */
export async function getDirectoryMappings(params: { mappings: Record<string, string> }) {
  console.log(`[API] 收到获取目录映射列表请求`);

  try {
    if (!params.mappings || typeof params.mappings !== 'object') {
      throw new Error('mappings参数必须是一个对象');
    }

    const result = enhancedPathMapping.getDirectoryMappings(params.mappings);

    console.log(`[API] 获取目录映射列表完成: ${result.length} 个目录映射`);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('[API] 获取目录映射列表失败:', error);
    return {
      success: false,
      error: {
        message: error.message,
        details: error.stack,
      },
    };
  }
}

/**
 * 预览文件映射结果
 */
export async function previewFileMapping(params: {
  filePath: string;
  mappings: Record<string, string>;
}) {
  console.log(`[API] 收到文件映射预览请求: ${params.filePath}`);

  try {
    if (!params.filePath || !params.mappings) {
      throw new Error('缺少必要参数: filePath, mappings');
    }

    const result = enhancedPathMapping.previewFileMapping(params.filePath, params.mappings);

    console.log(`[API] 文件映射预览完成: ${result.matchType}`);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('[API] 文件映射预览失败:', error);
    return {
      success: false,
      error: {
        message: error.message,
        details: error.stack,
      },
    };
  }
}
