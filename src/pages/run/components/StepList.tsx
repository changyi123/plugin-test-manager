import React, { useCallback } from 'react';
import { Row, Col, message } from '@osui/ui';
import { StatusBadge } from '@/components/common/Status';
import FieldsInput from '@/pages/panel/TestDetail/TestDetailPanel/components/FieldsInput';
import { updateTestRun } from '@/lib/api/runs';
import SmallDefectList from './SmallDefectList';
import AddDefectBtn from '../components/AddDefectBtn';
import { Step } from '@/lib/types/Test';

import css from './StepList.less';

export interface TestStep extends Step {
  action: string;
  attachments: string[];
  actualResult: string;
  comment: string;
  status: string;
}

export interface IStepItemProps {
  step: TestStep;
  index: number;
  testId: string;
  onStepChange: (item: TestStep, index: number) => void;
  allRelationDefectIds?: string[];
}

export interface StepListProps {
  testId: string;
  steps: TestStep[];
  objectId: string;
  testRunEntity: any;
  refresh?: () => void;
  allRelationDefectIds?: string[];
}

export const StepItem: React.FC<IStepItemProps> = ({
  index,
  step,
  testId,
  onStepChange,
  allRelationDefectIds,
}) => {
  const saveItem = useCallback(
    (key: string) => {
      return value => {
        const updatedStep = { ...step, [key]: value };
        onStepChange(updatedStep, index);
      };
    },
    [step, onStepChange, index],
  );

  return (
    <div className={[css('step-list__item'), css(step.status)].join(' ')}>
      <div className={css('left')}>
        <div className={css('left__index', step.status)}>{index + 1}</div>
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
            <div className={css('right__content')}>{step.action}</div>
          </Col>

          <Col className={css('right__item')} span={8}>
            <div className={css('right__topic')}>预期结果</div>
            <div className={css('right__content')}>{step.result}</div>
          </Col>
        </Row>

        <div className={css('right__line')}></div>

        <Row gutter={[24, 0]}>
          <Col className={css('right__item')} span={6}>
            <div className={css('right__topic')}>数据</div>
            <div className={css('right__content')}>{step.data}</div>
          </Col>
        </Row>

        <div className={css('right__actual')}>
          <div className={css('right__item')}>
            <div className={css('right__topic')}>实际结果</div>
            <div className={css('right__content')}>
              <FieldsInput
                borderColor="white"
                placeholder="点击输入结果"
                value={step.actualResult}
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
                  value={step.comment}
                  change={(val: string) => saveItem('comment')(val)}
                />
              </div>
            </Col>

            <Col span={8} className={css('answer__item')} id="dropdown_add_defect">
              <div className={css('right__topic')}>缺陷</div>
              <div className={css('right__content')}>
                {step.defectItemIds && (
                  <div className={css('right__content__list')}>
                    <SmallDefectList
                      itemIds={step.defectItemIds}
                      testId={testId}
                      save={() => saveItem('defectItemIds')}
                    />
                  </div>
                )}
                <div className={css('right__content__btn')}>
                  <AddDefectBtn
                    testId={testId}
                    save={saveItem('defectItemIds')}
                    currentDefectIds={step.defectItemIds}
                    allRelationDefectIds={allRelationDefectIds}
                  />
                </div>
              </div>
            </Col>

            <Col span={8} className={css('answer__item')}>
              <div className={css('right__topic')}>状态</div>
              <div className={css('right__content')}>
                <StatusBadge
                  showBg={true}
                  status={step.status}
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

const StepList: React.FC<StepListProps> = ({
  steps,
  testId,
  refresh,
  testRunEntity,
  allRelationDefectIds,
}) => {
  const handleStepChange = useCallback(
    async (item: TestStep, index: number) => {
      steps[index] = item;
      await updateTestRun(testRunEntity, {
        steps,
      });
      refresh();
      message.success('修改成功');
    },
    [refresh, steps, testRunEntity],
  );

  return (
    <div className={css('step-list')}>
      {steps &&
        steps?.map((step, index) => (
          <StepItem
            step={step}
            key={index}
            index={index}
            testId={testId}
            onStepChange={handleStepChange}
            allRelationDefectIds={allRelationDefectIds}
          />
        ))}
    </div>
  );
};

export default StepList;
