import Parse from '@/lib/parse';
import fetch from '@/lib/utils/fetch';
import { FilterGroup } from '@/services/models';

import { groupPermission } from '../constants';
import { escapeMatchesQueryArg, getPluginWebTriggerBaseUrl } from '../utils/helper';

const pluginWebTriggerBaseUrl = getPluginWebTriggerBaseUrl();

export const checkDuplicateCases = async data => {
  return fetch.post(`${pluginWebTriggerBaseUrl}/check-duplicate-case`, data);
};

export const getCaseViewFilter = async (workspaceKey, name, currentUser) => {
  let query = new Parse.Query(FilterGroup);

  const isAdmin = currentUser?.isAdmin;

  if (!isAdmin) {
    query = Parse.Query.or(
      new Parse.Query(FilterGroup).equalTo(
        'createdBy',
        Parse.User.createWithoutData(currentUser.id),
      ),
      new Parse.Query(FilterGroup).equalTo('permissionType', groupPermission.public),
    );
  }

  if (name) {
    query.matches('name', escapeMatchesQueryArg(name), 'i');
  }

  query.equalTo('workspaceKey', workspaceKey);
  query.addDescending('createdAt');

  const data = await query.find({ json: true });
  return data;
};

export const checkFilterGroupName = async (data: {
  workspaceKey: string;
  name: string;
  currentId?: string;
}): Promise<boolean> => {
  const { data: isExist } = await fetch.post(
    `${pluginWebTriggerBaseUrl}/check-filter-group-name`,
    data,
  );
  return isExist;
};
