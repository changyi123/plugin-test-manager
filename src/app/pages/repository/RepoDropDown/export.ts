import { utils as xlsxUtils, write as xlsxWrite } from 'sheetjs-style';
import FileSave from 'file-saver';
import Parse from '@/lib/parse';
import { TestLinkType, TestType, TestTypeNameMapping } from '@/lib/constants';
import { CustomField, TestConfig } from '@/lib/models';
import { Item } from '@/lib/types/App';
import { Step } from '@/lib/types/Test';
import { getRepositoryData } from '@/lib/api/repository';
import { escapeHtmlString } from '@/lib/utils/helper';
import { getRepoData, handleRepoPath } from '@/components/business/RepositoryGroup/repository';
import { UNGROUPED_FOLDER_KEY } from '../constant';
import { arrayToTree } from '@/lib/utils/arrayToTree';
import { getCustomFields } from '@/lib/api/proxima';
import { SYSTEM_FIELD } from '@/lib/constants';
import { difference } from 'lodash';
import { traverseTreeNodes, getTreeNodeByKey } from '../util';
import { getLinkedTestEntityByQuery, getTestEntityByQuery } from '@/lib/api/item';

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
}

const getTestPriorityInfo = async (filedKey: string) => {
  const query = new Parse.Query(CustomField).equalTo('key', filedKey);
  const data = await query.find();

  return data.map(d => d.toJSON()).find(d => d.key === filedKey);
};

const getItemStatus = async () => {
  const query = new Parse.Query(TestConfig).equalTo('global', true);
  const data = await query.find();

  return data
    .map(d => d.toJSON())
    .reduce((prev, cur) => {
      cur?.extra?.statuses?.forEach(c => {
        prev.set(c.key, c.name);
      });

      return prev;
    }, new Map());
};

const getTestGroupPath = (path?: string) => ({
  所属分组: path ?? '',
});

const getStatus = (statusMap: any, status?: Record<string, string>, planId?: string) =>
  planId
    ? {
        最新执行状态: statusMap.get(status?.[planId] || 'TODO') ?? '未开始',
      }
    : {};

const getTestPlan = planData => {
  return {
    测试计划: planData?.name ?? '',
  };
};

/** 获取导出 excel 表数据 */
const getExcelData = async (data: any) => {
  const { results, repoData, workspaceKey, planId } = data;
  const priorityInfo = await getTestPriorityInfo('priority');
  const itemStatus = await getItemStatus();
  const repoDataMap = new Map();

  const _repoData =
    repoData ??
    (await getRepositoryData(
      results.reduce(
        (prev, cur) => {
          !prev.includes(cur.workspace.key) && (prev = prev.concat(cur.workspace.key));

          return prev.filter(Boolean);
        },
        [workspaceKey],
      ),
    ));

  handleRepoPath(getRepoData(_repoData)).forEach(d => {
    repoDataMap.set(d.objectId, d.path);
  });

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

  return results.map(item => ({
    ...testPlanObj,
    ...getTestGroupPath(repoDataMap.get(item.repository)),
    ...getItemInfo(item, priorityInfo, item.type),
    ...getTestInfo(item),
    ...getStatus(itemStatus, item.caseStatus, planId),
  }));
};

/** 获取测试用例数据 */
const getTestInfo = data => ({
  ...getTestInfoByDetail(data.detail),
});

const getTestInfoByDetail = (detail: { steps?: Step[]; precondition?: string }) => ({
  前置条件: detail?.precondition ?? '',
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
    步骤描述: data?.action?.map(d => d.replace(/\n*/g, '')).join(BreakLineCode) ?? '',
    预期结果: data?.result?.map(d => d.replace(/\n*/g, '')).join(BreakLineCode) ?? '',
    数据: data?.data?.map(d => d.replace(/\n*/g, '')).join(BreakLineCode) ?? '',
  };
};

/** 获取负责人 */
const getAssignee = (values?: Record<string, unknown>): string =>
  (Array.isArray(values?.assignee) ? values?.assignee : [])
    ?.map(val => (val.value ? val.username : ''))
    .filter(Boolean)
    .join(',') ?? '';

/** 获取优先级 */
const getPriority = (values?: Record<string, unknown>, priInfo?: any) =>
  priInfo?.data.customData.find(list => list.key === values?.priority)?.name ?? '';

/** 获取事项数据 */
const getItemInfo = (item: Item, priInfo: any, type: string) => ({
  标题: item.name,
  类型: TestTypeNameMapping?.[type],
  负责人: getAssignee(item?.values),
  优先级: getPriority(item?.values, priInfo),
});

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
  const { type, checkedId, workspace } = args;

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
    });
  } else {
    let checkRepoKeys = typeof checkedId === 'string' ? [checkedId] : [];
    const repoData = await getRepositoryData([workspace.key]);

    // 导出当前分组及其字分组，需要特殊处理 repository 数据
    if (type === 'exportChildGroup' && checkedId !== UNGROUPED_FOLDER_KEY) {
      // 查询当前分组下的所有子分组 id
      const folderTree = arrayToTree(
        repoData.map(repo => ({
          name: repo.name,
          key: repo.objectId,
          parentKey: repo.parent?.objectId ?? null,
          workspaceKey: repo.workspaceKey,
        })),
      );
      let childRepoKeys = [];
      // 获取当前分组下的所有子分组
      traverseTreeNodes([getTreeNodeByKey(folderTree, checkedId)], node => {
        childRepoKeys = childRepoKeys.concat(node.key);
      });

      checkRepoKeys = childRepoKeys;
    }

    // 用例库导出不允许跨空间
    const { list: results } = await getTestEntityByQuery({
      query: {
        type: TestType.Case,
        workspaceKey: workspace.key,
        repository:
          type === 'exportAll' || checkedId === UNGROUPED_FOLDER_KEY ? null : checkRepoKeys,
      },
      limit: 9999,
    });

    let _results = null;
    if (checkedId === UNGROUPED_FOLDER_KEY && type !== 'exportAll') {
      _results = results.filter(d => !d?.repository?.length);
    }

    excelData = await getExcelData({ results: _results ?? results, repoData });
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
export const downloadExampleFile = async (fieldKeys, t) => {
  // 获取需要导出的自定义字段
  const SystemFieldKeys = Object.values(SYSTEM_FIELD);
  const CustomFieldKeys = difference(fieldKeys, SystemFieldKeys);
  const CustomFields = await getCustomFields(CustomFieldKeys);
  const ExportCustomFields = CustomFields.reduce((res, field) => {
    return {
      ...res,
      [field.name]: t('page.repository.repoDropDown.pleaseEnterContent'),
    };
  }, {});
  exportExcelFile(
    [
      {
        ...(t('page.repository.repoDropDown.excelContent') ?? {}),
        // 所属分组: '分组1/分组2',
        // 标题: '测试用例标题（样例数据，执行用例导入时请删除该数据）',
        // 类型: '测试用例',
        // 优先级: '优先级可填值范围：最高，较高，普通，较低，最低',
        // 前置条件: '测试用例前置条件',
        // 负责人: '用户名',
        // 步骤描述: '【1】需要以【序号】开头\n【2】步骤描述中换行符会被保留',
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

/** 导出用例数据 */
const exportExcelFile = (array: any[], sheetName = 'sheet1', fileName = 'example.xlsx', t) => {
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
          { wch: 10 }, // 第四列
          { wch: 30 }, // 第五列
          { wch: 50 }, // 第六列
          { wch: 50 }, // 第七列
          { wch: 50 }, // 第八列
          { wch: 20 }, // 第九列
          { wch: 20 }, // 第十列
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

  return FileSave.saveAs(
    new Blob([s2ab(wbout) as any], {
      type: 'application/onctet-stream',
    }),
    fileName,
  );
};

export default importTestInfo;
