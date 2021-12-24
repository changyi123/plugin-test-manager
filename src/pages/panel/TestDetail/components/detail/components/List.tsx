import React, { useState } from 'react';
import { Button, Input, Divider, Dropdown, Menu, Tooltip, Popconfirm, InputNumber } from '@osui/ui';
import {
  DragOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  EllipsisOutlined,
} from '@ant-design/icons';
import { useDrag, useDrop } from 'react-dnd';

import { TestStep, IActionCard } from '..';
import { stepTools, IStepToolsKey } from './ListConfig';
import css from './List.less';
import Copy from '@/components/common/CopyToClipboard';

const { TextArea } = Input;

interface ListProps {
  item: TestStep;
  itemLen: number;
  index: number;
  actionCard: IActionCard;
}

interface IStepItemProps {
  trigger?: JSX.Element;
  text?: string;
}

const List: React.FC<ListProps> = (props: ListProps) => {
  const { item, itemLen, actionCard } = props;
  const {
    moveCard,
    findCard,
    expandCard,
    cloneCard,
    deleteCard,
    addCard,
    saveCard,
    openCallTestModal,
  } = actionCard;

  const [editState, setEditState] = useState<boolean>(item.isEdit || false);
  const { isExpand } = item;
  const [itemBak, setItemBak] = useState<TestStep>(item);
  const { action, data, result } = itemBak; //attachments, customFields

  function toggleEditState(bol?: boolean) {
    setEditState(bol === undefined ? !editState : bol);
  }

  function expandItemCard(isExpand: boolean) {
    expandCard(item.id, isExpand);
  }

  function handleCopyItem() {
    cloneCard(item.id);
  }

  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: 'card',
      item: { id: item.id },
      collect: monitor => {
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
      drop: () => {
        saveCard();
      },
      hover({ id: draggedId }: TestStep) {
        if (draggedId !== item.id) {
          const { index: overIndex } = findCard(item.id);
          moveCard(draggedId, overIndex);
        }
      },
    }),
    [findCard, moveCard],
  );

  const StepItemMove: React.FC<IStepItemProps> = props => {
    const [num, setNum] = useState<number>(0);

    function handleMoveItem() {
      moveCard(item.id, +num - 1, true);
    }

    return (
      <Popconfirm
        placement="rightTop"
        title={
          <div>
            <p>移动到</p>
            <InputNumber value={num} min={0} max={itemLen} onChange={e => setNum(+e)} />
          </div>
        }
        onConfirm={handleMoveItem}
        okText="Yes"
        cancelText="No"
      >
        <Tooltip placement="left" title={stepTools[IStepToolsKey.MOVE].label}>
          {props.trigger && React.cloneElement(props.trigger)}
          {props.text}
        </Tooltip>
      </Popconfirm>
    );
  };

  const StepItemCopy: React.FC<IStepItemProps> = props => {
    return (
      <Popconfirm
        placement="left"
        title="你确定要克隆这一测试步骤？"
        onConfirm={handleCopyItem}
        okText="Yes"
        cancelText="No"
      >
        <Tooltip placement="left" title={stepTools[IStepToolsKey.COPY].label}>
          {props.trigger && React.cloneElement(props.trigger)}
          {props.text}
        </Tooltip>
      </Popconfirm>
    );
  };

  const StepItemDelete: React.FC<IStepItemProps> = props => {
    return (
      <Popconfirm
        placement="left"
        title="你确定要删除这一测试步骤？"
        onConfirm={() => deleteCard(item.id)}
        okText="Yes"
        cancelText="No"
      >
        <Tooltip placement="left" title={stepTools[IStepToolsKey.DELETE].label}>
          {props.trigger && React.cloneElement(props.trigger)}
          {props.text}
        </Tooltip>
      </Popconfirm>
    );
  };

  const handleOpenModal = () => {
    const { index } = findCard(item.id);
    openCallTestModal(index);
  };

  const opacity = isDragging ? 0.5 : 1;

  return (
    <div ref={node => drop(node)} style={{ opacity }} className={css('around')}>
      <Divider plain className={css('around__divider')}>
        <span>
          <Button type="link" onClick={() => addCard(item.id)}>
            新步骤
          </Button>
          <Divider type="vertical" />
          <Button type="link" onClick={handleOpenModal}>
            继承测试
          </Button>
        </span>
      </Divider>
      <div className={css('detail-list')} ref={preview}>
        <div className={[css('nav'), item.callTestId && css('call')].join(' ')}>
          {isExpand && props.index !== 0 && (
            <div className={css('nav__drag')}>
              <ArrowUpOutlined />
            </div>
          )}
          <div className={css('nav__index')}>{props.index + 1}</div>
          <div className={css('nav__drag')} ref={node => drag(node)}>
            <DragOutlined />
          </div>
          {isExpand && itemLen !== props.index + 1 ? (
            <div className={css('nav__icon')}>
              <ArrowDownOutlined />
            </div>
          ) : null}
        </div>

        {!item.callTestId ? (
          isExpand ? (
            <div className={css('list')}>
              <div className={css('list__item')}>
                <div className={css('list__item__topic')}>
                  <p>
                    行动
                    <Copy text={action} />
                  </p>
                </div>
                <div className={css('list__item__result')} onClick={() => toggleEditState(true)}>
                  {editState ? (
                    <TextArea
                      placeholder={`请输入行动`}
                      maxLength={100}
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
                    action || '暂无内容'
                  )}
                </div>
              </div>

              <div className={css('list__item')}>
                <div className={css('list__item__topic')}>
                  <p>
                    数据
                    <Copy text={data} />
                  </p>
                </div>
                <div className={css('list__item__result')} onClick={() => toggleEditState(true)}>
                  {editState ? (
                    <TextArea
                      maxLength={100}
                      placeholder={`请输入数据`}
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
                    data || '暂无内容'
                  )}
                </div>
              </div>

              <div className={css('list__item')}>
                <div className={css('list__item__topic')}>
                  <p>
                    预期结果
                    <Copy text={result} />
                  </p>
                </div>
                <div className={css('list__item__result')} onClick={() => toggleEditState(true)}>
                  {editState ? (
                    <TextArea
                      placeholder={`请输入预期结果`}
                      maxLength={100}
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
                    result || '暂无内容'
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className={css('list')}>
              <div className={css('list__item')}>
                <div
                  className={css('list__item__result')}
                  onClick={() => {
                    expandItemCard(true);
                    toggleEditState(true);
                  }}
                >
                  <div>{action}</div>
                  <div>{data}</div>
                  <div>{result}</div>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className={css('list')}>
            <div className={[css('list__item'), css('call-test')].join(' ')}>
              <div className={css('call-test-topic')}>
                <div className={css('label')}>继承测试用例</div>
                <Button
                  type="link"
                  target="_blank"
                  href={`/osc/workspaces/${(item as any)?.itemObject?.workspace?.key}/item/${
                    item?.itemObject?.key
                  }`}
                >
                  {item?.itemObject?.key}
                </Button>
              </div>
              <div className={css('list__item__result')}>{item?.itemObject?.name}</div>
            </div>
          </div>
        )}
        {!editState &&
          (isExpand ? (
            <div className={css('tools')}>
              <div className={css('tools__item')}>
                <Tooltip placement="left" title={stepTools[IStepToolsKey.CLOSE].label}>
                  <Button
                    shape="circle"
                    icon={stepTools[IStepToolsKey.CLOSE].icon}
                    onClick={() => expandItemCard(false)}
                  />
                </Tooltip>
              </div>
              <div className={css('tools__item')}>
                <StepItemCopy
                  trigger={<Button shape="circle" icon={stepTools[IStepToolsKey.COPY].icon} />}
                ></StepItemCopy>
              </div>
              <div className={css('tools__item')}>
                <StepItemMove
                  trigger={<Button shape="circle" icon={stepTools[IStepToolsKey.MOVE].icon} />}
                />
              </div>
              <div className={css('tools__item')}>
                <StepItemDelete
                  trigger={<Button shape="circle" icon={stepTools[IStepToolsKey.DELETE].icon} />}
                />
              </div>
            </div>
          ) : (
            <div className={css('tools')}>
              <div className={[css('tools__item'), css('tools__expand')].join(' ')}>
                <Dropdown
                  overlay={
                    <Menu>
                      <Menu.Item
                        key="1"
                        icon={stepTools[IStepToolsKey.OPEN].icon}
                        onClick={() => expandItemCard(true)}
                      >
                        {stepTools[IStepToolsKey.OPEN].label}
                      </Menu.Item>
                      <Menu.Item key="2" icon={stepTools[IStepToolsKey.COPY].icon}>
                        <StepItemCopy text={stepTools[IStepToolsKey.COPY].label} />
                      </Menu.Item>
                      <Menu.Item key="3" icon={stepTools[IStepToolsKey.MOVE].icon}>
                        <StepItemMove text={stepTools[IStepToolsKey.MOVE].label} />
                      </Menu.Item>
                      <Menu.Item key="4" icon={stepTools[IStepToolsKey.DELETE].icon}>
                        <StepItemDelete text={stepTools[IStepToolsKey.DELETE].label} />
                      </Menu.Item>
                    </Menu>
                  }
                  placement="bottomCenter"
                >
                  <Button icon={<EllipsisOutlined />}></Button>
                </Dropdown>
              </div>
            </div>
          ))}
      </div>
      {isExpand && editState && (
        <div className={css('detail-footer')}>
          <Button
            type="primary"
            onClick={() => {
              saveCard(props.index, itemBak);
              setEditState(false);
            }}
          >
            保存
          </Button>
          <Button
            type="default"
            onClick={() => {
              if (item.id === '-1') {
                deleteCard(item.id);
                return;
              }
              setItemBak(item);
              toggleEditState(false);
            }}
          >
            取消
          </Button>
        </div>
      )}
    </div>
  );
};

export default List;
