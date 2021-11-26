import React, { useState } from 'react';
import { Button, Tooltip, Input, Dropdown, Menu } from '@osui/ui';
import {
  EditOutlined,
  ArrowsAltOutlined,
  ShrinkOutlined,
  SearchOutlined,
  QuestionCircleOutlined,
  DownOutlined,
} from '@ant-design/icons';
import Breadcrumb from './components/Breadcrumb';
import DetailList from './components/List';

import css from './index.less';

export interface fields {
  id: string;
  value: string;
}
export interface TestStep {
  resource: string;
  action: string;
  data: string;
  result: string;
  attachments: Array<string>;
  customFields: Array<fields>;
  index: number;
  callTestIssueId?: string;
  isEdit: boolean;
}

const Detail: React.FC = () => {
  const [steps] = useState<Array<TestStep>>([
    {
      resource: '1',
      action: '行动111',
      data: '数据111',
      result: '结果111',
      attachments: [],
      customFields: [],
      index: 0,
      isEdit: true,
    },
    {
      resource: '2',
      action: '行动2',
      data: '数据222',
      result: '结果222',
      attachments: [],
      customFields: [],
      index: 1,
      isEdit: false,
    },
    {
      resource: '3',
      action: '行动2333',
      data: '数据33',
      result: '结果3333',
      attachments: [],
      customFields: [],
      index: 2,
      isEdit: false,
    },
  ]);

  return (
    <div className={css('detail')}>
      <div className={css('detail__breadcrumb')}>
        <Breadcrumb />
      </div>
      <div className={css('detail__content')}>
        <div className={css('detail__content__header')}>
          <div className={css('left')}>
            <Button type="primary" icon={<EditOutlined />}>
              弹窗编辑
            </Button>
            <div className={css('item')}>
              <Tooltip title="全部展开" placement="bottom">
                <Button icon={<ArrowsAltOutlined />} />
              </Tooltip>
            </div>
            <div className={css('item')}>
              <Tooltip title="全部收缩" placement="bottom">
                <Button icon={<ShrinkOutlined />} />
              </Tooltip>
            </div>
            <div className={css('input')}>
              <Input placeholder="搜索关键字" prefix={<SearchOutlined />} />
            </div>
            <div className={css('item')}>
              <Tooltip title="测试步骤教程">
                <QuestionCircleOutlined />
              </Tooltip>
            </div>
          </div>

          <div className={css('right')}>
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item key="1">新增步骤</Menu.Item>
                  <Menu.Item key="2">继承测试用例</Menu.Item>
                </Menu>
              }
            >
              <Button type="primary">
                添加步骤 <DownOutlined />
              </Button>
            </Dropdown>
          </div>
        </div>
        {steps.map(item => (
          <DetailList item={item} itemLen={steps.length} key={item.index} />
        ))}
      </div>
    </div>
  );
};

export default Detail;
