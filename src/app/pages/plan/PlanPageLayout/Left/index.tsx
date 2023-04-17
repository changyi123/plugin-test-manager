import React, { useImperativeHandle, useState } from 'react';
import SearchInput from '@/components/business/SearchInput';
import RepositoryFolderTree, {
  ActionType as FolderTreeActionType,
} from '@/components/business/RepositoryFolderTree';
import { usePageContext } from '../../hook';
import useI18n from '@/lib/hooks/useI18n';
import { QueryLinkedTestEntityPayload } from 'common/types/api';

import cx from './index.less';

interface LeftProps {
  showType?: string;
  actionRef?: any;
  activeType?: string;
  treeParams?: QueryLinkedTestEntityPayload;
  /** 目录被选中 */
  onFolderSelect?: (node?: any) => void;
}

const Left: React.FC<LeftProps> = ({ actionRef, treeParams, onFolderSelect }) => {
  const { t } = useI18n();
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
        placeholder={t('page.plan.planPageLayout.left.placeholder')}
        onChange={val => setFoldSearchValue(val)}
        onSearch={val => {
          folderTreeRef.current.filterFolder(val);
        }}
      />
      <div className={cx('tree-box')}>
        <RepositoryFolderTree
          hideEmptyFolder
          actionRef={folderTreeRef}
          workspaceKey={workspaceKey}
          params={treeParams}
          onFolderSelect={onFolderSelect}
        />
      </div>
    </>
  );
};

export default Left;
