export interface TestMethodInfo {
  testId: string;
  methodName: string;
  className?: string;
  startLine: number;
  endLine: number;
}

export interface DiffRange {
  start: number;
  end: number;
}

export class JavaParser {
  parseTestMethods(javaCode: string): TestMethodInfo[] {
    const methods: TestMethodInfo[] = [];
    const lines = javaCode.split('\n');

    console.log(`[Parser] 开始解析Java代码，总行数: ${lines.length}`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.includes('@TestId')) {
        console.log(`[Parser] 第${i + 1}行发现@TestId注解: ${line}`);

        // 检查是否是注释掉的@TestId
        if (this.isCommentedLine(lines[i])) {
          console.log(`[Parser] 第${i + 1}行的@TestId注解已被注释，跳过`);
          continue;
        }

        // 修复：支持标准双引号格式的@TestId注解
        const testIdMatch =
          /@TestId\s*\(\s*"([^"]+)"\s*\)/.exec(line) || /@TestId\s*\(\s*'([^']+)'\s*\)/.exec(line);
        if (testIdMatch) {
          const testId = testIdMatch[1];
          const startLine = i + 1;
          let methodName = '';
          let isCommentedMethod = false;

          console.log(`[Parser] 提取到testId: ${testId}，开始查找对应方法`);

          // 检查整个测试方法是否被注释掉
          // 向上查找@Test注解
          for (let k = i - 1; k >= Math.max(0, i - 10); k--) {
            if (lines[k].includes('@Test')) {
              if (this.isCommentedLine(lines[k])) {
                console.log(`[Parser] @Test注解在第${k + 1}行已被注释，此测试用例无效`);
                isCommentedMethod = true;
              }
              break;
            }
          }

          if (isCommentedMethod) {
            continue;
          }

          // 在注解后50行内查找方法定义（增加搜索范围）
          for (let j = i + 1; j < Math.min(i + 50, lines.length); j++) {
            const methodLine = lines[j].trim();

            // 支持更多的方法格式：public/private，void/其他返回类型，有无注解
            if (methodLine.includes('void ') && /\w+\s*\(/.test(methodLine)) {
              console.log(`[Parser] 第${j + 1}行可能是方法定义: ${methodLine}`);

              // 检查方法定义行是否被注释
              if (this.isCommentedLine(lines[j])) {
                console.log(`[Parser] 第${j + 1}行的方法定义已被注释，跳过`);
                isCommentedMethod = true;
                break;
              }

              // 匹配各种方法格式，支持包含连字符、下划线的方法名
              const methodMatch =
                /(?:public|private|protected)?\s*(?:static\s+)?(?:void|[\w<>\[\]]+)\s+([\w-]+)\s*\(/.exec(
                  methodLine,
                );
              if (methodMatch) {
                methodName = methodMatch[1];
                const endLine = this.findMethodEnd(lines, j);
                console.log(
                  `[Parser] 成功解析方法: ${methodName}(@TestId("${testId}")) 起始行=${startLine} 结束行=${endLine}`,
                );
                methods.push({
                  testId,
                  methodName,
                  startLine,
                  endLine,
                });
                break;
              }
            }
          }

          if (!methodName && !isCommentedMethod) {
            console.warn(`[Parser] 未能找到@TestId("${testId}")对应的方法定义`);
          }
        } else {
          console.warn(`[Parser] @TestId注解格式不匹配: ${line}`);
        }
      }
    }

    return methods;
  }

  extractClassName(javaCode: string): string | null {
    const classPattern = /public\s+class\s+(\w+)/;
    const match = javaCode.match(classPattern);
    return match ? match[1] : null;
  }

  /**
   * 解析diff获取受影响的行号范围
   */
  parseDiffRanges(diffText: string): DiffRange[] {
    const ranges: DiffRange[] = [];
    const hunkRegex = /@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/g;

    let hunkMatch: RegExpExecArray | null;
    while ((hunkMatch = hunkRegex.exec(diffText)) !== null) {
      const newStartLine = parseInt(hunkMatch[1]);
      const hunkStartIndex = diffText.indexOf('\n', hunkMatch.index) + 1;

      const nextHunkIndex = diffText.indexOf('\n@@', hunkStartIndex);
      const hunkContent =
        nextHunkIndex === -1
          ? diffText.substring(hunkStartIndex)
          : diffText.substring(hunkStartIndex, nextHunkIndex);

      const modifiedLines = this.extractModifiedLines(hunkContent, newStartLine);
      ranges.push(...modifiedLines);
    }

    console.log(`[AutoSync] diff解析结果: 修改了${ranges.length}个区域`);
    ranges.forEach(range => {
      console.log(`[AutoSync] - 修改范围: ${range.start}-${range.end}行`);
    });

    return ranges;
  }

  private extractModifiedLines(hunkContent: string, newStartLine: number): DiffRange[] {
    const lines = hunkContent.split('\n');
    const modifiedLines: number[] = [];
    let currentNewLine = newStartLine;

    for (const line of lines) {
      if (line.startsWith(' ')) {
        currentNewLine++;
      } else if (line.startsWith('+')) {
        modifiedLines.push(currentNewLine);
        currentNewLine++;
      } else if (line.startsWith('-')) {
        modifiedLines.push(currentNewLine);
      }
    }

    const ranges: DiffRange[] = [];
    if (modifiedLines.length === 0) {
      return ranges;
    }

    modifiedLines.sort((a, b) => a - b);

    let rangeStart = modifiedLines[0];
    let rangeEnd = modifiedLines[0];

    for (let i = 1; i < modifiedLines.length; i++) {
      if (modifiedLines[i] === rangeEnd + 1) {
        rangeEnd = modifiedLines[i];
      } else {
        ranges.push({ start: rangeStart, end: rangeEnd });
        rangeStart = modifiedLines[i];
        rangeEnd = modifiedLines[i];
      }
    }

    ranges.push({ start: rangeStart, end: rangeEnd });
    return ranges;
  }

  /**
   * 分析哪些测试方法受到diff影响
   */
  analyzeAffectedMethods(testMethods: TestMethodInfo[], diffText: string): TestMethodInfo[] {
    const affectedRanges = this.parseDiffRanges(diffText);
    const affectedMethods: TestMethodInfo[] = [];

    for (const method of testMethods) {
      let isAffected = false;

      for (const range of affectedRanges) {
        if (method.startLine <= range.end && method.endLine >= range.start) {
          isAffected = true;
          break;
        }
      }

      if (isAffected) {
        console.log(
          `[AutoSync] 方法受影响: ${method.methodName}(${method.testId}) 行号${method.startLine}-${method.endLine}`,
        );
        affectedMethods.push(method);
      }
    }

    console.log(`[AutoSync] 共${testMethods.length}个测试方法，${affectedMethods.length}个受影响`);
    return affectedMethods;
  }

  private findMethodEnd(lines: string[], startIndex: number): number {
    let braceCount = 0;
    let started = false;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = this.getCodeWithoutComments(line);

      for (const char of cleanLine) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
          if (started && braceCount === 0) {
            return i + 1;
          }
        }
      }
    }
    return startIndex + 10;
  }

  private getCodeWithoutComments(line: string): string {
    const commentIndex = line.indexOf('//');
    if (commentIndex === -1) {
      return line;
    }

    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < commentIndex; i++) {
      const char = line[i];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      if (char === '"' || char === "'") {
        inString = !inString;
      }
    }

    if (inString) {
      return line;
    }

    return line.substring(0, commentIndex);
  }

  /**
   * 判断一行代码是否被注释掉
   */
  private isCommentedLine(line: string): boolean {
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

    // 检查是否整行都在块注释中
    // 注意：这个简单的检查可能不完全准确，但对大部分情况足够
    const blockCommentStart = line.match(/^\s*\/\*/);
    if (blockCommentStart) {
      return true;
    }

    return false;
  }
}

export const javaParser = new JavaParser();
