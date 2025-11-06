import { ApprovalEntry } from '..';

export type ViewComponentProps = {
  selectedNode: any;
  folderTreeData: any;
  onFolderTreeChange: () => any;
  toggleViewModel: (viewMode: 'minder' | 'list') => any;
  setApprovalEntry?: React.Dispatch<React.SetStateAction<ApprovalEntry>>;
  createTestApproval?: (isCheckCreateNext?: boolean) => any;
};
