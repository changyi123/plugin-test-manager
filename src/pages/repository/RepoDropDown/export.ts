import * as xlsx from 'xlsx';
import xlsxStyle from 'xlsx-style';
import FileSave from 'file-saver';
import Parse from '@/lib/parse';
import { getTestEntitiesByQuery } from '@/lib/api/common';
import { TestType } from '@/lib/constants';
import { CustomField, TestConfig } from '@/lib/models';
import { Item } from '@/lib/types/App';
import { Step } from '@/lib/types/Test';
import { clone } from 'lodash';

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
  workspaceKey: string;
  folderKey: string;
  treeData: TreeNode[];
  workspaceName: string;
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
      cur.status.forEach(c => {
        prev.set(c.key, c.name);
      });

      return prev;
    }, new Map());
};

const getGroupPath = (repoData: any[], objectId: string) => {
  const groupName = repoData.find(repo => repo.testDetailIds.includes(objectId))?.path;

  return {
    所属分组: groupName === '未分组用例' ? '' : groupName,
  };
};

const getStatus = (statusMap: any, status?: string) => ({
  最新执行状态: statusMap.get(status || 'TODO') ?? '',
});

/** 获取导出 excel 表数据 */
const getExcelData = async (datas: any[], repoData: any[]) => {
  const priorityInfo = await getTestPriorityInfo('priority');
  const itemStatus = await getItemStatus();

  return datas.map(test => ({
    ...getGroupPath(repoData, test.objectId),
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
    前置条件: detail.precondition ?? '',
    ...getSteps(detail.steps),
  };
};

const getSteps = (steps?: Step[]) => {
  const data = steps
    .filter(d => !d.callTestId)
    ?.reduce(
      (prev, cur, index) => {
        prev = {
          action: prev.action.concat(`【${index + 1}】${cur.action}`),
          result: prev.action.concat(`【${index + 1}】${cur.result}`),
        };

        return prev;
      },
      {
        action: [],
        result: [],
      },
    );

  return {
    步骤描述: data.action.join('\r\n') ?? '',
    预期结果: data.result.join('\r\n') ?? '',
  };
};

/** 获取负责人 */
const getAssignee = (values?: Record<string, unknown>): string =>
  (values?.assignee as any[])?.map(val => val.username).join(',') ?? '';

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

  return getIds(curTestRepo.children ?? [], curTestRepo.testDetailIds ?? []);
};

/** 导出用例 */
const importTestInfo = async (args: ImportArgs, excelData = []) => {
  const { type, treeData, folderKey, workspaceKey, workspaceName } = args;

  const testRepoData = treeToArray(handleTreeData(clone(treeData)));

  const { results } = await getTestEntitiesByQuery(
    Object.assign(
      {
        type: TestType.TestDetail,
        workspaceKey: workspaceKey,
      },
      type === 'exportCurrentGroup'
        ? {
            in: getCurTestDetailIds(testRepoData, folderKey),
          }
        : {},
    ),
    {
      limit: 9999,
    },
  );

  excelData = await getExcelData(results, testRepoData);

  exportExcelFile(excelData, 'sheet1', `测试管理导出-${workspaceName}.xlsx`);
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
          { wch: 20 }, // 第八列
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
