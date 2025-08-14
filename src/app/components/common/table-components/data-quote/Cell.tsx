import { proximaSdk } from '@giteeteam/proxima-sdk-js';
import { EmptyField } from 'apps-team-components-v1';
import {
  currentDeleteState,
  dataQuoteState,
} from 'apps-team-components-v1/dist/lib/store/dataQuoteStore';
import { useAtom } from 'jotai';
import React, { useCallback, useEffect, useState } from 'react';

import useCellComponent from '../useCellComponent';
import DataQuoteActionCell from './ActionCell';
import cx from './index.module.less';

const DataQuoteCell = React.forwardRef((props: Record<string, any>, ref) => {
  const { overlayClsName, value, text, userData, property } = props;
  const { showDataNumber = 'N' } = property || {};
  const [dataList, setDataList] = useState(null);
  const [dataQuoteList] = useAtom(dataQuoteState);
  const [currentDeleteItem] = useAtom(currentDeleteState);
  const [defaultVisible, setDefaultVisible] = useState(true);
  useEffect(() => {
    if (dataQuoteList?.length) {
      setDataList(dataQuoteInit(dataQuoteList, text, userData?.display));
    } else if (value) {
      // todo 还有这种情况么？ 需要确认一下
      const isLabelValue = !!value?.[0]?.label;
      const sourceOptions = isLabelValue && !dataQuoteList?.length ? value : dataQuoteList;
      const targetValues = isLabelValue ? value.map(v => v.value) : value;
      const options = dataQuoteInit(sourceOptions, targetValues, userData?.display);
      setDataList(options);
    }
  }, [dataQuoteList, userData?.display, value, text, currentDeleteItem]);

  const showValue = dataList?.length ? dataList.map(item => item.label).join(',') : '';
  // 未编辑状态下的显示
  let cellDisplay = dataList?.length ? (
    dataList.map((item, index) => (
      <span key={item.value}>
        {item.label} {index === dataList.length - 1 ? '' : '、'}
      </span>
    ))
  ) : (
    <EmptyField readonly />
  );

  const showItemDataQuotoListModal = useCallback(() => {
    proximaSdk.execute('openItemDataQuoteListModal', {
      list: dataList?.map(item => item.value),
      visible: true,
    });
  }, [dataList]);

  // 测试管理依赖需求中，当数据引用值大于5，则显示数字， 这个条件
  if (showDataNumber === 'Y' && dataList?.length > 5) {
    cellDisplay = <a onClick={showItemDataQuotoListModal}>{dataList?.length}</a>;
  }

  const Component = useCellComponent({
    ref,
    cellWrapperClassnames: cx(overlayClsName, 'field-cell-layout'),
    RenderCell: () => {
      useEffect(() => {
        return () => {
          setDefaultVisible(false);
        };
      }, []);

      return (
        <div className="field-value-overlay">
          <span className="tooltip-overflow tooltip-maxline-1" title={showValue}>
            {cellDisplay}
          </span>
        </div>
      );
    },
    ActionCell: () => (
      <DataQuoteActionCell
        {...property}
        showDataNumber={showDataNumber}
        dataList={dataList}
        cellDisplay={cellDisplay}
        defaultVisible={defaultVisible}
        onDestroy={() => setDefaultVisible(false)}
      />
    ),
  });

  return <Component {...props} />;
});

DataQuoteCell.displayName = 'DataQuoteCell';
export default DataQuoteCell;
