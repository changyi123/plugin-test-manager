import * as xlsx from 'xlsx';
import xlsxStyle from 'xlsx-style';
import FileSave from 'file-saver';
import Parse from '@/lib/parse';
import { getTestEntitiesByQuery } from '@/lib/api/common';
import { TestType } from '@/lib/constants';
import { CustomField, TestConfig, TestRelation } from '@/lib/models';
import { Item } from '@/lib/types/App';
import { Step } from '@/lib/types/Test';
import { clone } from 'lodash';
import { getFolderTree, getRepositoryData } from '@/lib/api/repository';
import { traverseTreeNodes } from '../hook';
import { ROOT_FOLDER_KEY } from '../constant';
import { escapeHtmlString } from '@/lib/utils/helper';

export type TreeNode = {
  key: string;
  name: string;
  title: React.ReactNode;
  parentId: string | null;
  testDetailIds: string[];
  children: TreeNode[];
};

type ITreeNode = TreeNode & {
  path?: string;
};

// const OSnow = () => {
//   const agent = navigator.userAgent.toLowerCase();
//   const isMac = /macintosh|mac os x/i.test(navigator.userAgent);

//   if (agent.indexOf('win32') >= 0 || agent.indexOf('wow32') >= 0) {
//     return 'win32';
//   }
//   if (agent.indexOf('win64') >= 0 || agent.indexOf('wow64') >= 0) {
//     return 'win64';
//   }
//   if (isMac) {
//     return 'mac';
//   }
// };

const treeToArray = (datas: any[]): any[] =>
  clone(datas).reduce((prev, cur) => {
    prev = prev.concat(cur);

    if (cur.children?.length) {
      prev = prev.concat(treeToArray(cur.children));
    }
    return prev;
  }, []);

interface ImportArgs {
  type: string;
  checkedId: string;
  workspace: Record<string, any>;
  treeData?: TreeNode[];
}

const getPath = (curObj: any, pObj?: any): string =>
  !pObj ? curObj.name : `${pObj.path}/${curObj.name}`;

const handleTreeData = (treeDatas: ITreeNode[], parentData?: ITreeNode): ITreeNode[] => {
  treeDatas.forEach(tree => {
    tree.path = getPath(tree, parentData);

    if (tree.children?.length) {
      tree.children = handleTreeData(tree.children, tree);
    }
  });

  return treeDatas;
};

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

// const getGroupPath = (repoData: any[], objectId: string) => {
//   const groupName = repoData.find(repo => repo.testDetailIds.includes(objectId))?.path;

//   return {
//     所属分组: groupName === '未分组用例' ? '' : groupName,
//   };
// };

const getTestGroupPath = (repoData: any[], objectId?: string) => {
  const repoObj = repoData.find(d => d.objectId === objectId);

  return {
    所属分组: repoObj?.path ?? '',
  };
};

const getStatus = (statusMap: any, status?: string) => ({
  最新执行状态: statusMap.get(status || 'TODO') ?? '未开始',
});

/** 获取导出 excel 表数据 */
// const getExcelData = async (datas: any[], repoData: any[]) => {
//   const priorityInfo = await getTestPriorityInfo('priority');
//   const itemStatus = await getItemStatus();

//   return datas.map(test => ({
//     ...getGroupPath(repoData, test.objectId),
//     ...getItemInfo(test.reference, priorityInfo),
//     ...getTestInfo(test),
//     ...getStatus(itemStatus, test.status),
//   }));
// };

const getTestPlan = planData => {
  return {
    测试计划: planData?.reference.name ?? '',
  };
};

const getExcelData = async (datas: any[], repoData: any[], query?: any) => {
  const priorityInfo = await getTestPriorityInfo('priority');
  const itemStatus = await getItemStatus();

  let testPlanObj = {};

  if (query) {
    const { results: testPlan } = await getTestEntitiesByQuery(
      {
        type: TestType.TestPlan,
        workspaceKey: query.workspaceKey,
        in: [query.planId],
      },
      {
        limit: 9999,
      },
    );

    testPlanObj = getTestPlan(testPlan[0]);
  }

  return datas.map(test => ({
    ...testPlanObj,
    ...getTestGroupPath(repoData, test.repository.objectId),
    ...getItemInfo(test.reference, priorityInfo),
    ...getTestInfo(test),
    ...getStatus(itemStatus, test.status),
  }));
};

/** 获取测试用例数据 */
const getTestInfo = data => {
  return {
    ...getTestInfoByDetail(data.detail),
  };
};

const getTestInfoByDetail = (detail: { steps?: Step[]; precondition?: string }) => {
  return {
    前置条件: detail?.precondition ?? '',
    ...getSteps(detail?.steps),
  };
};

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

  return {
    步骤描述: data?.action.join('') ?? '',
    预期结果: data?.result.join('') ?? '',
    数据: data?.data.join('') ?? '',
  };
};

/** 获取负责人 */
const getAssignee = (values?: Record<string, unknown>): string =>
  (values?.assignee as any[])
    ?.map(val => (val.value ? val.username : ''))
    .filter(Boolean)
    .join(',') ?? '';

/** 获取优先级 */
const getPriority = (values?: Record<string, unknown>, priInfo?: any) =>
  priInfo?.data.customData.find(list => list.key === values?.priority)?.name ?? '';

/** 获取事项数据 */
const getItemInfo = (datas: Item, priInfo: any) => ({
  标题: datas.name,
  负责人: getAssignee(datas?.values),
  优先级: getPriority(datas?.values, priInfo),
});

const getIds = (childrens: ITreeNode[], data: string[]) =>
  childrens.reduce((prev, cur) => {
    let _prev = prev.concat(cur.testDetailIds);
    if (cur.children) {
      _prev = getIds(cur.children, _prev);
    }

    return _prev;
  }, data);

const getCurTestDetailIds = (testRepoData, folderKey) => {
  const curTestRepo = testRepoData.find(groups => groups.key === folderKey);

  return getIds(curTestRepo?.children ?? [], curTestRepo?.testDetailIds ?? []);
};

const getTreeData = async (workspaceKey: string) => {
  // 获取当前空间内所有的测试实体
  const getAllTestDetailEntityIds = async spaceKey => {
    const { results: data } = await getTestEntitiesByQuery(
      {
        type: TestType.TestDetail,
        workspaceKey: spaceKey,
      },
      {
        limit: 99999,
        include: [],
        select: ['objectId'],
      },
    );

    return data.map(item => item.objectId);
  };
  const [treeNodes, allTestDetailIds] = await Promise.all([
    getFolderTree(workspaceKey),
    getAllTestDetailEntityIds(workspaceKey),
  ]);

  const allTestDetailIdSet = new Set<string>(allTestDetailIds);
  traverseTreeNodes(treeNodes, node => {
    // 测试实体在测试模块内只能被关联一次
    node.testDetailIds = node.testDetailIds.filter(id => {
      if (allTestDetailIdSet.has(id)) {
        allTestDetailIdSet.delete(id);
        return true;
      }
      return false;
    });
  });

  const RootFolder = {
    key: ROOT_FOLDER_KEY,
    name: '未分组用例',
    title: '未分组用例',
    parentId: null,
    testDetailIds: Array.from(allTestDetailIdSet),
    children: [],
  };

  return [RootFolder].concat(treeNodes);
};

const getTestIdsByFrom = async (id: string) => {
  const query = new Parse.Query(TestRelation).equalTo('from', id).limit(9999);
  const data = await query.find();

  return data
    .reduce((prev, cur) => {
      prev = prev.concat(cur.toJSON().to?.objectId);
      return prev;
    }, [])
    .filter(Boolean);
};

/** 导出用例 */
const importTestInfo = async (args: ImportArgs, excelData = []) => {
  const { type, treeData, checkedId, workspace } = args;

  if (type === 'exportPlan') {
    // 获取用例库数据，数据包含 path 用例库路径,允许跨空间
    const repoData = await getRepositoryData();

    // 获取当前测试计划下的测试用例
    const testDataIds = await getTestIdsByFrom(checkedId);
    // 获取测试用例,允许跨空间
    const { results } = await getTestEntitiesByQuery(
      {
        type: TestType.TestDetail,
        // workspaceKey: workspace.key,
        in: testDataIds,
      },
      {
        limit: 9999,
      },
    );

    excelData = await getExcelData(results, repoData, {
      workspaceKey: workspace.key,
      planId: checkedId,
    });
  } else {
    const _treeData = treeData ?? (await getTreeData(workspace.key));

    const testRepoData = treeToArray(handleTreeData(clone(_treeData)));

    const { results } = await getTestEntitiesByQuery(
      Object.assign(
        {
          type: TestType.TestDetail,
          workspaceKey: workspace.key,
        },
        type === 'exportGroup'
          ? {
              in: getCurTestDetailIds(testRepoData, checkedId),
            }
          : {},
      ),
      {
        limit: 9999,
      },
    );

    excelData = await getExcelData(results, testRepoData);
  }

  exportExcelFile(excelData, 'sheet1', `测试管理导出-${workspace.name}.xlsx`);
};

/** 下载 excel 用例导出文件 */
export const downloadExampleFile = async () => {
  exportExcelFile(
    [
      {
        所属分组: '分组1/分组2',
        标题: '测试用例标题（样例数据，执行用例导入时请删除该数据）',
        优先级: '优先级可填值范围：最高，较高，普通，较低，最低',
        前置条件: '测试用例前置条件',
        负责人: '用户名',
        步骤描述: '【1】需要以【序号】开头\n【2】步骤描述中换行符会被保留',
        预期结果: '【1】需要以【序号】开头\n【2】预期结果中换行符会被保留',
        数据: '【1】需要以【序号】开头\n【2】数据中换行符会被保留',
      },
    ],
    'sheet1',
    `测试管理导入模板.xlsx`,
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
const exportExcelFile = (array: any[], sheetName = 'sheet1', fileName = 'example.xlsx') => {
  const defaultCellStyle = {
    font: {
      name: '宋体',
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

  const jsonWorkSheet = Object.entries(xlsx.utils.json_to_sheet(array)).reduce(
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

  const wbout = xlsxStyle.write(
    workBook,
    {
      bookType: 'xlsx',
      bookSST: false,
      type: 'binary',
      cellStyles: true,
    },
    {
      defaultCellStyle,
    },
  );

  return FileSave.saveAs(
    new Blob([s2ab(wbout) as any], {
      type: 'application/onctet-stream',
    }),
    fileName,
  );
};

export default importTestInfo;
