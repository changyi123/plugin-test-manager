import React, { useCallback } from 'react';
import { keyBy } from 'lodash';
import { Button, message } from 'antd';
import { getAllItemTypes } from '@/lib/api/proxima';
import { useDataContext, useCurrentTestConfig } from '../hooks';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { useRequest, useSafeState, useDrop, useDrag } from 'ahooks';
import { Chart, CustomField } from '@/lib/models';
import { components } from 'proxima-sdk';
import useI18n from '@/lib/hooks/useI18n';

const { ItemIcon } = components.Components.Common;

import cx from './index.less';
// import { toPointer } from '@/lib/utils/helper';

const ItemTypeDropBox = (props: {
  itemTypes: any[];
  type: 'moveIn' | 'moveOut';
  onDropSuccess?: (data: { key: string; type: 'moveIn' | 'moveOut' }) => void;
}) => {
  const { itemTypes, type, onDropSuccess } = props;
  // 拖拽类型
  const ItemTypeDragItem = ({ data }) => {
    const ref = React.useRef(null);
    useDrag({ type, key: data.key }, ref);
    return (
      <div className={cx('drag-item')} ref={ref}>
        <ItemIcon className={cx('icon')} icon={data.icon}></ItemIcon>
        <OverflowTooltip title={data.name}>
          <span>{data.name}</span>
        </OverflowTooltip>
      </div>
    );
  };

  const ref = React.useRef(null);
  useDrop(ref, {
    onDom(data) {
      if (data.type === type) return;
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
  const { t } = useI18n();
  const { workspace, globalConfig } = useDataContext();
  const workspaceKey = workspace?.key;
  const [defectsItemTypeKeys, setDefectsItemTypeKeys] = useSafeState([]);
  const testConfig = useCurrentTestConfig(workspaceKey);
  // const [checked, setChecked] = useSafeState(!!testConfig?.get('displayDefectBoard'));

  // React.useEffect(() => {
  //   if (testConfig?.get('displayDefectBoard')) {
  //     setChecked(testConfig?.get('displayDefectBoard'));
  //   }
  // }, [setChecked, testConfig]);

  React.useEffect(() => {
    setDefectsItemTypeKeys(testConfig?.get('defectsMapping') ?? []);
  }, [setDefectsItemTypeKeys, testConfig]);

  const { data } = useRequest(
    async () => {
      const itemTypes = await getAllItemTypes(!!globalConfig.extra.isolateTestType);
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

  const handleSave = useCallback(async () => {
    // const defectBoard = testConfig?.get('defectBoard');
    const itemTypes = Object.values(data).filter(item => defectsItemTypeKeys.includes(item.key));
    // const notSameItemTypes = itemTypes?.filter(
    //   d =>
    //     !defectBoard
    //       ?.get('itemTypes')
    //       ?.map(i => i.objectId)
    //       ?.includes(d.objectId),
    // )?.length;

    // 关联的缺陷类型同步至面板配置
    // if (notSameItemTypes) {
    //   const itemTypePointers = itemTypes.map(d => toPointer('ItemType', d.objectId));
    //   defectBoard.set('iql', `'类型' in ${JSON.stringify(itemTypes.map(d => d.name))}`);
    //   defectBoard.set('itemTypes', itemTypePointers);
    //   await defectBoard.save();
    // }

    // 空间配置 defectsMapping
    await testConfig.save({
      defectsMapping: defectsItemTypeKeys,
      // displayDefectBoard: checked,
    });

    const itemTypeField = await new Parse.Query(CustomField)
      .equalTo('key', 'itemType')
      .first()
      .then(item => item.toJSON());

    // 保存测试缺陷统计 iql
    const { charts } = testConfig.get('chartGroups')?.TestDefectChartGroup ?? {};
    const chartsObj = await new Parse.Query(Chart).containedIn('objectId', charts).findAll();
    const iql = `'${itemTypeField?.name}' in ${JSON.stringify(itemTypes.map(d => d.name))}`;
    const needToUpdateCharts = chartsObj.map(chart => {
      chart.set({
        option: {
          ...(chart.get('option') ?? {}),
          iql,
          selectors: itemTypeField
            ? {
                [itemTypeField.objectId]: {
                  component: 'ItemType',
                  expression: 'ItemType_Contain',
                  fieldId: itemTypeField.objectId,
                  fieldName: itemTypeField?.name,
                  key: 'itemType',
                  value: itemTypes.map(item => ({
                    value: item.objectId,
                    label: item.name,
                  })),
                },
              }
            : {},
        },
      });

      return chart;
    });

    await Parse.Object.saveAll(needToUpdateCharts);

    message.success(t('page.config.defectMapping.messageSuccess'));
  }, [data, defectsItemTypeKeys, testConfig, t]);

  return (
    <>
      <div className={cx('drop-container')}>
        {/* <Checkbox className={cx('check')} checked={checked} onChange={() => setChecked(x => !x)}>
          显示缺陷管理面板
        </Checkbox> */}
        <div className={cx('drop-area')}>
          <h6>{t('page.config.defectMapping.usableType')}</h6>
          <ItemTypeDropBox
            type="moveOut"
            onDropSuccess={handleDropSuccess}
            itemTypes={assignItemTypeByKeys(
              Object.keys(itemTypeMapping).filter(key => !defectsItemTypeKeys.includes(key)),
            )}
          />
        </div>
        <div className={cx('drop-area')}>
          <h6>{t('page.config.defectMapping.defectType')}</h6>
          <ItemTypeDropBox
            type="moveIn"
            onDropSuccess={handleDropSuccess}
            itemTypes={assignItemTypeByKeys(defectsItemTypeKeys)}
          />
        </div>
      </div>
      <Button type="primary" className={cx('action-btn')} onClick={handleSave}>
        {t('common.save')}
      </Button>
    </>
  );
};

export default DefectMapping;
