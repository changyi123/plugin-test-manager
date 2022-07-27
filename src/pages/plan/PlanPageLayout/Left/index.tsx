import React, { useImperativeHandle, useState } from 'react';
import SearchInput from '@/components/business/SearchInput';
import RepositoryFolderTree, {
  ActionType as FolderTreeActionType,
} from '@/components/business/RepositoryFolderTree';
import { usePageContext } from '../../hook';

import cx from './index.less';

interface LeftProps {
  showType?: string;
  handleFolderSelect?: (val: string[]) => void;
  scopedTestDetailIds?: string[];
  actionRef?: any;
}

const Left: React.FC<LeftProps> = ({
  showType,
  handleFolderSelect,
  scopedTestDetailIds,
  actionRef,
}) => {
  const { workspaceKey } = usePageContext();
  const folderTreeRef = React.useRef<FolderTreeActionType>();

  const [foldSearchValue, setFoldSearchValue] = useState('');

  useImperativeHandle(actionRef, () => ({
    reset: () => {
      setFoldSearchValue('');
      folderTreeRef.current.restFilter();
    },
    refresh: () => {
      folderTreeRef.current?.refresh();
    },
  }));

  return (
    <>
      <SearchInput
        showInput
        allowClear
        className={cx('fold-search')}
        value={foldSearchValue}
        placeholder={'请输入用例库标题'}
        onChange={val => setFoldSearchValue(val)}
        onSearch={val => {
          folderTreeRef.current.filterFolder(val);
        }}
      />
      <div className={cx('tree-box')}>
        <RepositoryFolderTree
          actionRef={folderTreeRef}
          shouldIncludeSubFolder={showType === 'showChild'}
          workspaceKey={workspaceKey}
          onFolderSelect={handleFolderSelect}
          scopedTestDetailIds={scopedTestDetailIds}
        />
      </div>
    </>
  );
};

export default Left;
