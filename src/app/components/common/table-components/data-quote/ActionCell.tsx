import { proximaSdk } from '@giteeteam/proxima-sdk-js';
import { message } from 'antd';
import React, { Fragment, useEffect, useMemo, useState } from 'react';

import OverflowTooltip from '@/components/common/OverflowTooltip';
import useI18n from '@/lib/hooks/useI18n';

import { overlayTagStyle } from './styles';
import type { selectValue } from './types';

interface DataQuoteActionCellProps {
  dataList?: selectValue[];
  cellDisplay: React.ReactElement;
  onDestroy: () => void;
  defaultVisible: boolean;
  showDataNumber?: string | undefined;
  verticalShow?: string | undefined;
}

const DataQuoteActionCell: React.FC<DataQuoteActionCellProps> = props => {
  const { t } = useI18n();

  const [currentItem, setCurrentItem] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { dataList, cellDisplay, onDestroy, showDataNumber = 'N', verticalShow = 'N' } = props;
  // 是否多行显示, 如果是， 则使用div
  const multiLineShow = useMemo(() => {
    return verticalShow === 'Y';
  }, [verticalShow]);

  const DynamicTag = useMemo(() => {
    return !multiLineShow ? 'span' : 'div';
  }, [multiLineShow]);

  useEffect(() => {
    return () => {
      onDestroy();
    };
  }, [onDestroy]);

  // 打开详情
  const openDrawer = async item => {
    setCurrentItem(item.value);
    setIsLoaded(false);
    const itemData = await new Parse.Query('Item').equalTo('objectId', item.value).first();
    setIsLoaded(true);
    if (itemData) {
      proximaSdk.execute('openItemViewScreen', item.value);
    } else {
      message.error(t('message.fields.noDataRefresh'));
    }
  };
  return (
    <div className="field-value-overlay">
      <OverflowTooltip
        overlayClassName={overlayTagStyle}
        ignoreOverFlow={true}
        title={
          dataList &&
          (showDataNumber === 'N' || (showDataNumber === 'Y' && dataList?.length <= 5)) &&
          dataList.map((item, index) => (
            <Fragment key={item.value}>
              <DynamicTag
                data-drawer-handle-target
                key={item.value}
                onClick={() => openDrawer(item)}
                // 防止请求未返回时重复调用
                className={`${
                  currentItem === item.value && !isLoaded ? 'custom-disabled' : ''
                } pointer`}
              >
                {item.label}
              </DynamicTag>
              {!multiLineShow ? index !== dataList.length - 1 && '，' : null}
            </Fragment>
          ))
        }
      >
        {cellDisplay}
      </OverflowTooltip>
    </div>
  );
};

DataQuoteActionCell.displayName = 'DataQuoteActionCell';
export default DataQuoteActionCell;
