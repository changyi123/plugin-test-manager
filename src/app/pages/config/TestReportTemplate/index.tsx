import { useMemoizedFn } from 'ahooks';
import { Button, Space, Table } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import Parse from '@/lib/parse';
import { getPagePrefix } from '@/lib/utils/helper';
import { Workspace } from '@/services/models';

import cx from './index.less';

// 测试报告模板
const TestReportTemplate: React.FC = () => {
  const { t: scopedT } = useTranslation('', {
    keyPrefix: 'page.config.testReportTemplate',
  });

  const tableColumns = [
    {
      key: 'name',
      dataIndex: 'name',
      title: scopedT('table.header.name'),
    },
    {
      key: 'action',
      title: scopedT('table.header.action'),
      render: () => {
        return (
          <Space>
            <Button type="link">{scopedT('table.action.view')}</Button>
          </Space>
        );
      },
    },
  ];

  const handleReportTemplateCreate = useMemoizedFn(async () => {
    const currentPageUrl = location.href.split('?')[0];
    const pagePrefix = getPagePrefix();
    // FIXME: 因没有空白页插件挂载点，创建页面先使用空间页面挂载点，空间使用第一个
    const { key: workspaceKey } = await new Parse.Query(Workspace)
      .select(['key'])
      .first({ json: true });
    // 跳转到测试报告模板创建页面
    window.open(
      `${pagePrefix}/workspaces/${workspaceKey}/plugin/test_manager_test-report-creator/?redirectLink=${encodeURIComponent(
        currentPageUrl,
      )}`,
      '_self',
    );
  });

  return (
    <div className={cx('container')}>
      <div className={cx('actions')}>
        <Button
          type="primary"
          className={cx('button', 'create')}
          onClick={handleReportTemplateCreate}
        >
          {scopedT('buttons.create')}
        </Button>
      </div>
      <h3>{scopedT('table.title')}</h3>
      <Table columns={tableColumns} />
    </div>
  );
};

export default React.memo(TestReportTemplate);
