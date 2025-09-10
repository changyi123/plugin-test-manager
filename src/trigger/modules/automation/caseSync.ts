import { storage } from '@giteeteam/apps-api';
import { requestCoreApi } from '@giteeteam/apps-team-api';

export class CaseSync {
  async findCaseByAutomationId(automationCaseId: string) {
    const iql = `'自动化用例唯一标识' = "${automationCaseId}"`;

    try {
      const response = await requestCoreApi('POST', '/parse/api/search', {
        iql: iql,
        displayContext: 'test_manager',
        isShowDetails: true,
        size: 1,
      });

      const items = (response as any)?.payload?.items || [];
      return items[0] || null;
    } catch (error) {
      console.error(`[AutoSync] 查询用例失败 [${automationCaseId}]:`, error);
      return null;
    }
  }

  private async createOrUpdateMapping(data: any) {
    const existing = await storage
      .entity('AutomationCaseMapping')
      .query()
      .equalTo('automationCaseId', data.automationCaseId)
      .first();

    const mappingData = {
      caseId: data.caseId,
      automationCaseId: data.automationCaseId,
      repositoryId: data.repositoryId,
      repositoryName: data.repositoryName,
      filePath: data.filePath,
      testClassName: data.className,
      testMethodName: data.methodName,
      testingFramework: data.framework,
      branchName: data.branch,
      moduleId: data.moduleId,
      modulePath: data.modulePath,
      lastCommitId: data.commitId,
      lastSyncTime: new Date(),
      isActive: true,
    };

    try {
      if (existing) {
        const response = await storage
          .entity('AutomationCaseMapping')
          .set(existing.objectId, mappingData);
        console.log(`[AutoSync] 更新映射关系: ${data.automationCaseId}`);
        return response;
      } else {
        const response = await storage.entity('AutomationCaseMapping').add(mappingData);
        console.log(`[AutoSync] 创建映射关系: ${data.automationCaseId} -> ${response.id}`);
        return response;
      }
    } catch (error) {
      console.error(`[AutoSync] 维护映射关系失败 [${data.automationCaseId}]:`, error);
      throw error;
    }
  }
}

export const caseSync = new CaseSync();
