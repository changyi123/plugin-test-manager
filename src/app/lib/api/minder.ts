/** @file 脑图编辑器相关接口 */

import Parse from '@/lib/parse';
import fetch from '@/lib/utils/fetch';
import { CustomField, Repository } from '@/lib/models';
import { getPluginWebTriggerBaseUrl } from '../utils/helper';

const pluginWebTriggerBaseUrl = getPluginWebTriggerBaseUrl();

const parseResponseInterceptor = response => {
  if (response?.status === 'error') {
    throw new Error(response.data);
  }
  return response;
};

/** 获取脑图数据 */
export const getMinderData = async (params: { workspaceKey: string; repositoryKey?: string }) => {
  const {
    data: { data },
  } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-query-minder-data`, params);

  return data;
};

/** 获取优先级配置 */
export const getPriorityOptions = async () => {
  const priorityConfig = await new Parse.Query(CustomField)
    .equalTo('key', 'priority')
    .select(['data'])
    .first({ json: true });

  return priorityConfig.data.customData ?? [];
};

/** 批量创建测试用例 */
export const batchCreateTestCase = async (params: { workspaceId: string; data: any[] }) => {
  const {
    data: { data },
  } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-batch-create-test-case`, params);

  return data;
};

/** 批量更新测试模块*/
export const batchUpdateRepository = async (
  updateParams: {
    objectId: string;
    parent?: string;
    name?: string;
  }[],
) => {
  const needUpdateRepositories = updateParams.map(({ objectId, parent, name }) => {
    const repositoryObj = new Repository({ objectId });
    if (name) {
      repositoryObj.set('name', name);
    }
    if (parent) {
      repositoryObj.set('parent', Repository.createWithoutData(parent));
    } else if (parent === null) {
      // 根节点
      repositoryObj.set('parent', null);
    }

    return repositoryObj;
  });

  return parseResponseInterceptor(await Parse.Object.saveAll(needUpdateRepositories));
};

/** 批量创建测试用例 */
export const batchDeleteRepository = async (ids: string[]) => {
  const needDeleteRepositories = ids.map(id => new Repository({ objectId: id }));
  return parseResponseInterceptor(await Parse.Object.destroyAll(needDeleteRepositories));
};
