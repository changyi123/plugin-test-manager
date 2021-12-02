import React from 'react';
import cx from './index.less';
import { Item } from '@/lib/types/App';
import { Tooltip } from '@osui/ui';
import { ItemType as ItemTyped, Status as StatusType } from '@/lib/types/App';
import { useDrag } from 'ahooks';
import { openTestMenu, MenuKey } from '../Menu';

type TestCaseProps = Item & {
  children?: React.ReactNode;
  selectedFolderKey: string;
};

const TestCase: React.FC<TestCaseProps> = ({
  key,
  name,
  objectId: itemId,
  selectedFolderKey,
  status: _status,
  itemType: _itemType,
}) => {
  const itemType = _itemType as ItemTyped;
  const status = _status as StatusType;
  const handleContextMenu = React.useCallback(e => {
    openTestMenu(e.target, {
      x: e.clientX,
      y: e.clientY,
      onClick(key: MenuKey) {
        if (key === MenuKey.viewTestCase) {
          // TODO: proxima sdk
        }
      },
    });
    e.preventDefault();
  }, []);

  const getDragProps = useDrag();

  return (
    <div
      className={cx('test-case')}
      {...getDragProps({
        itemId,
        selectedFolderKey,
      })}
      onContextMenu={handleContextMenu}
    >
      <div className={cx('row')}>
        <Tooltip title={`事项类型：${itemType.name}`}>
          {itemType.icon ? (
            <img className={cx('item-type')} alt={itemType.name} src={itemType.icon} />
          ) : null}
        </Tooltip>
        <a className={cx('item-key')}>{key}</a>
        <span className={cx('item-name')}>{name}</span>
      </div>
      <div className={cx('row', 'bottom')}>
        <Tooltip title={`状态：${status.name}`}>
          <span className={cx('status', status.type)}>{status.name}</span>
        </Tooltip>
      </div>
    </div>
  );
};

export default React.memo(TestCase);
