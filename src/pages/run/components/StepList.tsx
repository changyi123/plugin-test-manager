import React, { useCallback } from 'react';
import { Popover, Row, Col, Space, Divider, Button, message, Dropdown, Menu } from '@osui/ui';
import { InfoCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import Comment from '@/components//common/Comment';
import { StatusBadge } from '@/components/common/Status';
import { updateTestStep } from '@/lib/api/runs';
import AddDefectModal from './AddDefectModal';
import { uniqueId } from 'lodash';
import { useBaseAction } from '@/lib/hooks/useContext';
import { TestType } from '@/lib/constants';
import { SmallDefectListPopover } from './SmallDefectList';
import { addDefect } from '@/lib/api/runs';
import { useItemLinkTypeConfig } from './hooks';

import css from './StepList.less';

export interface IStepItem {
  action: string;
  attachments: string[];
  defectIds: string[];
  data: string;
  index: number;
  result: string;
  id: string;
  actualResult: string;
  comment: string;
  status: string;
}

export interface IStepItemProps {
  item: IStepItem;
  index: number;
  testId: string;
  saveList: (item: IStepItem, index: number) => void;
}

export interface StepListProps {
  testId: string;
  detail?: {
    runs: {
      steps: Array<IStepItem>;
    };
  };
  objectId: string;
  refresh?: () => void;
}

export const StepItem: React.FC<IStepItemProps> = ({ index, item, saveList, testId }) => {
  const { createItemUseModal } = useBaseAction();
  const { TestToDefect = '' } = useItemLinkTypeConfig();
  const saveItem = useCallback(
    (key: string) => {
      return value => {
        const itemBak = { ...item };
        itemBak[key] = value;
        saveList(itemBak, index);
      };
    },
    [item, saveList, index],
  );

  const createDefect = useCallback(async () => {
    const token = uniqueId('TestDefect');
    const { item: defectItem, extraData } = await createItemUseModal({
      type: TestType.TestDefect,
      extraData: { token },
    });
    // token 不相同则不创建关联
    console.log('ahwawdwadwd', extraData, token, item, defectItem);
    if (extraData.token !== token) return;

    addDefect(TestToDefect, testId, [defectItem.objectId]).then(() => {
      message.success('添加成功');
      if (item.defectIds && item.defectIds.length) {
        saveItem('defectIds')([...item.defectIds, defectItem.objectId]);
        return;
      }
      saveItem('defectIds')([defectItem.objectId]);
    });
  }, [createItemUseModal, testId, item, saveItem, TestToDefect]);

  const menu = (
    <Menu>
      <AddDefectModal
        trigger={
          <Menu.Item key="0">
            <a>添加缺陷</a>
          </Menu.Item>
        }
        testId={testId}
        currentDefectIds={item.defectIds}
        save={() => saveItem('defectIds')}
      />

      <Menu.Item key="1">
        <a onClick={createDefect}>创建缺陷</a>
      </Menu.Item>
    </Menu>
  );

  return (
    <div className={css('step-list__item')}>
      <div className={css('left')}>
        <div className={css('left__index')}>{index + 1}</div>
        <div className={css('left__tips')}>
          <Popover content={<div>继承测试用例</div>}>
            <InfoCircleOutlined />
          </Popover>
        </div>
      </div>

      <div className={css('right')}>
        <Row gutter={[0, 0]}>
          <Col className={css('right__item')} span={8}>
            <div className={css('right__topic')}>行动</div>
            <div className={css('right__content')}>{item.action}</div>
          </Col>

          <Col className={css('right__item')} span={8}>
            <div className={css('right__topic')}>数据</div>
            <div className={css('right__content')}>{item.data}</div>
          </Col>

          <Col className={css('right__item')} span={8}>
            <div className={css('right__topic')}>预期结果</div>
            <div className={css('right__content')}>{item.result}</div>
          </Col>
        </Row>

        <div className={css('right__actual')}>
          <Col className={css('right__item')} span={24}>
            <div className={css('right__topic')}>实际结果</div>
            <div className={css('right__content')}>
              <Comment
                placeholder="点击输入实际结果"
                value={item.actualResult}
                save={() => saveItem('actualResult')}
              />
            </div>
          </Col>
        </div>

        <Col className={css('right__item')} span={24}>
          <div className={css('right__tools')}>
            <div className={css('right__tools__left')}>
              <Space split={<Divider type="vertical" />}>
                <div className={css('comment')}>
                  <Comment
                    placeholder="点击输入留言"
                    value={item.comment}
                    save={() => saveItem('comment')}
                  />
                </div>

                <div className={css('btn')} id="dropdown_add_defect">
                  <Dropdown
                    overlay={menu}
                    trigger={['click']}
                    getPopupContainer={() => document.getElementById('dropdown_add_defect')}
                  >
                    <Button type="link" icon={<PlusCircleOutlined />}>
                      添加缺陷
                    </Button>
                  </Dropdown>
                  {item.defectIds && (
                    <SmallDefectListPopover
                      itemIds={item.defectIds}
                      testId={testId}
                      save={() => saveItem('defectIds')}
                    />
                  )}
                </div>

                {/* <div className={css('btn')}>
                  <Button icon={<FileAddOutlined />}>添加附件</Button>

                  <ExclamationCircleOutlined style={{ marginLeft: '10px', color: 'red' }} />
                </div> */}
              </Space>
            </div>
            <div className={css('right__status')}>
              <StatusBadge
                status={item.status}
                onStatusChange={status => saveItem('status')(status.key)}
              />
            </div>
          </div>
        </Col>
      </div>
    </div>
  );
};

const StepList: React.FC<StepListProps> = ({ detail, objectId, testId, refresh }) => {
  const { steps } = detail?.runs;
  const saveList = useCallback(
    (item: IStepItem, index: number) => {
      const detailBak = { ...detail };
      detailBak.runs.steps[index] = item;
      updateTestStep(detailBak, objectId, true).then(() => {
        message.success('修改成功');
        refresh && refresh();
      });
    },
    [objectId, detail, refresh],
  );
  return (
    <div className={css('step-list')}>
      {steps &&
        steps?.map((item, index) => (
          <StepItem item={item} key={index} index={index} saveList={saveList} testId={testId} />
        ))}
    </div>
  );
};

export default StepList;
