// import * as xlsx from 'xlsx';

export type TreeNode = {
  key: string;
  name: string;
  title: React.ReactNode;
  parentId: string | null;
  testDetailIds: string[];
  children: TreeNode[];
};

interface ImportArgs {
  type: string;
  workspace: string;
  folderKey: string;
  treeData: TreeNode[];
}

// 1、导出全量数据
//    a、查询所有当前空间下的 test 数据
// 2、导出当前分组
//    a、根据选中分组信息，查询当前分组下的所有 testIds
//    b、根据 testIds 查询出 test 数据
// const getTestIdsByFolderKey = (treeData?: TreeNode[], key?: string) => {
//   // treeData
// };

const importFn = (args: ImportArgs) => {
  const { type, folderKey, treeData } = args;
  // eslint-disable-next-line no-console
  console.log(1111, type, folderKey, treeData);

  if (type === 'exportAll') {
    //   const testIds = getTestIdsByFolderKey(treeData, folderKey)
  }
};

export default importFn;
