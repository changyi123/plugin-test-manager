import { WorkflowStatusType } from 'apps-team-components-v1/dist/lib/global';
import { ElementEnum, NodeEnum, userType } from 'apps-team-components-v1/dist/lib/workflow';
import { cloneDeep } from 'lodash';

import fetch from '@/lib/utils/fetch';

import { NodeProps, ResultType, TransitionProps } from './type';

const StartNodeData: NodeProps = {
  id: 'start_node',
  name: 'Start',
  elementType: ElementEnum.Node,
  type: NodeEnum.Start,
  left: 100,
  top: 80,
  key: WorkflowStatusType.Start,
  anyTag: false,
};

export function fetchItemById(id) {
  return fetch.$get(`/parse/api/items/${id}/values?detail=true`);
}

export function fetchRole(workspaceId) {
  return fetch.$get(`/parse/api/permission/user/${workspaceId}`);
}

export function initialFlowData(
  nodes: any[],
  transitions: any[],
): { nodes: NodeProps[]; transitions: TransitionProps[] } {
  nodes = nodes.map((node): NodeProps => {
    return {
      id: node.statusId || node.id,
      name: node.name,
      elementType: ElementEnum.Node,
      type: node.id === StartNodeData.id ? NodeEnum.Start : NodeEnum.Task,
      key: node.key || node.statusType || WorkflowStatusType.Start,
      anyTag: typeof node.anyTag === 'boolean' ? node.anyTag : !!node.parameters?.isAny,
      anyData: node.anyData,
      approval: node.approval || {},
      checkIn: node.checkIn || {},
      left: node.x || node.left,
      top: node.y || node.top,
    };
  });
  transitions = transitions.map((transition): TransitionProps => {
    let source = nodes.find(node => node.id === transition.source?.key);
    let target = nodes.find(node => node.id === transition.target?.key);
    if (transition.source.key === StartNodeData.id) {
      source = StartNodeData;
    }
    if (transition.target.key === StartNodeData.id) {
      target = StartNodeData;
    }
    const plumbSource = cloneDeep(source);
    const plumbTarget = cloneDeep(target);
    plumbSource.anchor = transition.source?.anchor;
    plumbTarget.anchor = transition.target?.anchor;
    return {
      id: transition.id,
      name: transition.name,
      elementType: ElementEnum.Edge,
      source: plumbSource,
      target: plumbTarget,
      parameters: transition.parameters || {},
      properties: transition.properties,
      anyTag: typeof transition.anyTag === 'boolean' ? transition.anyTag : !!transition.isAny,
      geometry: transition.geometry,
    };
  });
  return { nodes, transitions };
}

export const getWorkflowData = (itemId: string) =>
  fetch.$get(`/parse/api/workflows/item/${itemId}`);

export const runTransition = (params: Record<string, any>) => Parse.Cloud.run('transition', params);

export const getItemStatus = async (itemId: string) => {
  const itemResult = await new Parse.Query('Item')
    .equalTo('objectId', itemId)
    .include('status')
    .first();
  const newStatus = itemResult?.get('status')?.toJSON();
  return newStatus;
};

export async function checkTransitionScript(
  scriptText: string,
  params: {
    itemId: string;
    itemType: string;
    workspace: string;
    status: string;
    user: userType;
    item: Parse.Attributes;
    userWorkspaceRoles: string[];
    userGroups: string[];
  },
  applicationId: string,
): Promise<ResultType> {
  if (!scriptText) return { result: true };
  const result = await fetch.$post(
    `/apps/api/v1/${applicationId}/apps/script_handler/environments/production/webtriggers/script-handler`,
    {
      script: scriptText,
      params,
    },
  );
  if (result.code !== 0 && result.code !== 200) {
    const message = result.message || result.data;
    return { result: false, message };
  }
  return { result: true };
}

// 获取用户组
export async function fetchUserGroups(userId) {
  const response = await fetch.$get(`/parse/api/groups/${userId}`);
  return response?.results ?? [];
}

export async function fetchUserRole(userId) {
  const response = await fetch.$get(`/parse/api/roles/user/${userId}`);
  return Array.isArray(response?.results)
    ? response.results.map(role => ({ id: role.id, tag: role.title }))
    : [];
}
