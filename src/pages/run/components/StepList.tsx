import React, { useCallback } from 'react';
import { Row, Col, Button, message, Dropdown, Menu } from '@osui/ui';
import { PlusOutlined } from '@ant-design/icons';
import { StatusBadge } from '@/components/common/Status';
import FieldsInput from '@/pages/panel/TestDetail/TestDetailPanel/components/FieldsInput';
import { updateTestStep } from '@/lib/api/runs';
import AddDefectModal from './AddDefectModal';
import { uniqueId } from 'lodash';
import { useBaseAction } from '@/lib/hooks/useContext';
import { TestType } from '@/lib/constants';
import SmallDefectList from './SmallDefectList';
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
  const dropDownRef = React.useRef();
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
    <div className={[css('step-list__item'), css(item.status)].join(' ')}>
      <div className={css('left')}>
        <div className={css('left__index', item.status)}>{index + 1}</div>
        {/* <div className={css('left__tips')}>
          <Popover content={<div>继承测试用例</div>}>
            <InfoCircleOutlined />
          </Popover>
        </div> */}
      </div>

      <div className={css('right')}>
        <Row gutter={[24, 0]}>
          <Col className={css('right__item')} span={12}>
            <div className={css('right__topic')}>行动</div>
            <div className={css('right__content')}>{item.action}</div>
          </Col>

          <Col className={css('right__item')} span={8}>
            <div className={css('right__topic')}>预期结果</div>
            <div className={css('right__content')}>{item.result}</div>
          </Col>
        </Row>

        <div className={css('right__line')}></div>

        <Row gutter={[24, 0]}>
          <Col className={css('right__item')} span={6}>
            <div className={css('right__topic')}>数据</div>
            <div className={css('right__content')}>{item.data}</div>
          </Col>
        </Row>

        <div className={css('right__actual')}>
          <div className={css('right__item')}>
            <div className={css('right__topic')}>实际结果</div>
            <div className={css('right__content')}>
              <FieldsInput
                borderColor="white"
                placeholder="点击输入结果"
                value={item.actualResult}
                change={(val: string) => saveItem('actualResult')(val)}
              />
            </div>
          </div>

          <div className={css('right__line')}></div>

          <Row className={css('answer')}>
            <Col span={8} className={css('answer__item')}>
              <div className={css('right__topic')}>评论</div>
              <div className={css('right__content')}>
                <FieldsInput
                  placeholder="点击输入评论"
                  borderColor="white"
                  value={item.comment}
                  change={(val: string) => saveItem('comment')(val)}
                />
              </div>
            </Col>

            <Col span={8} className={css('answer__item')} id="dropdown_add_defect">
              <div className={css('right__topic')}>缺陷</div>
              <div className={css('right__content')}>
                {item.defectIds && (
                  <div className={css('right__content__list')}>
                    <SmallDefectList
                      itemIds={item.defectIds}
                      testId={testId}
                      save={() => saveItem('defectIds')}
                    />
                  </div>
                )}
                <div className={css('right__content__btn')} ref={dropDownRef}>
                  <Dropdown
                    overlay={menu}
                    trigger={['click']}
                    getPopupContainer={() => dropDownRef.current}
                  >
                    <Button type="link" icon={<PlusOutlined />}>
                      添加缺陷
                    </Button>
                  </Dropdown>
                </div>
              </div>
            </Col>

            <Col span={8} className={css('answer__item')}>
              <div className={css('right__topic')}>状态</div>
              <div className={css('right__content')}>
                <StatusBadge
                  showBg={true}
                  status={item.status}
                  onStatusChange={status => saveItem('status')(status.key)}
                />
              </div>
            </Col>
          </Row>
        </div>
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
