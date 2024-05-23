import { difference } from 'lodash';

import { getRepoFullPathMap } from '@/components/business/RepositoryGroup/repository';
import {
  getLinkedTestEntityByQuery,
  getRepositoryTreeV2,
  getTestEntityByQuery,
} from '@/lib/api/item';
import { getCustomFields } from '@/lib/api/proxima';
import { getRepositoryData } from '@/lib/api/repository';
import { getAppEnv } from '@/lib/appEnv';
import { TestLinkType, TestType } from '@/lib/constants';
import { SYSTEM_FIELD } from '@/lib/constants';
import Parse from '@/lib/parse';
import { Item } from '@/lib/types/App';
import { Step } from '@/lib/types/Test';
import { arrayToTree } from '@/lib/utils/arrayToTree';
import fetch from '@/lib/utils/fetch';
import { escapeHtmlString } from '@/lib/utils/helper';
import { getPluginWebTriggerBaseUrl } from '@/lib/utils/helper';
import { SearchSelectors } from '@/lib/utils/iql';
import { isZhLang } from '@/lib/utils/locale';
import { getRepositoryQuery } from '@/lib/utils/tree';
import { CustomField } from '@/services/models';

import { getTreeNodeByKey } from '../util';

export type TreeNode = {
  key: string;
  name: string;
  title: React.ReactNode;
  parentKey: string | null;
  caseIds: string[];
  children: TreeNode[];
};

interface ImportArgs {
  type: string;
  checkedId: string;
  workspace: Record<string, any>;
  treeData?: TreeNode[];
  repository?: Record<string, any>;
  selector?: SearchSelectors | string;
}

const getTestPriorityInfo = async (filedKey: string) => {
  const query = new Parse.Query(CustomField).equalTo('key', filedKey);
  const data = await query.find();

  return data.map(d => d.toJSON()).find(d => d.key === filedKey);
};

/** 获取导出 excel 表数据 */
const getExcelData = async (data: any) => {
  const { results, repoData, workspaceKey, planId, t } = data;

  const getTestGroupPath = (path?: string) => ({
    [t('page.repository.repoDropDown.excelExportTitle.group')]: path ?? '',
  });

  const getStatus = (status?: Record<string, string>, planId?: string) =>
    planId
      ? {
          [t('page.repository.repoDropDown.excelExportTitle.status')]: t(
            `status.${status?.[planId] ?? 'TODO'}.name`,
          ),
        }
      : {};

  const getTestPlan = planData => {
    return {
      [t('page.repository.repoDropDown.excelExportTitle.testPlan')]: planData?.name ?? '',
    };
  };

  /** 获取测试用例数据 */
  const getTestInfo = data => ({
    ...getTestInfoByDetail(data.detail),
  });

  const getTestInfoByDetail = (detail: { steps?: Step[]; precondition?: string }) => ({
    [t('page.repository.repoDropDown.excelExportTitle.precondition')]: detail?.precondition ?? '',
    ...getSteps(detail?.steps),
  });

  const getSteps = (steps?: Step[]) => {
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

    // const code = OSnow() === 'mac' ? '\n' : '\r\n';
    const BreakLineCode = '\n';

    return {
      [t('page.repository.repoDropDown.excelExportTitle.step')]:
        data?.action?.map(d => d.replace(/\n*/g, '')).join(BreakLineCode) ?? '',
      [t('page.repository.repoDropDown.excelExportTitle.result')]:
        data?.result?.map(d => d.replace(/\n*/g, '')).join(BreakLineCode) ?? '',
      [t('page.repository.repoDropDown.excelExportTitle.data')]:
        data?.data?.map(d => d.replace(/\n*/g, '')).join(BreakLineCode) ?? '',
    };
  };

  /** 获取负责人 */
  const getAssignee = (values?: Record<string, unknown>) =>
    (Array.isArray(values?.assignee) ? values?.assignee : [])
      ?.map(user => user.nickname ?? user.username ?? user.name)
      .filter(Boolean)
      .join(',') ?? '';

  /** 获取优先级 */
  const getPriority = (values?: Record<string, unknown>, priInfo?: any) =>
    priInfo?.data.customData.find(list => list.key === values?.priority)?.name ?? '';

  /** 获取事项数据 */
  const getItemInfo = (item: Item, priInfo: any) => ({
    key: item.key,
    [t('page.repository.repoDropDown.excelExportTitle.name')]: item.name,
    [t('page.repository.repoDropDown.excelExportTitle.itemType')]: (item?.itemType as any)?.name,
    [t('page.repository.repoDropDown.excelExportTitle.assignee')]: getAssignee(item?.values),
    [t('page.repository.repoDropDown.excelExportTitle.priority')]: getPriority(
      item?.values,
      priInfo,
    ),
  });

  const priorityInfo = await getTestPriorityInfo('priority');

  const _repoData =
    repoData ?? (await getRepositoryData([workspaceKey], ['name', 'objectId', 'parent']));

  const repoDataMap = getRepoFullPathMap(_repoData);

  let testPlanObj = {};

  if (planId) {
    const { list: testPlan } = await getTestEntityByQuery({
      query: {
        type: TestType.Plan,
        workspaceKey,
        id: planId,
      },
    });

    testPlanObj = getTestPlan(testPlan[0]);
  }

  const getCaseExecutor = (caseExecutor, planId) => {
    return planId
      ? {
          [t('common.testExecutor')]:
            caseExecutor?.[planId]?.nickname ?? caseExecutor?.[planId]?.username,
        }
      : {};
  };

  // 当不存在 results 时使用空模板
  const testCases = results.length === 0 ? [{}] : results;

  return testCases.map(item => ({
    ...testPlanObj,
    ...getTestGroupPath(repoDataMap.get(item.repository)),
    ...getItemInfo(item, priorityInfo),
    ...getTestInfo(item),
    ...getCaseExecutor(item.caseExecutor, planId),
    ...getStatus(item.caseStatus, planId),
  }));
};

// const getTestIdsByFrom = async (id: string) => {
//   const query = new Parse.Query(TestRelation).equalTo('from', id).limit(9999);
//   const data = await query.find();

//   return data
//     .reduce((prev, cur) => {
//       prev = prev.concat(cur.toJSON().to?.objectId);
//       return prev;
//     }, [])
//     .filter(Boolean);
// };

export const getTestRepoGroupIds = (datas: any[], checkRepoKey: string) => {
  const treeData = arrayToTree(
    datas.map(d => ({
      name: d.name,
      key: d.objectId,
      parentKey: d.parent?.objectId ?? null,
      workspaceKey: d.workspaceKey,
    })),
  );

  const treeToArray = data =>
    data.reduce((prev, cur) => {
      prev = prev.concat([cur]);

      if (cur.children?.length) {
        prev = prev.concat(treeToArray(cur.children));
      }

      return prev;
    }, []);

  const getGroupIds = data =>
    data.reduce((prev, cur) => {
      prev = prev.concat([cur.key]);

      if (cur.children?.length) {
        prev = prev.concat(getGroupIds(cur.children));
      }

      return prev;
    }, []);

  return getGroupIds(treeToArray(treeData).filter(d => d.key === checkRepoKey));
};

/** 导出用例 */
const importTestInfo = async (
  args: ImportArgs,
  t: (val: string) => string | string[],
  excelData = [],
) => {
  const { type, checkedId, workspace, repository, selector } = args;

  if (type === 'exportPlan') {
    // 获取当前测试计划下的测试用例
    const { list: results } = await getLinkedTestEntityByQuery({
      query: {
        workspaceKey: workspace.key,
      },
      linkType: TestLinkType.CaseLinkPlan,
      sourceIds: [checkedId],
      limit: 9999,
      destinationType: TestType.Case,
    });

    excelData = await getExcelData({
      results,
      workspaceKey: workspace.key,
      planId: checkedId,
      t,
    });
  } else {
    let repositoryParams: Record<string, unknown> = repository;
    // 获取用例树
    const workspaceKey = workspace.key;
    const [{ data: repositoryTree }, repositoryData] = await Promise.all([
      getRepositoryTreeV2({ workspaceKey }),
      getRepositoryData([workspaceKey]),
    ]);

    const selectTreeNode = getTreeNodeByKey([repositoryTree], checkedId);

    const queryParams = {
      query: null,
      selector: null,
      limit: 99999,
    };

    // 导出当前分组及其字分组，需要特殊处理 repository 数据
    if (type === 'exportChildGroup') {
      // 获取当前分组及其所有子分组用例
      repositoryParams = getRepositoryQuery(selectTreeNode, 'all')?.repository;
    } else if (type === 'exportGroup') {
      // 导出当前分组用例
      repositoryParams = getRepositoryQuery(selectTreeNode, 'current')?.repository;
    } else if (type === 'exportFilter') {
      queryParams.selector = selector;
    }
    queryParams.query = {
      type: TestType.Case,
      workspaceKey: workspace.key,
      ...repositoryParams,
    };
    console.info('exportTestInfo', type, queryParams);

    const { list: results } = await getTestEntityByQuery(queryParams);

    excelData = await getExcelData({ results, repoData: repositoryData, t });
  }

  exportExcelFile(
    excelData,
    'sheet1',
    `${
      type === 'exportPlan'
        ? t('page.repository.repoDropDown.importPlanLinkCase')
        : t('page.repository.repoDropDown.importRepoCase')
    }-${workspace.name}.xlsx`,
    t,
  );
};

/** 下载 excel 用例导出文件 */
export const downloadExampleFile = async (fieldKeys, t, lang) => {
  // 获取需要导出的自定义字段
  const SystemFieldKeys = Object.values(SYSTEM_FIELD);
  const CustomFieldKeys = difference(fieldKeys, SystemFieldKeys);
  const CustomFields = await getCustomFields(CustomFieldKeys);
  const ExportCustomFields = CustomFields.reduce((res, field) => {
    return {
      ...res,
      [isZhLang(lang) ? field.name : field.key]: t(
        'page.repository.repoDropDown.pleaseEnterContent',
      ),
    };
  }, {});
  exportExcelFile(
    [
      {
        ...(t('page.repository.repoDropDown.excelContent', {
          returnObjects: true,
        }) ?? {}),
        // 所属分组: '分组1/分组2',
        // 标题: '测试用例标题（样例数据，执行用例导入时请删除该数据）',
        // 类型: '测试用例',
        // 优先级: '优先级可填值范围：最高，较高，普通，较低，最低',
        // 前置条件: '测试用例前置条件',
        // 负责人: '用户名',
        // 步骤: '【1】需要以【序号】开头\n【2】步骤中换行符会被保留',
        // 预期结果: '【1】需要以【序号】开头\n【2】预期结果中换行符会被保留',
        // 数据: '【1】需要以【序号】开头\n【2】数据中换行符会被保留',
        ...ExportCustomFields,
      },
    ],
    'sheet1',
    `${t('page.repository.repoDropDown.excelName')}.xlsx`,
    t,
  );
};

function s2ab(s: any) {
  if (typeof ArrayBuffer !== 'undefined') {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i != s.length; ++i) {
      view[i] = s.charCodeAt(i) & 0xff;
    }
    return buf;
  } else {
    const buf = new Array(s.length);
    for (let i = 0; i != s.length; ++i) {
      buf[i] = s.charCodeAt(i) & 0xff;
    }
    return buf;
  }
}

// 文件加密
const encryptFile = async (buffer: ArrayBuffer): Promise<ArrayBuffer> => {
  // array buffer 转 base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;

    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return window.btoa(binary);
  };

  const base64ToArrayBuffer = (base64: string) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
  };

  const shouldEncrypt = !!getAppEnv('FILE_ENCRYPT_SERVER_BASE_URL');
  // 文件加密服务配置
  if (shouldEncrypt) {
    const base64 = arrayBufferToBase64(buffer);
    const { data } = await fetch.$post(
      `${getPluginWebTriggerBaseUrl()}/extension-weichai-file-encrypt`,
      {
        base64,
      },
    );

    const encryptBase64 = data?.base64;

    // base64 转 array buffer
    return base64ToArrayBuffer(encryptBase64);
  }

  return buffer;
};

/** 导出用例数据 */
const exportExcelFile = async (
  array: any[],
  sheetName = 'sheet1',
  fileName = 'example.xlsx',
  t,
) => {
  const defaultCellStyle = {
    font: {
      name: t('page.repository.repoDropDown.fontName'),
      sz: 11,
      color: {
        auto: 1,
      },
    },
    alignment: {
      wrapText: true,
      vertical: 'center',
      indent: 0,
    },
  };

  const { utils: xlsxUtils, write: xlsxWrite } = require('sheetjs-style');

  const jsonWorkSheet = Object.entries(xlsxUtils.json_to_sheet(array)).reduce(
    (prev, [key, value]: any[]) => {
      prev[key] = /[A-Z]{1}\d+/g.test(key)
        ? {
            ...value,
            s: defaultCellStyle,
          }
        : value;

      return prev;
    },
    {},
  );

  const workBook: any = {
    SheetNames: [sheetName],
    Sheets: {
      [sheetName]: Object.assign({}, jsonWorkSheet, {
        '!cols': [
          { wch: 30 }, // 第一列
          { wch: 20 }, // 第二列
          { wch: 20 }, // 第三列
          { wch: 15 }, // 第四列
          { wch: 10 }, // 第五列
          { wch: 20 }, // 第六列
          { wch: 50 }, // 第七列
          { wch: 50 }, // 第八列
          { wch: 20 }, // 第九列
          { wch: 20 }, // 第十列
          { wch: 10 }, // 第十一列
          { wch: 20 }, // 第十二列
        ],
      }),
    },
  };

  const wbout = xlsxWrite(workBook, {
    bookType: 'xlsx',
    bookSST: false,
    type: 'binary',
    cellStyles: true,
  });

  const buffer = s2ab(wbout) as ArrayBuffer;

  const blob = new Blob([await encryptFile(buffer)], {
    type: 'application/onctet-stream',
  });
  const FileSave = require('file-saver');
  return FileSave.saveAs(blob, fileName, {
    type: 'application/onctet-stream',
  });
};

export default importTestInfo;
