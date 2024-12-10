import { i18n } from '@giteeteam/apps-api';
import { getParseQuery } from '@giteeteam/apps-team-api';
import dayjs from 'dayjs';

import { AppKey, EXPORT_FIELD_VALUES, TestFiledKeyMapping } from '../common/constant';
import { getReqInfoFromVMRuntime } from './lib/apiUtil';
import { iqlSearch } from './lib/coreApi';

const getRepoFullPathMap = repositoryData => {
  const pathMap = {};
  // 创建一个哈希表，用于存储每个path对象的子对象
  repositoryData.forEach(repo => {
    pathMap[repo.objectId] = pathMap[repo.objectId] || [repo.name];
  });

  // 遍历repositoryData，将每个父对象的path对象添加到当前pathMap
  repositoryData.forEach(repo => {
    if (repo.parent) {
      if (pathMap[repo.parent.objectId]) {
        pathMap[repo.objectId].unshift(pathMap[repo.parent.objectId]);
      }
    }
  });

  // 将pathMap的每一项转为路径
  repositoryData.forEach(repo => {
    if (pathMap[repo.objectId]) {
      pathMap[repo.objectId] = pathMap[repo.objectId].flat(Infinity).join('/');
    }
  });

  return new Map<string, string>(Object.entries(pathMap));
};

const escapeHtmlString = str => {
  return (
    str?.replace(
      /&\w+;/g,
      c => ({ '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"' }[c] ?? c),
    ) ?? ''
  );
};

const getStatusMap = {
  TODO: '未开始',
  PASSED: '通过',
  BLOCK: '阻塞',
  FAILED: '失败',
  EXECUTING: '执行中',
  CANCEL: '取消',
};

const getEditorOrStringText = (text: any) => {
  if (!text) {
    return '';
  }
  if (typeof text === 'string') {
    return escapeHtmlString(text);
  } else {
    const [editorText] = text;
    return editorText?.stringText;
  }
};

const getSteps = steps => {
  const data = steps
    ?.filter(d => !d.callTestId)
    ?.reduce(
      (prev, cur, index) => {
        prev = {
          status: prev.status
            .concat(
              cur.status
                ? `【${index + 1}】${escapeHtmlString(getStatusMap[cur.status])}`
                : undefined,
            )
            .filter(Boolean),
          action: prev.action
            .concat(cur.action ? `【${index + 1}】${getEditorOrStringText(cur.action)}` : undefined)
            .filter(Boolean),
          result: prev.result
            .concat(cur.result ? `【${index + 1}】${getEditorOrStringText(cur.result)}` : undefined)
            .filter(Boolean),
          data: prev.data
            .concat(cur.data ? `【${index + 1}】${getEditorOrStringText(cur.data)}` : undefined)
            .filter(Boolean),
          actualResult: prev.actualResult
            .concat(
              cur.actualResult
                ? `【${index + 1}】${escapeHtmlString(cur.actualResult)}`
                : undefined,
            )
            .filter(Boolean),
        };

        return prev;
      },
      {
        action: [], // step title
        result: [], // predicates
        data: [],
        status: [],
        actualResult: [],
      },
    );

  const BreakLineCode = '\n';

  return {
    step: data?.action?.map(d => d.replace(/\n*/g, '')).join(BreakLineCode) ?? '',
    result: data?.result?.map(d => d.replace(/\n*/g, '')).join(BreakLineCode) ?? '',
    data: data?.data?.map(d => d.replace(/\n*/g, '')).join(BreakLineCode) ?? '',
    status: data?.status?.map(d => d.replace(/\n*/g, '')).join(BreakLineCode) ?? '',
    actualResult: data?.actualResult?.map(d => d.replace(/\n*/g, '')).join(BreakLineCode) ?? '',
  };
};

const getLabel = value => value.split(':').pop();

export const exportExecution = async (body, items) => {
  const { choseFields, extraParams } = body;
  const { planMapExecution } = extraParams;
  const allIds = [...Object.keys(planMapExecution), ...Object.values(planMapExecution).flat()];
  const result = await iqlSearch({
    iql: `id in ['${allIds.join("','")}']`,
    displayContext: AppKey,
    fields: ['id', 'name'],
  });
  const nameMap = {};
  result?.payload?.items?.forEach(_item => {
    nameMap[_item.id] = _item.name;
  });
  const testFields = choseFields.filter(field => !!field.fieldKey);

  const handleItem = itemProps => {
    const item = {
      id: itemProps.id,
      values: {},
    };
    const executionId = itemProps.values[TestFiledKeyMapping.linkItems]?.[0];
    const runDetail = JSON.parse(itemProps.values[TestFiledKeyMapping.runDetail] || '{}');
    const steps = getSteps(runDetail?.steps);
    const runExecutor = itemProps.values[TestFiledKeyMapping.executor]?.[0];
    for (const field of testFields) {
      switch (field.value) {
        case EXPORT_FIELD_VALUES.precondition:
          item.values[field.value] = runDetail?.precondition ?? '';
          break;
        case EXPORT_FIELD_VALUES.testExecutionBindPlan: {
          const planId = Object.keys(planMapExecution).find(_key =>
            planMapExecution[_key].includes(executionId),
          );
          item.values[field.value] = nameMap[planId] ?? '';
          break;
        }
        case EXPORT_FIELD_VALUES.testExecution: {
          item.values[field.value] = nameMap[executionId] ?? '';
          break;
        }
        case EXPORT_FIELD_VALUES.step:
          item.values[field.value] = steps.step ?? '';
          break;
        case EXPORT_FIELD_VALUES.result:
          item.values[field.value] = steps.result ?? '';
          break;
        case EXPORT_FIELD_VALUES.data:
          item.values[field.value] = steps.data ?? '';
          break;
        case EXPORT_FIELD_VALUES.stepStatus:
          item.values[field.value] = steps.status ?? '';
          break;
        case EXPORT_FIELD_VALUES.actualResult:
          item.values[field.value] = steps.actualResult ?? '';
          break;
        case EXPORT_FIELD_VALUES.runExecutor:
          item.values[field.value] = runExecutor?.nickname ?? runExecutor?.username ?? '';
          break;
        case EXPORT_FIELD_VALUES.testExecutionStatus:
          item.values[field.value] = getStatusMap[itemProps.values[field.fieldKey]];
          break;
        case EXPORT_FIELD_VALUES.testExecutionCount:
          item.values[field.value] = itemProps.values[field.fieldKey];
          break;
        case EXPORT_FIELD_VALUES.executionTime:
          item.values[field.value] = itemProps.values[field.fieldKey]
            ? dayjs(itemProps.values[field.fieldKey]).format('YYYY-MM-DD HH:mm')
            : '';
          break;
        default:
          item.values[field.value] = itemProps.values[field.fieldKey];
      }
    }

    return item;
  };

  return items.map(handleItem).reduce((prev, item) => ({ ...prev, [item.id]: item.values }), {});
};
const runScript = async () => {
  const {
    triggerParams: { items, body },
  } = getReqInfoFromVMRuntime<{
    body: {
      extraParams: { planId: string; exportType: string };
      choseFields: { value: string; fieldKey: string; label: string }[];
    };
    items: {
      id: string;
      workspace: { key: string };
      values: Record<string, unknown>;
    }[];
  }>();

  const { extraParams } = body;
  const { exportType } = extraParams;
  if (exportType === 'testExecution') {
    const res = await exportExecution(body, items);
    return res;
  }

  const workspaceKeys = [...new Set(items.map(item => item?.workspace?.key).filter(Boolean))];
  const repositoryQuery = getParseQuery(true, 'Repository');
  let repoMap = new Map();
  if (workspaceKeys.length) {
    repoMap = await repositoryQuery
      .containedIn('workspaceKey', workspaceKeys)
      .select(['name', 'objectId', 'parent'])
      .limit(99999)
      .find({ useMasterKey: true })
      .then(repositories => repositories.map(repository => repository.toJSON()))
      .then(getRepoFullPathMap);
  }

  const planId = body.extraParams?.planId;
  const choseFields = body.choseFields || [];
  let plan;
  if (planId) {
    const result = await iqlSearch({
      iql: `id = '${planId}'`,
      displayContext: AppKey,
      fields: ['name'],
    });

    plan = result?.payload?.items?.[0];
  }

  const testFields = choseFields.filter(field => !!field.fieldKey);

  const handleItem = itemProps => {
    const item = {
      id: itemProps.id,
      values: {},
    };

    const detail = JSON.parse(itemProps.values[TestFiledKeyMapping.detail] || '{}');
    const caseExecutor = itemProps.values[TestFiledKeyMapping.caseExecutor];
    const status = itemProps.values[TestFiledKeyMapping.status];
    const steps = getSteps(detail?.steps);

    for (const field of testFields) {
      switch (field.value) {
        case EXPORT_FIELD_VALUES.precondition:
          item.values[field.value] = detail?.precondition ?? '';
          break;
        case EXPORT_FIELD_VALUES.step:
        case EXPORT_FIELD_VALUES.result:
        case EXPORT_FIELD_VALUES.data:
          item.values[field.value] = steps[getLabel(field.value)] ?? '';
          break;
        case EXPORT_FIELD_VALUES.group:
          item.values[field.value] =
            repoMap.get(itemProps.values[TestFiledKeyMapping.repository]) ?? '';
          break;
        case EXPORT_FIELD_VALUES.testPlan:
          item.values[field.value] = plan?.name ?? '';
          break;
        case EXPORT_FIELD_VALUES.status:
          item.values[field.value] = i18n.t(`status.${status?.[planId] ?? 'TODO'}.name`) ?? '';
          break;
        case EXPORT_FIELD_VALUES.executor:
          item.values[field.value] =
            caseExecutor?.[planId]?.nickname ?? caseExecutor?.[planId]?.username ?? '';
          break;
        default:
          item.values[field.value] = itemProps.values[field.fieldKey];
      }
    }

    return item;
  };

  return items.map(handleItem).reduce((prev, item) => ({ ...prev, [item.id]: item.values }), {});
};

export { runScript };
