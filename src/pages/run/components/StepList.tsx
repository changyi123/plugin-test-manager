import React from 'react';
import { Popover, Row, Col } from '@osui/ui';
import { InfoCircleOutlined } from '@ant-design/icons';

import css from './StepList.less';

const StepList: React.FC = () => {
  return (
    <div className={css('step-list')}>
      <div className={css('step-list__item')}>
        <div className={css('left')}>
          <div className={css('left__index')}>1</div>
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
              <div className={css('right__content')}>xxx</div>
            </Col>

            <Col className={css('right__item')} span={8}>
              <div className={css('right__topic')}>数据</div>
              <div className={css('right__content')}>xxx</div>
            </Col>

            <Col className={css('right__item')} span={8}>
              <div className={css('right__topic')}>预期结果</div>
              <div className={css('right__content')}>xxx</div>
            </Col>
          </Row>

          <div className={css('right__actual')}>
            <Col className={css('right__item')} span={24}>
              <div className={css('right__topic')}>实际结果</div>
              <div className={css('right__content')}>xxx</div>
            </Col>
          </div>

          <Col className={css('right__item')} span={24}>
            <div className={css('right__tools')}>
              <div className={css('right__')}>阿萨德</div>
              <div className={css('right__')}>状态一栏</div>
            </div>
          </Col>
        </div>
      </div>
    </div>
  );
};

export default StepList;
