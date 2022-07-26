import React, { useState } from 'react';
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
}

const Left: React.FC<LeftProps> = ({ showType, handleFolderSelect, scopedTestDetailIds }) => {
  const { workspaceKey } = usePageContext();
  const folderTreeRef = React.useRef<FolderTreeActionType>();

  const [foldSearchValue, setFoldSearchValue] = useState('');
  return (
    <>
      <SearchInput
        showInput
        allowClear
        className={cx('fold-search')}
        defaultValue={foldSearchValue}
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
