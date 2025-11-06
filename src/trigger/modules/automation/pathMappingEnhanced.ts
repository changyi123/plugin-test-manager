/**
 * 增强的路径映射工具
 * 支持精确文件映射和目录映射，具有明确的优先级规则
 */

/**
 * 映射类型枚举
 */
export enum MappingType {
  EXACT_FILE = 'exact_file',
  DIRECTORY = 'directory',
}

/**
 * 匹配结果接口
 */
export interface MatchResult {
  filePath: string;
  matchedMapping: string | null;
  matchType: MappingType | 'none';
  priority: number;
  conflictMappings?: string[];
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    path: string;
    error: string;
    suggestion?: string;
  }>;
  warnings: Array<{
    path: string;
    warning: string;
  }>;
  statistics: {
    totalMappings: number;
    fileMappings: number;
    directoryMappings: number;
    maxDepth: number;
  };
}

/**
 * 目录映射接口
 */
export interface DirectoryMapping {
  directoryPath: string;
  targetPath: string;
  depth: number;
}

/**
 * 增强的路径映射类
 */
export class EnhancedPathMapping {
  /**
   * 查找最佳映射
   * 优先级规则（从高到低）：
   * 1. 精确文件路径匹配
   * 2. 最深目录路径匹配（路径层级越深越优先）
   * 3. 较浅目录路径匹配
   */
  findBestMapping(filePath: string, mappings: Record<string, string>): string | null {
    if (!mappings || !filePath) {
      return null;
    }

    // 1. 优先精确文件匹配
    if (mappings[filePath]) {
      console.log(`[PathMapping] 精确文件匹配: ${filePath} -> ${mappings[filePath]}`);
      return mappings[filePath];
    }

    // 2. 目录匹配：按路径深度降序排列
    const directoryMappings = Object.keys(mappings)
      .filter(key => this.isDirectoryMapping(key))
      .sort((a, b) => this.getPathDepth(b) - this.getPathDepth(a));

    // 3. 找到第一个匹配的目录
    for (const dirPath of directoryMappings) {
      if (filePath.startsWith(dirPath)) {
        console.log(
          `[PathMapping] 目录映射匹配: ${filePath} -> ${dirPath} -> ${mappings[dirPath]}`,
        );
        return mappings[dirPath];
      }
    }

    console.log(`[PathMapping] 未找到匹配: ${filePath}`);
    return null;
  }

  /**
   * 验证映射配置
   */
  validateMappings(mappings: Record<string, string>): ValidationResult {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];
    let fileMappings = 0;
    let directoryMappings = 0;
    let maxDepth = 0;

    Object.entries(mappings).forEach(([path, targetPath]) => {
      // 检查路径格式
      if (!path || path.trim() === '') {
        errors.push({
          path,
          error: '映射路径不能为空',
          suggestion: '请提供有效的文件或目录路径',
        });
        return;
      }

      // 检查目标路径格式
      if (!targetPath || targetPath.trim() === '') {
        errors.push({
          path,
          error: '目标路径不能为空',
          suggestion: '请提供有效的测试管理目录路径',
        });
        return;
      }

      // 统计映射类型
      if (this.isDirectoryMapping(path)) {
        directoryMappings++;
        const depth = this.getPathDepth(path);
        maxDepth = Math.max(maxDepth, depth);
      } else {
        fileMappings++;
        // 检查文件扩展名
        if (!path.endsWith('.java')) {
          warnings.push({
            path,
            warning: '文件路径不是Java文件，可能不会被处理',
          });
        }
      }

      // 检查路径规范性
      if (path.includes('\\')) {
        warnings.push({
          path,
          warning: '建议使用正斜杠(/)作为路径分隔符',
        });
      }

      // 建议目录路径以/结尾，但不强制要求
      if (this.isDirectoryMapping(path) && !path.endsWith('/')) {
        warnings.push({
          path,
          warning: '建议目录映射路径以/结尾，以便更清晰地表示这是一个目录',
        });
      }
    });

    // 检查目录映射冲突
    this.detectDirectoryConflicts(mappings, errors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      statistics: {
        totalMappings: Object.keys(mappings).length,
        fileMappings,
        directoryMappings,
        maxDepth,
      },
    };
  }

  /**
   * 获取目录映射列表
   */
  getDirectoryMappings(mappings: Record<string, string>): DirectoryMapping[] {
    return Object.entries(mappings)
      .filter(([path]) => this.isDirectoryMapping(path))
      .map(([directoryPath, targetPath]) => ({
        directoryPath,
        targetPath,
        depth: this.getPathDepth(directoryPath),
      }))
      .sort((a, b) => b.depth - a.depth); // 按深度降序排列
  }

  /**
   * 预览文件匹配结果
   */
  previewFileMapping(filePath: string, mappings: Record<string, string>): MatchResult {
    const matchedMapping = this.findBestMapping(filePath, mappings);

    if (!matchedMapping) {
      return {
        filePath,
        matchedMapping: null,
        matchType: 'none',
        priority: 0,
      };
    }

    // 确定匹配类型和优先级
    if (mappings[filePath]) {
      return {
        filePath,
        matchedMapping,
        matchType: MappingType.EXACT_FILE,
        priority: 1, // 最高优先级
      };
    }

    // 找到匹配的目录映射
    const matchedDirectory = Object.keys(mappings)
      .filter(key => this.isDirectoryMapping(key))
      .find(dirPath => filePath.startsWith(dirPath) && mappings[dirPath] === matchedMapping);

    if (matchedDirectory) {
      return {
        filePath,
        matchedMapping,
        matchType: MappingType.DIRECTORY,
        priority: this.getPathDepth(matchedDirectory) + 1, // 深度越深优先级越高
      };
    }

    return {
      filePath,
      matchedMapping: null,
      matchType: 'none',
      priority: 0,
    };
  }

  /**
   * 判断是否为目录映射
   * 目录路径特征：
   * 1. 以/结尾（明确的目录标识）
   * 2. 不包含文件扩展名（没有.xxx的形式）
   */
  private isDirectoryMapping(path: string): boolean {
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
   * 计算路径深度
   */
  private getPathDepth(path: string): number {
    if (!path) return 0;
    // 移除末尾的斜杠再计算
    const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path;
    return cleanPath.split('/').filter(segment => segment.length > 0).length;
  }

  /**
   * 检测目录映射冲突
   */
  private detectDirectoryConflicts(
    mappings: Record<string, string>,
    errors: ValidationResult['errors'],
  ): void {
    const directoryPaths = Object.keys(mappings).filter(path => this.isDirectoryMapping(path));

    for (let i = 0; i < directoryPaths.length; i++) {
      for (let j = i + 1; j < directoryPaths.length; j++) {
        const path1 = directoryPaths[i];
        const path2 = directoryPaths[j];

        // 检查是否存在包含关系
        if (path1.startsWith(path2) || path2.startsWith(path1)) {
          // 如果映射到不同的目标路径，则为冲突
          if (mappings[path1] !== mappings[path2]) {
            errors.push({
              path: path1,
              error: `目录映射冲突: ${path1} 与 ${path2} 存在包含关系但映射到不同目标`,
              suggestion: '请确保有包含关系的目录映射到相同的目标路径，或者使用更精确的映射',
            });
          }
        }
      }
    }
  }
}

/**
 * 导出单例实例
 */
export const enhancedPathMapping = new EnhancedPathMapping();

/**
 * 兼容性函数：保持与现有代码的兼容性
 */
export function findBestPathMapping(
  targetFilePath: string,
  mappings: Record<string, string>,
): string | null {
  return enhancedPathMapping.findBestMapping(targetFilePath, mappings);
}
