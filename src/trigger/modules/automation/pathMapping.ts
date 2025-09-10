/**
 * 智能路径映射工具
 * 支持全路径和部分路径映射，包含优先级规则
 */

/**
 * 智能映射匹配：支持全路径或半路径映射（包含关系）
 * 优先级规则：
 * 1. 路径更详细的优先（路径长度更长）
 * 2. 如果路径长度相同，配置顺序靠后的优先（行数大的优先）
 */
export function findBestPathMapping(
  targetFilePath: string,
  mappings: Record<string, string>,
): string | null {
  if (!mappings || !targetFilePath) {
    return null;
  }

  const matchedMappings: Array<{
    configPath: string;
    modulePath: string;
    pathLength: number;
    configOrder: number;
  }> = [];

  // 找出所有匹配的映射路径
  Object.entries(mappings).forEach(([configPath, modulePath], index) => {
    // 检查是否包含关系：目标文件路径包含配置路径，或者配置路径包含目标文件路径
    if (targetFilePath.includes(configPath) || configPath.includes(targetFilePath)) {
      matchedMappings.push({
        configPath,
        modulePath,
        pathLength: configPath.length,
        configOrder: index,
      });
    }
  });

  if (matchedMappings.length === 0) {
    return null;
  }

  // 排序规则：路径长度降序，如果长度相同则配置顺序降序
  matchedMappings.sort((a, b) => {
    if (a.pathLength !== b.pathLength) {
      return b.pathLength - a.pathLength; // 路径长度降序（更详细的优先）
    }
    return b.configOrder - a.configOrder; // 配置顺序降序（行数大的优先）
  });

  const bestMatch = matchedMappings[0];
  console.log(
    `[T5.8] 智能映射匹配: ${targetFilePath} -> ${bestMatch.configPath} -> ${bestMatch.modulePath}`,
  );

  return bestMatch.modulePath;
}
