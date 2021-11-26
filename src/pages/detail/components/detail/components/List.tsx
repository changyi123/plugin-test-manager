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
import { useDrag, useDrop } from 'react-dnd';

import { TestStep } from '../';
import css from './List.less';

const { TextArea } = Input;

interface ListProps {
  item: TestStep;
  itemLen: number;
  moveCard: (id: string, to: number) => void;
  findCard: (id: string) => { index: number };
}

const List: React.FC<ListProps> = (props: ListProps) => {
  const { item, itemLen, moveCard, findCard } = props;

  const [editState, setEditState] = useState<boolean>(false);
  const [itemBak, setItemBak] = useState<TestStep>(item);
  const { action, data, result, index } = itemBak; //attachments, customFields
  // console.log('刷新次数', index);

  function toggleEditState(bol?: boolean) {
    setEditState(bol === undefined ? !editState : bol);
  }

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'card',
      item: { id: item.id },
      collect: monitor => {
        // console.log('useDrag执行了connect', monitor, monitor.isDragging());
        return {
          isDragging: monitor.isDragging(),
        };
      },
    }),
    [item.id, moveCard],
  );

  const [, drop] = useDrop(
    () => ({
      accept: 'card',
      canDrop: () => false,
      hover({ id: draggedId }: TestStep) {
        // console.log('执行了useDrop', draggedId, item.id);
        if (draggedId !== item.id) {
          const { index: overIndex } = findCard(item.id);
          moveCard(draggedId, overIndex);
        }
      },
    }),
    [findCard, moveCard],
  );

  const opacity = isDragging ? 0.5 : 1;

  return (
    <div ref={node => drag(drop(node))} style={{ opacity }}>
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
            <div className={css('list__item__result')} onClick={() => toggleEditState(true)}>
              {editState ? (
                <TextArea
                  placeholder={`请输入action`}
                  autoSize={{ minRows: 2 }}
                  value={action}
                  onChange={e =>
                    setItemBak({
                      ...itemBak,
                      action: e.target.value,
                    })
                  }
                />
              ) : (
                action
              )}
            </div>
          </div>

          <div className={css('list__item')}>
            <div className={css('list__item__topic')}>
              <p>
                data
                <CopyOutlined />
              </p>
            </div>
            <div className={css('list__item__result')} onClick={() => toggleEditState(true)}>
              {editState ? (
                <TextArea
                  placeholder={`请输入action`}
                  autoSize={{ minRows: 2 }}
                  value={data}
                  onChange={e =>
                    setItemBak({
                      ...itemBak,
                      data: e.target.value,
                    })
                  }
                />
              ) : (
                data
              )}
            </div>
          </div>

          <div className={css('list__item')}>
            <div className={css('list__item__topic')}>
              <p>
                Action
                <CopyOutlined />
              </p>
            </div>
            <div className={css('list__item__result')} onClick={() => toggleEditState(true)}>
              {editState ? (
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
      {editState && (
        <div className={css('detail-footer')}>
          <Button type="primary">保存</Button>
          <Button type="default" onClick={() => toggleEditState(false)}>
            取消
          </Button>
        </div>
      )}
    </div>
  );
};

export default List;
