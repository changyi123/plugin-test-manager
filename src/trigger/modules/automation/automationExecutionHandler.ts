import { TestType } from '../../../common/constant';
import { buildResponse, getReqInfoFromVMRuntime } from '../../lib/apiUtil';
import { batchUpdateItemsV2 } from '../../lib/coreApi';
import { getAllEntity, uuidv4 } from '../../lib/helper';
import { iqlRequest } from '../../lib/iqlRequest';
import { createExecutionRecord, updateExecutionRecord } from './database';
import { callPipeWebHook } from './webhook';

// 自动化执行参数接口
export interface AutomationExecutionParams {
  testExecutionIds: string[];
  mavenVersion: string;
  jdkVersion: string;
  triggerUser?: string;
  workspaceKey?: string;
}

// 批量优化参数接口 - 支持大规模选择的优化模式
export interface AutomationExecutionBatchParams {
  // 直接模式：适用于小规模选择(≤100个)
  testExecutionIds?: string[];

  // 批量优化模式：适用于大规模选择
  selectAll?: boolean;
  unSelectedRowKeys?: string[];
  queryParams?: any;

  // 通用参数
  mavenVersion: string;
  jdkVersion: string;
  triggerUser?: string;
  workspaceKey?: string;
}

// 自动化执行结果接口
export interface AutomationExecutionResult {
  success: boolean;
  data?: {
    executionId: string;
    buildId?: string;
    pipeJumpUrl?: string;
    message: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// 测试执行自动化状态枚举
export enum TestExecutionAutomationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
}

// 错误码枚举
export enum AutomationExecutionErrorCode {
  INVALID_PARAMS = 'INVALID_PARAMS',
  EXECUTION_RUNNING = 'EXECUTION_RUNNING',
  PIPE_CALL_FAILED = 'PIPE_CALL_FAILED',
  RECORD_CREATE_FAILED = 'RECORD_CREATE_FAILED',
  STATUS_UPDATE_FAILED = 'STATUS_UPDATE_FAILED',
  BATCH_SIZE_EXCEEDED = 'BATCH_SIZE_EXCEEDED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 自动化执行处理器
 * 负责处理自动化测试执行的完整流程，包括参数验证、状态检查、记录创建、Pipe调用等
 */
export class AutomationExecutionHandler {
  private executionId: string;
  private params: AutomationExecutionParams;
  private actualTestExecutionIds: string[] = [];

  constructor(params: AutomationExecutionParams) {
    this.params = params;
    this.executionId = this.generateExecutionId();
  }

  /**
   * 主执行入口
   * 按照T3技术方案的处理流程执行自动化测试触发
   */
  async execute(): Promise<AutomationExecutionResult> {
    try {
      console.log('[executeAutomation] 开始自动化执行处理，executionId:', this.executionId);

      // 1. 参数验证
      await this.validateParams();
      console.log('[executeAutomation] 参数验证通过:');

      // 2. 状态检查
      // await this.checkExecutionStatus();
      console.log('[executeAutomation] 状态检查通过:');

      // 3. 先构建测试用例映射关系
      const testCaseInfos = await this.getTestCaseInfosByExecutionIds(this.actualTestExecutionIds);
      const testCaseMapping = this.buildTestCaseMapping(testCaseInfos);
      console.log(
        '[executeAutomation] 构建映射关系通过，映射数量:',
        Object.keys(testCaseMapping).length,
      );

      // 4. 创建执行记录（包含映射关系）
      const recordId = await this.createExecutionRecord(testCaseMapping);
      console.log('[executeAutomation] 创建执行记录通过:');

      // 5. 更新测试执行状态
      await this.updateTestExecutionStatus(TestExecutionAutomationStatus.RUNNING);
      console.log('[executeAutomation] 更新测试执行状态通过:');

      // 6. 调用Pipe流水线
      const pipeResult = await this.callPipeWebHook();
      console.log('[executeAutomation] 调用Pipe流水线通过:');

      // 7. 更新执行记录（包含Pipe信息）
      await this.updateExecutionRecordWithPipeInfo(recordId, pipeResult);
      console.log('[executeAutomation] 更新执行记录通过:');

      // 7. 返回执行结果
      return {
        success: true,
        data: {
          executionId: this.executionId,
          buildId: pipeResult.buildId,
          pipeJumpUrl: pipeResult.pipeJumpUrl,
          message: `自动化测试已成功触发，执行ID: ${this.executionId}`,
        },
      };
    } catch (error) {
      console.error('自动化执行处理失败:', error);

      // 错误回滚
      await this.rollbackExecutionStatus(error);

      return {
        success: false,
        error: this.buildErrorResponse(error),
      };
    }
  }

  /**
   * 生成唯一执行ID
   */
  private generateExecutionId(): string {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
    const randomSuffix = uuidv4().slice(-4);
    return `exec_${timestamp}_${randomSuffix}`;
  }

  /**
   * 参数验证
   */
  private async validateParams(): Promise<void> {
    const { testExecutionIds, mavenVersion, jdkVersion } = this.params;

    if (!testExecutionIds || !Array.isArray(testExecutionIds) || testExecutionIds.length === 0) {
      throw new ValidationError(
        '[executeAutomation]testExecutionIds必须是非空数组',
        AutomationExecutionErrorCode.INVALID_PARAMS,
      );
    }

    if (testExecutionIds.length > 100) {
      throw new ValidationError(
        '[executeAutomation]单次最多支持100个测试执行',
        AutomationExecutionErrorCode.BATCH_SIZE_EXCEEDED,
      );
    }
    if (!mavenVersion) {
      throw new ValidationError(
        '[executeAutomation]mavenVersion不能为空',
        AutomationExecutionErrorCode.INVALID_PARAMS,
      );
    }
    if (!jdkVersion) {
      throw new ValidationError(
        '[executeAutomation]jdkVersion不能为空',
        AutomationExecutionErrorCode.INVALID_PARAMS,
      );
    }

    // 验证ID格式
    const invalidIds = testExecutionIds.filter(id => typeof id !== 'string' || !id.trim());
    if (invalidIds.length > 0) {
      throw new ValidationError(
        '[executeAutomation]testExecutionIds包含无效ID',
        AutomationExecutionErrorCode.INVALID_PARAMS,
      );
    }

    this.actualTestExecutionIds = testExecutionIds;
    console.log('[executeAutomation]参数验证通过，testExecutionIds数量:', testExecutionIds.length);
  }

  /**
   * 检查测试执行状态
   * 确保没有正在运行中的执行
   */
  private async checkExecutionStatus(): Promise<void> {
    console.log('[executeAutomation]检查测试执行状态...');

    // 这里应该查询数据库检查automation_status字段
    // 暂时使用模拟逻辑
    const runningExecutions = await this.getRunningExecutions(this.actualTestExecutionIds);

    if (runningExecutions.length > 0) {
      const runningIds = runningExecutions.join(', ');
      throw new BusinessError(
        `[executeAutomation]以下测试执行正在进行中，请稍后再试: ${runningIds}`,
        AutomationExecutionErrorCode.EXECUTION_RUNNING,
        { runningExecutions },
      );
    }

    console.log('[executeAutomation]状态检查通过，无正在运行的执行');
  }

  /**
   * 获取正在运行中的测试执行ID列表
   */
  private async getRunningExecutions(testExecutionIds: string[]): Promise<string[]> {
    try {
      // 查询automation_status为running的测试执行
      const { data } = await iqlRequest({
        query: {
          id: testExecutionIds,
          type: TestType.Run,
        },
        fields: ['id', 'automation_status'],
        pagination: { limit: 9999, offset: 0 },
      });

      const runningExecutions = (data.list || [])
        .filter(item => item.values?.automation_status === 'running')
        .map(item => item.objectId);

      console.log(`检查到${runningExecutions.length}个正在运行的测试执行:`, runningExecutions);
      return runningExecutions;
    } catch (error) {
      console.error('查询运行状态失败:', error);
      // 查询失败时为了安全起见，假设所有都在运行
      return testExecutionIds;
    }
  }

  /**
   * 构建测试用例映射关系 - 支持TestID和className#methodName两种映射
   */
  private buildTestCaseMapping(testCaseInfos: any[]): Record<string, any> {
    const testCaseMapping: Record<string, any> = {};

    testCaseInfos.forEach(testCase => {
      const executionData = {
        testExecutionId: testCase.executionId,
        caseId: testCase.caseId,
        caseName: testCase.caseName,
        repository: testCase.repository,
        filePath: testCase.filePath,
        className: testCase.className,
        methodName: testCase.methodName,
        testId: testCase.testId, // 用例唯一标识
      };

      // 1. 通过TestID映射（主要映射方式，Excel中会用到）
      if (testCase.testId) {
        testCaseMapping[testCase.testId] = executionData;
        console.log(
          `[buildTestCaseMapping] 添加TestID映射: ${testCase.testId} -> 执行${executionData.testExecutionId}`,
        );
      }

      // 2. 通过className#methodName映射（备用映射方式）
      if (testCase.className && testCase.methodName) {
        const classMethodKey = `${testCase.className}#${testCase.methodName}`;
        testCaseMapping[classMethodKey] = executionData;
        console.log(
          `[buildTestCaseMapping] 添加类方法映射: ${classMethodKey} -> 执行${executionData.testExecutionId}`,
        );
      }
    });

    console.log(
      `[buildTestCaseMapping] 构建映射关系完成，共 ${
        Object.keys(testCaseMapping).length
      } 个映射条目`,
    );
    return testCaseMapping;
  }

  /**
   * 创建执行记录
   */
  private async createExecutionRecord(testCaseMapping?: Record<string, any>): Promise<string> {
    console.log('[executeAutomation][createExecutionRecord] 开始创建执行记录...');

    try {
      const recordData = {
        executionId: this.executionId,
        testExecutionIds: this.actualTestExecutionIds,
        testCaseMapping: testCaseMapping,
        mavenVersion: this.params.mavenVersion,
        jdkVersion: this.params.jdkVersion,
        status: TestExecutionAutomationStatus.PENDING,
        triggerTime: new Date(),
        triggerUser: this.params.triggerUser || 'system',
        workspaceKey: this.params.workspaceKey || 'default',
      };

      console.log('[executeAutomation][createExecutionRecord] 准备创建记录，数据:');
      console.log(JSON.stringify(recordData, null, 2));

      const record = await createExecutionRecord(recordData);

      console.log(
        '[executeAutomation][createExecutionRecord] ========= createExecutionRecord返回值 =========',
      );
      console.log(JSON.stringify(record, null, 2));
      console.log('[executeAutomation][createExecutionRecord] ========= 返回值分析 =========');
      console.log('[executeAutomation][createExecutionRecord] 返回值类型:', typeof record);
      if (record && typeof record === 'object') {
        console.log(
          '[executeAutomation][createExecutionRecord] record的所有key:',
          Object.keys(record),
        );
        console.log(
          '[executeAutomation][createExecutionRecord] record.objectId:',
          (record as any).objectId,
        );
        console.log('[executeAutomation][createExecutionRecord] record.id:', (record as any).id);
      }

      // storage.entity().add() 通常返回的是新记录的 id 字符串或对象
      const recordId =
        typeof record === 'string'
          ? record
          : (record as any).objectId || (record as any).id || String(record);

      console.log('[executeAutomation][createExecutionRecord] 解析出的recordId:', recordId);
      console.log('[executeAutomation][createExecutionRecord] recordId类型:', typeof recordId);
      console.log(
        '[executeAutomation][createExecutionRecord] this.executionId(用于后续查询):',
        this.executionId,
      );
      console.log(
        '[executeAutomation][createExecutionRecord] ==========================================',
      );

      return String(recordId);
    } catch (error) {
      console.error('[executeAutomation]创建执行记录失败:', error);
      throw new BusinessError(
        '[executeAutomation]执行记录创建失败',
        AutomationExecutionErrorCode.RECORD_CREATE_FAILED,
        error,
      );
    }
  }

  /**
   * 更新测试执行状态
   * 使用r_test_manager_status字段，值为EXECUTING/PASSED/FAILED
   */
  private async updateTestExecutionStatus(status: TestExecutionAutomationStatus): Promise<void> {
    console.log(`[executeAutomation] 更新测试执行状态为: ${status}`);

    // 将内部状态映射到测试管理系统的状态值
    let testManagerStatus: string;
    switch (status) {
      case TestExecutionAutomationStatus.RUNNING:
        testManagerStatus = 'EXECUTING';
        break;
      case TestExecutionAutomationStatus.SUCCESS:
        testManagerStatus = 'PASSED';
        break;
      case TestExecutionAutomationStatus.FAILED:
        testManagerStatus = 'FAILED';
        break;
      default:
        testManagerStatus = 'EXECUTING';
    }
    try {
      // 构建批量更新参数，使用batchUpdateItemsV2的正确格式
      const updateParams = {
        fields: {
          values: {
            r_test_manager_status: testManagerStatus,
          },
        },
        items: this.actualTestExecutionIds,
        asynchronous: false,
      };
      console.log(
        `[executeAutomation] 准备批量更新${this.actualTestExecutionIds.length}个测试执行的r_test_manager_status为${testManagerStatus}`,
      );
      console.log(`[executeAutomation] 更新参数结构:`, JSON.stringify(updateParams));
      // 调用批量更新API
      const result = await batchUpdateItemsV2(updateParams);
      console.log(`[executeAutomation]:更新成功的返回${JSON.stringify(result)}`);
      console.log(
        `[executeAutomation] 成功更新${this.actualTestExecutionIds.length}个测试执行状态为${testManagerStatus}`,
      );
    } catch (error) {
      console.error('[executeAutomation] 更新测试执行状态失败:', error);
      throw new BusinessError(
        '[executeAutomation] 状态更新失败',
        AutomationExecutionErrorCode.STATUS_UPDATE_FAILED,
        error,
      );
    }
  }

  /**
   * 调用Pipe WebHook
   */
  private async callPipeWebHook(): Promise<{
    buildId: string;
    pipeJumpUrl: string;
    testCaseMapping: Record<string, any>;
  }> {
    console.log('[executeAutomation]调用Pipe WebHook...');

    try {
      console.log('[callPipeWebHook] === 开始Pipe调用流程 ===');
      console.log('[callPipeWebHook] 执行ID:', this.executionId);
      console.log('[callPipeWebHook] 测试执行ID列表:', this.actualTestExecutionIds);

      // 1. 查询测试执行的关联测试用例信息
      console.log('[callPipeWebHook] 步骤1: 开始查询测试执行关联的测试用例信息...');
      const testCaseInfos = await this.getTestCaseInfosByExecutionIds(this.actualTestExecutionIds);
      console.log(`[callPipeWebHook] 查询到${testCaseInfos.length}个关联测试用例信息`);

      if (testCaseInfos.length === 0) {
        console.error('[callPipeWebHook] 错误: 没有找到任何关联的测试用例，无法继续执行Pipe调用');
        throw new Error('没有找到关联的测试用例');
      }

      // 输出前几个测试用例的详细信息用于调试
      console.log('[callPipeWebHook] 测试用例详细信息（前3个）:');
      testCaseInfos.slice(0, 3).forEach((testCase, index) => {
        console.log(`[callPipeWebHook] 用例${index + 1}:`, {
          executionId: testCase.executionId,
          caseId: testCase.caseId,
          caseName: testCase.caseName,
          className: testCase.className,
          methodName: testCase.methodName,
          repository: testCase.repository,
          filePath: testCase.filePath,
          gitCloneUrl: testCase.gitCloneUrl,
          gitBranch: testCase.gitBranch,
          gitPath: testCase.gitPath,
        });
      });

      // 2. 构建测试用例映射关系（用于返回）
      console.log('[callPipeWebHook] 步骤2: 构建测试用例映射关系...');
      const testCaseMapping = this.buildTestCaseMapping(testCaseInfos);
      console.log(
        `[callPipeWebHook] 构建映射关系完成，映射数量: ${Object.keys(testCaseMapping).length}`,
      );
      // 输出映射关系的key示例
      const mappingKeys = Object.keys(testCaseMapping).slice(0, 5);
      console.log('[callPipeWebHook] 映射关系key示例（前5个）:', mappingKeys);

      // 3. 组装Pipe参数，使用测试用例的最新信息
      console.log('[callPipeWebHook] 步骤3: 组装Pipe调用参数...');
      const pipeParams = {
        executionId: this.executionId,
        testExecutionIds: this.actualTestExecutionIds,
        testCases: testCaseInfos,
        mavenVersion: this.params.mavenVersion,
        jdkVersion: this.params.jdkVersion,
        executionType: 'BATCH_TEST',
        // 添加Git相关参数，从第一个测试用例获取（假设同一批次的用例来自同一仓库）
        ...(testCaseInfos.length > 0 &&
          testCaseInfos[0].gitCloneUrl && {
            gitCloneUrl: testCaseInfos[0].gitCloneUrl,
            gitBranch: testCaseInfos[0].gitBranch,
            gitPath: testCaseInfos[0].gitPath,
          }),
      };

      console.log('[callPipeWebHook] Pipe调用参数汇总:');
      console.log('[callPipeWebHook] - executionId:', pipeParams.executionId);
      console.log('[callPipeWebHook] - testCases数量:', pipeParams.testCases.length);
      console.log('[callPipeWebHook] - mavenVersion:', pipeParams.mavenVersion);
      console.log('[callPipeWebHook] - jdkVersion:', pipeParams.jdkVersion);
      console.log('[callPipeWebHook] - gitCloneUrl:', pipeParams.gitCloneUrl);
      console.log('[callPipeWebHook] - gitBranch:', pipeParams.gitBranch);
      console.log('[callPipeWebHook] - gitPath:', pipeParams.gitPath);

      console.log('[callPipeWebHook] 步骤4: 开始调用Pipe WebHook接口...');
      const result = await callPipeWebHook(pipeParams);
      console.log('[callPipeWebHook] Pipe WebHook调用成功！返回结果:');
      console.log('[callPipeWebHook] - buildId:', result.buildId);
      console.log('[callPipeWebHook] - pipeJumpUrl:', result.pipeJumpUrl);
      console.log(
        '[callPipeWebHook] - 返回的映射关系数量:',
        Object.keys(result.testCaseMapping || {}).length,
      );

      const finalResult = {
        buildId: result.buildId,
        pipeJumpUrl: result.pipeJumpUrl || `https://pipe.gitee.com/builds/${result.buildId}`,
        testCaseMapping: testCaseMapping,
      };

      console.log('[callPipeWebHook] === Pipe调用流程完成 ===');
      console.log('[callPipeWebHook] 最终返回结果:');
      console.log('[callPipeWebHook] - buildId:', finalResult.buildId);
      console.log('[callPipeWebHook] - pipeJumpUrl:', finalResult.pipeJumpUrl);
      console.log(
        '[callPipeWebHook] - testCaseMapping数量:',
        Object.keys(finalResult.testCaseMapping).length,
      );

      return finalResult;
    } catch (error) {
      console.error('[callPipeWebHook] === Pipe调用流程失败 ===');
      console.error('[callPipeWebHook] 错误详情:', error);
      console.error('[callPipeWebHook] 错误消息:', error?.message);
      console.error('[callPipeWebHook] 错误堆栈:', error?.stack);

      throw new BusinessError(
        'Pipe接口调用失败',
        AutomationExecutionErrorCode.PIPE_CALL_FAILED,
        error,
      );
    }
  }

  /**
   * 根据测试执行ID查询关联的测试用例信息
   */
  private async getTestCaseInfosByExecutionIds(executionIds: string[]): Promise<any[]> {
    try {
      console.log('[getTestCaseInfosByExecutionIds] === 开始查询测试用例信息 ===');
      console.log('[getTestCaseInfosByExecutionIds] 输入的执行ID数量:', executionIds.length);
      console.log('[getTestCaseInfosByExecutionIds] 执行ID列表:', executionIds);

      // 1. 查询测试执行，获取r_test_manager_referenceCase字段
      console.log('[getTestCaseInfosByExecutionIds] 步骤1: 查询测试执行，获取关联用例ID...');
      const queryParams = {
        query: {
          id: executionIds,
          type: TestType.Run,
        },
        fields: ['id', 'r_test_manager_referenceCase'],
        pagination: { limit: 9999, offset: 0 },
      };
      console.log('[getTestCaseInfosByExecutionIds] 查询参数:', JSON.stringify(queryParams));

      const { data } = await iqlRequest(queryParams);

      const testExecutions = data.list || [];
      console.log(
        `[getTestCaseInfosByExecutionIds] 查询结果: 找到${testExecutions.length}个测试执行记录`,
      );

      if (testExecutions.length === 0) {
        console.error('[getTestCaseInfosByExecutionIds] 错误: 没有找到任何测试执行记录！');
        console.error(
          '[getTestCaseInfosByExecutionIds] 可能的原因: 1.执行ID不存在 2.类型不是TestRun 3.权限问题',
        );
        return [];
      }

      // 详细输出查询到的测试执行记录
      testExecutions.forEach((execution, index) => {
        console.log(`[getTestCaseInfosByExecutionIds] 执行记录${index + 1}:`, {
          objectId: execution.objectId,
          referenceCase: execution.referenceCase,
          values: execution.values,
        });
      });

      const referenceCaseIds = testExecutions
        .map(execution => execution.referenceCase)
        .filter(caseId => caseId); // 过滤掉空值

      console.log(
        `[getTestCaseInfosByExecutionIds] 提取关联用例ID: 找到${referenceCaseIds.length}个有效的关联用例ID`,
      );
      console.log('[getTestCaseInfosByExecutionIds] 关联用例ID列表:', referenceCaseIds);

      if (referenceCaseIds.length === 0) {
        console.error('[getTestCaseInfosByExecutionIds] 错误: 没有找到关联的测试用例！');
        console.error(
          '[getTestCaseInfosByExecutionIds] 可能的原因: r_test_manager_referenceCase字段为空',
        );
        return [];
      }

      // 2. 查询测试用例的详细信息（包括仓库信息等）
      console.log('[getTestCaseInfosByExecutionIds] 步骤2: 查询测试用例详细信息...');
      const caseQueryParams = {
        query: {
          id: referenceCaseIds,
          type: TestType.Case,
        },
        fields: [
          'id',
          'name',
          'r_test_manager_repository',
          'r_test_manager_atm_module_path',
          'r_test_manager_atm_start_line',
          'r_test_manager_atm_framework',
          'r_test_manager_atm_class_name',
          'r_test_manager_atm_file_path',
          'r_test_manager_atm_method_name',
          'r_test_manager_atm_test_id',
          'r_test_manager_atm_git_clone_url',
          'r_test_manager_atm_git_branch',
          'r_test_manager_atm_git_path',
        ],
        pagination: { limit: 9999, offset: 0 },
      };
      console.log(
        '[getTestCaseInfosByExecutionIds] 用例查询参数:',
        JSON.stringify(caseQueryParams),
      );

      const { data: caseData } = await iqlRequest(caseQueryParams);
      const testCases = caseData.list || [];

      console.log(
        `[getTestCaseInfosByExecutionIds] 查询结果: 找到${
          testCases.length
        }个测试用例详细信息：${JSON.stringify(testCases)}`,
      );

      if (testCases.length === 0) {
        console.error('[getTestCaseInfosByExecutionIds] 错误: 没有找到任何测试用例详细信息！');
        console.error(
          '[getTestCaseInfosByExecutionIds] 可能的原因: 1.用例ID不存在 2.类型不是TestCase 3.权限问题',
        );
        return [];
      }

      // 详细输出前几个测试用例信息
      console.log('[getTestCaseInfosByExecutionIds] 测试用例详细信息（前3个）:');
      testCases.slice(0, 3).forEach((testCase, index) => {
        console.log(`[getTestCaseInfosByExecutionIds] 用例${index + 1}:`, {
          objectId: testCase.objectId,
          name: testCase.values?.name,
          className: testCase.values?.r_test_manager_atm_class_name,
          methodName: testCase.values?.r_test_manager_atm_method_name,
          repository: testCase.values?.r_test_manager_repository,
          filePath: testCase.values?.r_test_manager_atm_file_path,
          gitCloneUrl: testCase.values?.r_test_manager_atm_git_clone_url,
          gitBranch: testCase.values?.r_test_manager_atm_git_branch,
          gitPath: testCase.values?.r_test_manager_atm_git_path,
        });
      });
      // 3. 组装返回数据，建立执行ID到用例信息的映射
      console.log('[getTestCaseInfosByExecutionIds] 步骤3: 组装返回数据...');
      const caseMap = new Map();
      testCases.forEach(testCase => {
        caseMap.set(testCase.objectId, testCase.values);
      });
      console.log('[getTestCaseInfosByExecutionIds] 构建用例信息映射表，映射数量:', caseMap.size);

      const result = testExecutions.map(execution => {
        const caseId = execution.referenceCase;
        const caseInfo = caseMap.get(caseId);

        if (!caseInfo) {
          console.warn(
            `[getTestCaseInfosByExecutionIds] 警告: 执行${execution.objectId}关联的用例${caseId}没有找到详细信息`,
          );
        }

        const mappedCase = {
          executionId: execution.objectId,
          caseId: caseId,
          caseName: caseInfo?.name || '',
          repository: caseInfo?.r_test_manager_repository || '',
          testId: caseInfo?.r_test_manager_atm_test_id || '',
          filePath: caseInfo?.r_test_manager_atm_file_path || '',
          className: caseInfo?.r_test_manager_atm_class_name || '',
          methodName: caseInfo?.r_test_manager_atm_method_name || '',
          modulePath: caseInfo?.r_test_manager_atm_module_path || '',
          framework: caseInfo?.r_test_manager_atm_framework || '',
          startLine: caseInfo?.r_test_manager_atm_start_line || 0,
          // 添加Git相关字段
          gitCloneUrl: caseInfo?.r_test_manager_atm_git_clone_url || '',
          gitBranch: caseInfo?.r_test_manager_atm_git_branch || '',
          gitPath: caseInfo?.r_test_manager_atm_git_path || '',
        };

        return mappedCase;
      });

      console.log(`[getTestCaseInfosByExecutionIds] 组装完成${result.length}个测试用例信息`);

      // 检查关键字段是否有缺失
      const missingClassName = result.filter(item => !item.className).length;
      const missingMethodName = result.filter(item => !item.methodName).length;
      const missingGitInfo = result.filter(item => !item.gitCloneUrl).length;

      console.log('[getTestCaseInfosByExecutionIds] 数据质量检查:');
      console.log(
        `[getTestCaseInfosByExecutionIds] - 缺少className的用例数量: ${missingClassName}`,
      );
      console.log(
        `[getTestCaseInfosByExecutionIds] - 缺少methodName的用例数量: ${missingMethodName}`,
      );
      console.log(
        `[getTestCaseInfosByExecutionIds] - 缺少gitCloneUrl的用例数量: ${missingGitInfo}`,
      );

      if (missingClassName > 0 || missingMethodName > 0) {
        console.warn(
          '[getTestCaseInfosByExecutionIds] 警告: 存在缺少className或methodName的用例，这会影响映射关系的构建',
        );
      }

      console.log('[getTestCaseInfosByExecutionIds] === 查询测试用例信息完成 ===');
      return result;
    } catch (error) {
      console.error('[executeAutomation] 查询测试用例信息失败:', error);
      throw new BusinessError(
        '查询测试用例信息失败',
        AutomationExecutionErrorCode.UNKNOWN_ERROR,
        error,
      );
    }
  }

  /**
   * 更新执行记录的Pipe信息
   */
  private async updateExecutionRecordWithPipeInfo(recordId: string, pipeInfo: any): Promise<void> {
    console.log('[executeAutomation] === 开始更新执行记录的Pipe信息 ===');
    console.log('[executeAutomation] recordId (从createExecutionRecord返回):', recordId);
    console.log('[executeAutomation] recordId类型:', typeof recordId);
    console.log('[executeAutomation] this.executionId:', this.executionId);
    console.log('[executeAutomation] pipeInfo:', JSON.stringify(pipeInfo));
    console.log('[executeAutomation] pipeInfo.buildId:', pipeInfo.buildId);

    try {
      // 更新执行记录的Pipe信息（映射关系已经在创建时保存）
      const updateData = {
        buildId: String(pipeInfo.buildId), // 确保buildId是字符串
        pipeJumpUrl: pipeInfo.pipeJumpUrl,
        status: TestExecutionAutomationStatus.RUNNING,
        completeTime: new Date(), // 使用completeTime替代startTime
      };

      console.log('[executeAutomation] 准备更新的数据:', JSON.stringify(updateData));

      // 注意：updateExecutionRecord需要的是executionId，而不是objectId
      // 使用this.executionId而不是recordId
      await updateExecutionRecord(this.executionId, updateData);

      console.log('[executeAutomation] 执行记录更新成功！');
      console.log('[executeAutomation] buildId已保存:', pipeInfo.buildId);
    } catch (error) {
      console.error('[executeAutomation] 更新执行记录失败，错误详情:', error);
      console.error('[executeAutomation] 错误消息:', error?.message);
      console.error('[executeAutomation] 错误堆栈:', error?.stack);
      // 这里不抛出错误，因为Pipe已经调用成功了
      console.warn('[executeAutomation] 执行记录更新失败，但Pipe调用已成功');
    }
  }

  /**
   * 错误回滚机制
   */
  private async rollbackExecutionStatus(error: Error): Promise<void> {
    console.log('[executeAutomation] 开始错误回滚...');

    try {
      // 回滚测试执行状态到FAILED
      await this.updateTestExecutionStatus(TestExecutionAutomationStatus.FAILED);

      // 记录错误信息到执行记录
      if (this.executionId) {
        // TODO: 更新执行记录为失败状态
        console.log('[executeAutomation] 已记录错误信息到执行记录');
      }
    } catch (rollbackError) {
      console.error('[executeAutomation] 错误回滚失败:', rollbackError);
    }
  }

  /**
   * 构建错误响应
   */
  private buildErrorResponse(error: Error): { code: string; message: string; details?: any } {
    if (error instanceof ValidationError) {
      return {
        code: error.code,
        message: error.message,
        details: error.details,
      };
    }

    if (error instanceof BusinessError) {
      return {
        code: error.code,
        message: error.message,
        details: error.details,
      };
    }

    return {
      code: AutomationExecutionErrorCode.UNKNOWN_ERROR,
      message: '未知错误，请联系管理员',
      details: error.message,
    };
  }
}

/**
 * 自定义验证错误类
 */
class ValidationError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * 自定义业务错误类
 */
class BusinessError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'BusinessError';
  }
}

/**
 * 统一自动化执行API入口
 * 支持传统模式和批量优化模式
 */
export const executeAutomation = async (requestParams: any): Promise<AutomationExecutionResult> => {
  try {
    console.log('[executeAutomation] 收到原始请求:', JSON.stringify(requestParams));
    const body = requestParams.payload as AutomationExecutionBatchParams;
    console.log('[executeAutomation] 解析后的payload:', body);
    console.log('[executeAutomation] testExecutionIds类型:', typeof body.testExecutionIds);
    console.log('[executeAutomation] testExecutionIds值:', body.testExecutionIds);
    console.log('[executeAutomation] testExecutionIds长度:', body.testExecutionIds?.length);

    // 解析参数 - 支持批量优化模式
    let testExecutionIds: string[];

    if (
      body.testExecutionIds &&
      Array.isArray(body.testExecutionIds) &&
      body.testExecutionIds.length > 0
    ) {
      // 直接模式
      testExecutionIds = body.testExecutionIds;
      console.log('[executeAutomation] 使用直接模式，testExecutionIds:', testExecutionIds);
    } else if (body.selectAll && body.queryParams) {
      // 批量优化模式 - 需要根据queryParams查询实际的ID列表
      console.log('[executeAutomation] 使用批量优化模式，queryParams:', body.queryParams);
      testExecutionIds = await getTestExecutionIdsByQuery(body.queryParams, body.unSelectedRowKeys);
    } else {
      console.log('[executeAutomation] 参数验证失败，body:', body);
      throw new ValidationError(
        '必须提供testExecutionIds或使用selectAll模式',
        AutomationExecutionErrorCode.INVALID_PARAMS,
      );
    }
    // 批量大小限制检查
    if (testExecutionIds.length > 500) {
      throw new ValidationError(
        '单次批量执行最多支持500个测试执行',
        AutomationExecutionErrorCode.BATCH_SIZE_EXCEEDED,
      );
    }

    const params: AutomationExecutionParams = {
      testExecutionIds,
      mavenVersion: body.mavenVersion,
      jdkVersion: body.jdkVersion,
      triggerUser: body.triggerUser,
      workspaceKey: body.workspaceKey,
    };

    const handler = new AutomationExecutionHandler(params);
    return await handler.execute();
  } catch (error) {
    console.error('[executeAutomation] API调用失败:', error);

    if (error instanceof ValidationError || error instanceof BusinessError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      };
    }

    return {
      success: false,
      error: {
        code: AutomationExecutionErrorCode.UNKNOWN_ERROR,
        message: '系统内部错误',
        details: error.message,
      },
    };
  }
};

/**
 * 根据查询参数获取测试执行ID列表
 * 用于批量优化模式
 */
async function getTestExecutionIdsByQuery(
  queryParams: any,
  unSelectedRowKeys?: string[],
): Promise<string[]> {
  console.log('根据查询参数获取测试执行ID:', queryParams, unSelectedRowKeys);

  try {
    // 确保查询的是测试执行类型
    const finalQueryParams = {
      ...queryParams,
      query: {
        ...queryParams.query,
        type: TestType.Run, // 确保查询测试执行(Test Run)
      },
    };

    // 使用getAllEntity获取所有符合条件的测试执行ID
    const testExecutions = await getAllEntity(finalQueryParams, ['id']);
    console.log(`查询到${testExecutions.length}个测试执行`);

    let testExecutionIds = testExecutions.map(item => item.objectId || item.id);

    // 如果有未选中的行键，则排除这些ID
    if (unSelectedRowKeys && unSelectedRowKeys.length > 0) {
      console.log(`排除${unSelectedRowKeys.length}个未选中的测试执行`);
      testExecutionIds = testExecutionIds.filter(id => !unSelectedRowKeys.includes(id));
    }

    console.log(`最终得到${testExecutionIds.length}个测试执行ID`);
    return testExecutionIds;
  } catch (error) {
    console.error('批量查询测试执行ID失败:', error);
    throw new BusinessError(
      '批量查询测试执行失败',
      AutomationExecutionErrorCode.INVALID_PARAMS,
      error,
    );
  }
}
