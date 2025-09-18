/**
 * 映射删除分析器
 * 智能分析映射删除的影响，考虑映射优先级
 */

import { enhancedPathMapping } from './pathMappingEnhanced';

/**
 * 删除影响分析结果
 */
export interface DeletionImpactAnalysis {
  // 需要完全删除用例的文件（不再有任何映射覆盖）
  filesToDelete: string[];

  // 需要迁移到其他模块的文件（仍有其他映射覆盖）
  filesToMigrate: Array<{
    filePath: string;
    fromModule: string;
    toModule: string;
    reason: string;
  }>;

  // 不受影响的文件（有更高优先级的映射）
  unaffectedFiles: Array<{
    filePath: string;
    currentMapping: string;
    reason: string;
  }>;

  // 分析摘要
  summary: {
    deletedMapping: string;
    deletedModule: string;
    mappingType: 'file' | 'directory';
    totalAffectedFiles: number;
    deleteCount: number;
    migrateCount: number;
    unaffectedCount: number;
  };
}

/**
 * 分析删除映射的影响
 * @param deletedPath 被删除的映射路径
 * @param deletedModule 被删除的模块
 * @param remainingMappings 剩余的映射配置
 * @param affectedFiles 可能受影响的文件列表
 */
export function analyzeDeletionImpact(
  deletedPath: string,
  deletedModule: string,
  remainingMappings: Record<string, string>,
  affectedFiles: string[],
): DeletionImpactAnalysis {
  const requestId = `delete-analysis-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  console.log(`[DeletionAnalyzer] [${requestId}] 开始分析映射删除影响`, {
    deletedPath,
    deletedModule,
    remainingMappingCount: Object.keys(remainingMappings).length,
    potentiallyAffectedFiles: affectedFiles.length,
  });

  const result: DeletionImpactAnalysis = {
    filesToDelete: [],
    filesToMigrate: [],
    unaffectedFiles: [],
    summary: {
      deletedMapping: deletedPath,
      deletedModule: deletedModule,
      mappingType: deletedPath.endsWith('/') ? 'directory' : 'file',
      totalAffectedFiles: 0,
      deleteCount: 0,
      migrateCount: 0,
      unaffectedCount: 0,
    },
  };

  // 判断被删除的是目录映射还是文件映射
  const isDirectoryMapping = deletedPath.endsWith('/');

  // 分析每个可能受影响的文件
  for (const filePath of affectedFiles) {
    // 检查文件是否被删除的映射覆盖
    const wasAffectedByDeletedMapping = isDirectoryMapping
      ? filePath.startsWith(deletedPath)
      : filePath === deletedPath;

    if (!wasAffectedByDeletedMapping) {
      // 文件不受此映射影响，跳过
      continue;
    }

    result.summary.totalAffectedFiles++;

    // 查找文件在剩余映射中的最佳匹配
    const newMapping = enhancedPathMapping.findBestMapping(filePath, remainingMappings);

    if (newMapping) {
      // 文件仍有其他映射覆盖
      if (newMapping !== deletedModule) {
        // 映射到不同的模块，需要迁移
        result.filesToMigrate.push({
          filePath,
          fromModule: deletedModule,
          toModule: newMapping,
          reason: `文件仍被映射覆盖，从 ${deletedModule} 迁移到 ${newMapping}`,
        });
        result.summary.migrateCount++;

        console.log(`[DeletionAnalyzer] [${requestId}] 需要迁移`, {
          file: filePath,
          from: deletedModule,
          to: newMapping,
        });
      } else {
        // 映射到相同的模块（可能通过其他路径），不受影响
        result.unaffectedFiles.push({
          filePath,
          currentMapping: newMapping,
          reason: '文件通过其他映射路径仍指向相同模块',
        });
        result.summary.unaffectedCount++;

        console.log(`[DeletionAnalyzer] [${requestId}] 不受影响`, {
          file: filePath,
          stillMappedTo: newMapping,
        });
      }
    } else {
      // 文件不再有任何映射覆盖，需要删除用例
      result.filesToDelete.push(filePath);
      result.summary.deleteCount++;

      console.log(`[DeletionAnalyzer] [${requestId}] 需要删除用例`, {
        file: filePath,
        reason: '不再有任何映射覆盖',
      });
    }
  }

  // 特殊情况：如果删除的是精确文件映射
  if (!isDirectoryMapping) {
    // 检查该文件是否仍被目录映射覆盖
    const remainingMapping = enhancedPathMapping.findBestMapping(deletedPath, remainingMappings);
    if (remainingMapping && remainingMapping !== deletedModule) {
      // 文件被其他映射（通常是目录映射）覆盖，需要迁移而不是删除
      const migrateIndex = result.filesToDelete.indexOf(deletedPath);
      if (migrateIndex !== -1) {
        result.filesToDelete.splice(migrateIndex, 1);
        result.summary.deleteCount--;

        result.filesToMigrate.push({
          filePath: deletedPath,
          fromModule: deletedModule,
          toModule: remainingMapping,
          reason: `精确映射删除后，仍被目录映射覆盖`,
        });
        result.summary.migrateCount++;

        console.log(`[DeletionAnalyzer] [${requestId}] 修正：从删除改为迁移`, {
          file: deletedPath,
          from: deletedModule,
          to: remainingMapping,
        });
      }
    }
  }

  console.log(`[DeletionAnalyzer] [${requestId}] 分析完成`, {
    totalAffected: result.summary.totalAffectedFiles,
    toDelete: result.summary.deleteCount,
    toMigrate: result.summary.migrateCount,
    unaffected: result.summary.unaffectedCount,
  });

  return result;
}

/**
 * 获取可能受映射删除影响的文件列表
 * @param deletedPath 被删除的映射路径
 * @param allFiles 系统中所有的文件列表
 */
export function getPotentiallyAffectedFiles(deletedPath: string, allFiles: string[]): string[] {
  const isDirectoryMapping = deletedPath.endsWith('/');

  if (isDirectoryMapping) {
    // 目录映射：返回该目录下的所有文件
    return allFiles.filter(file => file.startsWith(deletedPath));
  } else {
    // 精确映射：只返回该文件
    return allFiles.filter(file => file === deletedPath);
  }
}

/**
 * 生成删除影响报告
 * @param analysis 删除影响分析结果
 */
export function generateDeletionReport(analysis: DeletionImpactAnalysis): string {
  const lines = [
    `=== 映射删除影响分析报告 ===`,
    `删除的映射: ${analysis.summary.deletedMapping} -> ${analysis.summary.deletedModule}`,
    `映射类型: ${analysis.summary.mappingType === 'directory' ? '目录映射' : '精确文件映射'}`,
    ``,
    `影响统计:`,
    `- 总影响文件数: ${analysis.summary.totalAffectedFiles}`,
    `- 需删除用例: ${analysis.summary.deleteCount} 个文件`,
    `- 需迁移用例: ${analysis.summary.migrateCount} 个文件`,
    `- 不受影响: ${analysis.summary.unaffectedCount} 个文件`,
    ``,
  ];

  if (analysis.filesToDelete.length > 0) {
    lines.push(`需要删除用例的文件:`);
    analysis.filesToDelete.forEach(file => {
      lines.push(`  - ${file}`);
    });
    lines.push(``);
  }

  if (analysis.filesToMigrate.length > 0) {
    lines.push(`需要迁移的文件:`);
    analysis.filesToMigrate.forEach(item => {
      lines.push(`  - ${item.filePath}`);
      lines.push(`    从 ${item.fromModule} 迁移到 ${item.toModule}`);
      lines.push(`    原因: ${item.reason}`);
    });
    lines.push(``);
  }

  if (analysis.unaffectedFiles.length > 0) {
    lines.push(`不受影响的文件:`);
    analysis.unaffectedFiles.forEach(item => {
      lines.push(`  - ${item.filePath} (仍映射到 ${item.currentMapping})`);
    });
  }

  return lines.join('\n');
}

/**
 * 导出分析器实例
 */
export const mappingDeletionAnalyzer = {
  analyzeDeletionImpact,
  getPotentiallyAffectedFiles,
  generateDeletionReport,
};
