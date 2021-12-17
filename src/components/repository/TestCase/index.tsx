import React from 'react';
import cx from './index.less';
import { Item } from '@/lib/types/App';
import { Tooltip } from '@osui/ui';
import { ItemType as ItemTyped, Status as StatusType } from '@/lib/types/App';
import { useDrag } from 'ahooks';
import { openTestMenu, MenuKey } from '../Menu';
import { useBaseAction } from '@/lib/hooks/useContext';

type TestCaseProps = Item & {
  selectedFolderKey: string;
  children?: React.ReactNode;
};

const TestCase: React.FC<TestCaseProps> = ({
  key,
  name,
  status: _status,
  objectId: itemId,
  selectedFolderKey,
  itemType: _itemType,
}) => {
  const itemType = _itemType as ItemTyped;
  const status = _status as StatusType;
  const { openItemViewPanel } = useBaseAction();
  const handleContextMenu = React.useCallback(
    (e, data) => {
      openTestMenu(e.target, {
        x: e.clientX,
        y: e.clientY,
        onClick(key: MenuKey) {
          if (key === MenuKey.viewTest) {
            openItemViewPanel(data.itemId);
          } else if (key === MenuKey.deleteTest) {
            console.info('删除测试用例');
          }
        },
      });
      e.preventDefault();
    },
    [openItemViewPanel],
  );

  return (
    <div className={cx('test-case')} onContextMenu={e => handleContextMenu(e, { itemId })}>
      <div className={cx('row')}>
        <Tooltip title={`事项类型：${itemType.name}`}>
          {itemType.icon ? (
            <img className={cx('item-type')} alt={itemType.name} src={itemType.icon} />
          ) : null}
        </Tooltip>
        <a className={cx('item-key')}>{key}</a>
        <a className={cx('item-name')} onClick={() => openItemViewPanel(itemId)}>
          {name}
        </a>
      </div>
      <div className={cx('row', 'bottom')}>
        <Tooltip title={`状态：${status?.name}`}>
          <span className={cx('status', status?.type)}>{status?.name}</span>
        </Tooltip>
      </div>
    </div>
  );
};

export default React.memo(TestCase);
