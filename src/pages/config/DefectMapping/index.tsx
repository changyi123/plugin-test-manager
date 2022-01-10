import React from 'react';
import { keyBy } from 'lodash';
import { Button, message } from '@osui/ui';
import { getAllItemTypes } from '@/lib/api/proxima';
import { useRequest, useSafeState, useDrop, useDrag } from 'ahooks';
import { useSelectedWorkspace, useCurrentTestConfig } from '../hooks';

import cx from './index.less';

const ItemTypeDropBox = (props: {
  itemTypes: any[];
  type: 'moveIn' | 'moveOut';
  onDropSuccess?: (data: { key: string; type: 'moveIn' | 'moveOut' }) => void;
}) => {
  const { itemTypes, type, onDropSuccess } = props;
  // 拖拽事项类型
  const ItemTypeDragItem = ({ data }) => {
    const ref = React.useRef(null);
    useDrag({ type, key: data.key }, ref);
    return (
      <div className={cx('drag-item')} ref={ref}>
        <img src={data.icon} className={cx('icon')} />
        <span>{data.name}</span>
      </div>
    );
  };

  const ref = React.useRef(null);
  useDrop(ref, {
    onDom(data) {
      onDropSuccess?.(data);
    },
  });
  return (
    <div className={cx('drop-box')} ref={ref}>
      {itemTypes.map(itemType => (
        <ItemTypeDragItem key={itemType.key} data={itemType} />
      ))}
    </div>
  );
};

const DefectMapping = () => {
  const [workspace] = useSelectedWorkspace();
  const workspaceKey = workspace?.key;
  const [defectsItemTypeKeys, setDefectsItemTypeKeys] = useSafeState([]);

  const testConfig = useCurrentTestConfig(workspaceKey);

  React.useEffect(() => {
    setDefectsItemTypeKeys(testConfig?.get('defectsMapping') ?? []);
  }, [setDefectsItemTypeKeys, testConfig]);

  const { data } = useRequest(
    async () => {
      const itemTypes = await getAllItemTypes();
      return keyBy(
        itemTypes.map(item => item.toJSON()),
        'key',
      );
    },
    {
      cacheKey: 'itemTypeMapping',
      cacheTime: 9999999999,
      staleTime: 9999999999,
    },
  );

  const itemTypeMapping = React.useMemo(() => data ?? {}, [data]);

  // 填充 itemType
  const assignItemTypeByKeys = React.useCallback(
    itemTypeKeys => {
      return itemTypeKeys.map(key => itemTypeMapping[key]).filter(Boolean);
    },
    [itemTypeMapping],
  );

  const handleDropSuccess = ({ type, key }) => {
    if (type === 'moveIn') {
      setDefectsItemTypeKeys(keys => keys.filter(item => item !== key));
    } else if (type === 'moveOut') {
      setDefectsItemTypeKeys(keys => keys.concat(key));
    }
  };

  const handleSave = () => {
    testConfig.save({
      defectsMapping: defectsItemTypeKeys,
    });
    message.success('缺陷类型保存成功');
  };

  return (
    <>
      <div className={cx('drop-container')}>
        <div className={cx('drop-area')}>
          <h6>可用事项类型</h6>
          <ItemTypeDropBox
            type="moveOut"
            onDropSuccess={handleDropSuccess}
            itemTypes={assignItemTypeByKeys(
              Object.keys(itemTypeMapping).filter(key => !defectsItemTypeKeys.includes(key)),
            )}
          />
        </div>
        <div className={cx('drop-area')}>
          <h6>缺陷类型</h6>
          <ItemTypeDropBox
            type="moveIn"
            onDropSuccess={handleDropSuccess}
            itemTypes={assignItemTypeByKeys(defectsItemTypeKeys)}
          />
        </div>
      </div>
      <Button type="primary" className={cx('action-btn')} onClick={handleSave}>
        保存
      </Button>
    </>
  );
};

export default DefectMapping;
