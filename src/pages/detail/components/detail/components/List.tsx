import React, { useState } from 'react';
import { Button, Input } from '@osui/ui';
import {
  ShrinkOutlined,
  DragOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  UnorderedListOutlined,
  DeleteOutlined,
} from '@ant-design/icons';

import { TestStep } from '../';
import css from './List.less';

const { TextArea } = Input;

interface ListProps {
  item: TestStep;
  itemLen: number;
}

const List: React.FC<ListProps> = (props: ListProps) => {
  const { item, itemLen } = props;

  function editItem() {
    setEdit(true);
  }

  const [edit, setEdit] = useState<boolean>(false);
  const [itemBak, setItemBak] = useState<TestStep>(item);
  const { action, data, result, index } = itemBak; //attachments, customFields

  return (
    <>
      <div className={css('detail-list')}>
        <div className={css('nav')}>
          {index !== 0 && (
            <div className={css('nav__drag')}>
              <ArrowUpOutlined />
            </div>
          )}
          <div className={css('nav__index')}>{index + 1}</div>
          <div className={css('nav__drag')}>
            <DragOutlined />
          </div>
          {itemLen !== item.index + 1 ? (
            <div className={css('nav__icon')}>
              <ArrowDownOutlined />
            </div>
          ) : null}
        </div>
        <div className={css('list')}>
          <div className={css('list__item')}>
            <div className={css('list__item__topic')}>
              <p>
                Action
                <CopyOutlined />
              </p>
            </div>
            <div className={css('list__item__result')}>{action}</div>
          </div>

          <div className={css('list__item')}>
            <div className={css('list__item__topic')}>
              <p>
                data
                <CopyOutlined />
              </p>
            </div>
            <div className={css('list__item__result')}>{data}</div>
          </div>

          <div className={css('list__item')}>
            <div className={css('list__item__topic')}>
              <p>
                Action
                <CopyOutlined />
              </p>
            </div>
            <div className={css('list__item__result')} onClick={editItem}>
              {edit ? (
                <TextArea
                  placeholder={`请输入action`}
                  autoSize={{ minRows: 2 }}
                  value={result}
                  onChange={e =>
                    setItemBak({
                      ...itemBak,
                      result: e.target.value,
                    })
                  }
                />
              ) : (
                result
              )}
            </div>
          </div>
        </div>
        <div className={css('tools')}>
          <div className={css('tools__item')}>
            <Button shape="circle" icon={<ShrinkOutlined />} />
          </div>
          <div className={css('tools__item')}>
            <Button shape="circle" icon={<CopyOutlined />} />
          </div>
          <div className={css('tools__item')}>
            <Button shape="circle" icon={<UnorderedListOutlined />} />
          </div>
          <div className={css('tools__item')}>
            <Button shape="circle" icon={<DeleteOutlined />} />
          </div>
        </div>
      </div>
      {edit && (
        <div className={css('detail-footer')}>
          <Button type="primary">保存</Button>
          <Button type="default">取消</Button>
        </div>
      )}
    </>
  );
};

export default List;
