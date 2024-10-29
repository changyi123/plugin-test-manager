import { i18n } from '@giteeteam/apps-api';
import { getParseQuery } from '@giteeteam/apps-team-api';

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

const getSteps = steps => {
  const data = steps
    ?.filter(d => !d.callTestId)
    ?.reduce(
      (prev, cur, index) => {
        prev = {
          action: prev.action.concat(`【${index + 1}】${escapeHtmlString(cur.action)}`),
          result: prev.result.concat(`【${index + 1}】${escapeHtmlString(cur.result)}`),
          data: prev.data.concat(`【${index + 1}】${escapeHtmlString(cur.data)}`),
        };

        return prev;
      },
      {
        action: [],
        result: [],
        data: [],
      },
    );

  const BreakLineCode = '\n';

  return {
    step: data?.action?.map(d => d.replace(/\n*/g, '')).join(BreakLineCode) ?? '',
    result: data?.result?.map(d => d.replace(/\n*/g, '')).join(BreakLineCode) ?? '',
    data: data?.data?.map(d => d.replace(/\n*/g, '')).join(BreakLineCode) ?? '',
  };
};

const getLabel = value => value.split(':').pop();

const runScript = async () => {
  const {
    triggerParams: { items, body },
  } = getReqInfoFromVMRuntime<{
    body: {
      extraParams: { planId: string };
      choseFields: { value: string; fieldKey: string; label: string }[];
    };
    items: {
      id: string;
      workspace: { key: string };
      values: Record<string, unknown>;
    }[];
  }>();

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
