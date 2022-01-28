import React, { useEffect, useState } from 'react';
import {
  Divider,
  Dropdown,
  Menu,
  Tooltip,
  Popconfirm,
  InputNumber,
  Space,
  Row,
  Col,
} from '@osui/ui';
import { HolderOutlined, CaretRightOutlined, PlusOutlined } from '@ant-design/icons';
import { useDrag, useDrop } from 'react-dnd';
import ItemIcon from '@/pages/run/components/ItemIcon';

import { TestStep, IActionCard } from '..';
import { stepTools, IStepToolsKey } from './ListConfig';
import FieldsInput from './FieldsInput';
import css from './List.less';
import { TestDetailContext } from '../index';
import { ItemType } from '@/lib/types/App';

interface ListProps {
  item: TestStep;
  itemLen: number;
  index: number;
  actionCard: IActionCard;
}

interface IStepItemProps {
  trigger?: JSX.Element;
  text?: string;
  disabled?: boolean;
  tooltipVisible?: boolean;
}

const List: React.FC<ListProps> = (props: ListProps) => {
  const { item, itemLen, actionCard } = props;
  const {
    moveStep,
    findStep,
    expandStep,
    cloneStep,
    deleteStep,
    addStep,
    saveStep,
    openCallTestModal,
  } = actionCard;

  const { action, data, result, showMore, isExpand } = item; //attachments, customFields
  const [moreInfo, setMoreInfo] = useState<boolean>(showMore);

  useEffect(() => {
    setMoreInfo(showMore);
  }, [showMore]);

  function expandItemCard(isExpand: boolean) {
    expandStep(item.id, isExpand);
  }

  function handleCopyItem() {
    cloneStep(item.id);
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
    [item.id, moveStep],
  );

  const [, drop] = useDrop(
    () => ({
      accept: 'card',
      drop: () => {
        saveStep();
      },
      hover({ id: draggedId }: TestStep) {
        if (draggedId !== item.id) {
          const { index: overIndex } = findStep(item.id);
          moveStep(draggedId, overIndex);
        }
      },
    }),
    [findStep, moveStep],
  );

  const StepItemMove: React.FC<IStepItemProps> = props => {
    const [num, setNum] = useState<number>(1);

    function handleMoveItem() {
      if (num < 1) return;
      moveStep(item.id, +num - 1, true);
    }

    return (
      <Popconfirm
        placement="rightTop"
        disabled={props.disabled}
        title={
          <div>
            <p>移动到</p>
            <InputNumber value={num} min={1} max={itemLen} onChange={e => setNum(+e)} />
          </div>
        }
        onConfirm={handleMoveItem}
        okText="确定"
        cancelText="取消"
      >
        <Tooltip
          visible={props.tooltipVisible}
          placement="left"
          title={stepTools[IStepToolsKey.MOVE].label}
        >
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
        okText="确定"
        cancelText="取消"
        disabled={props.disabled}
      >
        <Tooltip
          visible={props.tooltipVisible}
          placement="left"
          title={stepTools[IStepToolsKey.COPY].label}
        >
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
        onConfirm={() => deleteStep(item.id)}
        okText="确定"
        cancelText="取消"
        disabled={props.disabled}
      >
        <Tooltip
          visible={props.tooltipVisible}
          placement="left"
          title={stepTools[IStepToolsKey.DELETE].label}
        >
          {props.trigger && React.cloneElement(props.trigger)}
          {props.text}
        </Tooltip>
      </Popconfirm>
    );
  };

  const DividerLine: React.FC = () => {
    const { index } = findStep(item.id);

    return (
      <div className={css('divider')}>
        <div className={css('divider__line')}></div>
        <Dropdown
          overlay={
            <Menu>
              <Menu.Item key="1" onClick={() => addStep(index)}>
                新增步骤
              </Menu.Item>
              <Menu.Item key="2" onClick={() => openCallTestModal(index)}>
                继承测试用例
              </Menu.Item>
            </Menu>
          }
          placement="bottomCenter"
        >
          <div className={css('divider__plus')}>
            <PlusOutlined />
          </div>
        </Dropdown>
      </div>
    );
  };

  const opacity = isDragging ? 0.5 : 1;
  return (
    <TestDetailContext.Consumer>
      {val =>
        isExpand ? (
          <div ref={node => drop(node)} style={{ opacity }} className={css('around')}>
            {val.searchStatus ? <div className={css('divider')}></div> : <DividerLine />}
            <div
              className={[css('detail-list'), item.callTestId && css('call')].join(' ')}
              ref={preview}
            >
              <div className={css('nav')}>
                <div className={css('nav__index')}>{props.index + 1}</div>
                {!val.searchStatus && (
                  <div className={[css('nav__drag')].join(' ')} ref={node => drag(node)}>
                    <HolderOutlined />
                  </div>
                )}
              </div>

              {item.callTestId && (
                <div className={css('step')}>
                  <div className={css('step__around')}>
                    <div className={css('step__around__header')}>
                      <div className={css('tips')}>用例调用</div>

                      {(item?.itemData?.itemType as ItemType)?.icon && (
                        <div className={css('icon')}>
                          <ItemIcon src={(item?.itemData?.itemType as ItemType)?.icon} />
                        </div>
                      )}

                      <div className={css('label')}>{item?.itemData?.key}</div>
                    </div>

                    <div className={css('step__around__content')}>{item?.itemData?.name}</div>
                  </div>
                </div>
              )}

              {!item.callTestId && (
                <div className={css('step')}>
                  <div className={css('step__fields')}>
                    <Row gutter={[24, 12]}>
                      <Col span={12}>
                        <div className={css('step__fields__item')}>
                          <div className={css('step__fields__item__topic')}>操作</div>
                          <div className={css('step__fields__item__input')}>
                            <FieldsInput
                              value={action}
                              change={e => {
                                saveStep(
                                  props.index,
                                  {
                                    ...item,
                                    action: e,
                                  },
                                  undefined,
                                );
                              }}
                            />
                          </div>
                        </div>
                      </Col>

                      <Col span={12}>
                        <div className={css('step__fields__item')}>
                          <div className={css('step__fields__item__topic')}>预期</div>
                          <div className={css('step__fields__item__input')}>
                            <FieldsInput
                              value={result}
                              change={e => {
                                saveStep(
                                  props.index,
                                  {
                                    ...item,
                                    result: e,
                                  },
                                  undefined,
                                );
                              }}
                            />
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </div>

                  <Divider className={css('step__line')} />

                  <div className={css('step__more')}>
                    <div
                      className={css('step__more__tips')}
                      onClick={e => {
                        e.stopPropagation();
                        setMoreInfo(!moreInfo);
                      }}
                    >
                      <Space size={4}>
                        <span>更多信息</span>
                        <CaretRightOutlined
                          className={
                            moreInfo !== undefined && (moreInfo ? css('show') : css('close'))
                          }
                        />
                      </Space>
                    </div>
                  </div>

                  {moreInfo && (
                    <div className={[css('step__fields'), css('custom-fields')].join(' ')}>
                      <Row gutter={[24, 12]}>
                        <Col span={12}>
                          <div className={css('step__fields__item')}>
                            <div className={css('step__fields__item__topic')}>数据</div>
                            <div className={css('step__fields__item__input')}>
                              <FieldsInput
                                value={data}
                                change={e => {
                                  saveStep(
                                    props.index,
                                    {
                                      ...item,
                                      data: e,
                                    },
                                    undefined,
                                  );
                                }}
                              />
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  )}
                </div>
              )}

              <div className={css('tools')} onClick={e => e.stopPropagation()}>
                <div className={css('tools__item')}>
                  <Tooltip placement="left" title={stepTools[IStepToolsKey.CLOSE].label}>
                    <div className={css('tools__item__icon')} onClick={() => expandItemCard(false)}>
                      {stepTools[IStepToolsKey.CLOSE].icon}
                    </div>
                  </Tooltip>
                </div>
                <div className={css('tools__item')}>
                  <StepItemCopy
                    disabled={val.searchStatus}
                    trigger={
                      <div className={css('tools__item__icon')}>
                        {stepTools[IStepToolsKey.COPY].icon}
                      </div>
                    }
                  ></StepItemCopy>
                </div>
                <div className={css('tools__item')}>
                  <StepItemMove
                    disabled={val.searchStatus}
                    trigger={
                      <div className={css('tools__item__icon')}>
                        {stepTools[IStepToolsKey.MOVE].icon}
                      </div>
                    }
                  />
                </div>
                <div className={css('tools__item')}>
                  <StepItemDelete
                    disabled={val.searchStatus}
                    trigger={
                      <div className={css('tools__item__icon')}>
                        {stepTools[IStepToolsKey.DELETE].icon}
                      </div>
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div ref={node => drop(node)} style={{ opacity }} className={css('around')}>
            <DividerLine />
            <div
              className={[css('detail-list'), item.callTestId && css('call')].join(' ')}
              ref={preview}
            >
              <div className={css('nav')}>
                <div className={[css('nav__index'), css('nav__index__expand')].join(' ')}>
                  {props.index + 1}
                </div>
                <div
                  className={[css('nav__drag'), css('nav__drag__expand')].join(' ')}
                  ref={node => drag(node)}
                >
                  <HolderOutlined />
                </div>
              </div>

              <div className={css('step')}>
                <div className={css('step__expand')}>
                  {item.callTestId ? (
                    <div className={css('step__expand__content')}>
                      <div className={css('tips')}>用例调用</div>
                      <div className={css('label')}>{item?.itemData?.name}</div>
                    </div>
                  ) : (
                    action || '-'
                  )}
                </div>
              </div>

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
                        <Menu.Item key="2">
                          <StepItemCopy
                            tooltipVisible={false}
                            trigger={
                              <div className={css('space-width')}>
                                <div>{stepTools[IStepToolsKey.COPY].icon}</div>
                                <div className={css('space-width__val')}>
                                  {stepTools[IStepToolsKey.COPY].label}
                                </div>
                              </div>
                            }
                          />
                        </Menu.Item>
                        <Menu.Item key="3">
                          <StepItemMove
                            tooltipVisible={false}
                            trigger={
                              <div className={css('space-width')}>
                                <div>{stepTools[IStepToolsKey.MOVE].icon}</div>
                                <div className={css('space-width__val')}>
                                  {stepTools[IStepToolsKey.MOVE].label}
                                </div>
                              </div>
                            }
                          />
                        </Menu.Item>
                        <Menu.Item key="4">
                          <StepItemDelete
                            tooltipVisible={false}
                            trigger={
                              <div className={css('space-width')}>
                                <div>{stepTools[IStepToolsKey.DELETE].icon}</div>
                                <div className={css('space-width__val')}>
                                  {stepTools[IStepToolsKey.DELETE].label}
                                </div>
                              </div>
                            }
                          />
                        </Menu.Item>
                      </Menu>
                    }
                    placement="bottomCenter"
                  >
                    <div
                      className={[css('tools__item__icon'), css('tools__item__expand')].join(' ')}
                    >
                      {stepTools[IStepToolsKey.MORE].icon}
                    </div>
                  </Dropdown>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </TestDetailContext.Consumer>
  );
};

export default List;
