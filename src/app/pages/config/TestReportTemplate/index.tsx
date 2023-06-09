import { useMemoizedFn } from 'ahooks';
import { Button, message, Modal, Table } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { getPagePrefix } from '@/lib/utils/helper';
import { testReportServices } from '@/services';
import { testReportQuery } from '@/services/query';

import cx from './index.less';

// 测试报告模板
const TestReportTemplate: React.FC = () => {
  const { t: scopedT } = useTranslation('', {
    keyPrefix: 'page.config.testReportTemplate',
  });

  // 生成测试报告模板 Url
  const genReportTemplateUrl = (testReportId?: string) => {
    const pagePrefix = getPagePrefix();
    const currentPageUrl = location.href.split('?')[0];
    const searchParams = new URLSearchParams();
    if (testReportId) searchParams.append('testReportId', testReportId);
    // 添加重定向地址
    searchParams.append('redirectLink', encodeURIComponent(currentPageUrl));

    return `${pagePrefix}/plugin/test_manager_test-report-creator?${searchParams.toString()}`;
  };

  const {
    data: templateList,
    refetch: refreshTemplateList,
    isLoading: isTemplateListLoading,
  } = testReportQuery.useAllTemplateList();

  const dataSource = templateList?.map(tmpl => ({
    key: tmpl.objectId,
    ...tmpl,
  }));

  const actions = {
    deleteReportTemplate: async (objectId: string) => {
      await Modal.confirm({
        content: scopedT('message.deleteConfirm'),
        onOk: async () => {
          await testReportServices.deleteTestReport(objectId);
          refreshTemplateList();
          message.success(scopedT('message.deleteSuccess'));
        },
      });
    },
    editReportTemplate: async objectId => {
      window.open(genReportTemplateUrl(objectId), '_self');
    },
    setDefaultReportTemplate: async (objectId: string) => {
      await testReportServices.setDefaultReportTemplate(objectId);
      refreshTemplateList();
      message.success(scopedT('message.setDefaultSuccess'));
    },
  };

  const tableColumns = [
    {
      key: 'name',
      dataIndex: 'name',
      title: scopedT('table.header.name'),
      render: (text: string, rowData) => {
        const tags = ['isGlobalTemplate', 'isDefaultTemplate'].map(key => {
          const isTrue = rowData[key];

          return isTrue ? (
            <span key={key} className={cx('tag', key)}>
              {scopedT(`table.tag.${key}`)}
            </span>
          ) : null;
        });

        return (
          <span>
            {text}
            <span className={cx('tags')}>{tags}</span>
          </span>
        );
      },
    },
    {
      key: 'action',
      title: scopedT('table.header.action'),
      width: 200,
      render: (_, rowData) => {
        const { objectId } = rowData;
        return (
          <div className={cx('table-action')}>
            <Button
              type="link"
              disabled={rowData.isDefaultTemplate}
              onClick={() => actions.setDefaultReportTemplate(objectId)}
            >
              {scopedT('table.action.default')}
            </Button>
            <Button type="link" onClick={() => actions.editReportTemplate(objectId)}>
              {scopedT('table.action.view')}
            </Button>
            <Button
              danger
              type="link"
              disabled={rowData.isDefaultTemplate}
              onClick={() => actions.deleteReportTemplate(objectId)}
            >
              {scopedT('table.action.delete')}
            </Button>
          </div>
        );
      },
    },
  ];

  const handleReportTemplateCreate = useMemoizedFn(async () => {
    // 跳转到测试报告模板创建页面
    window.open(genReportTemplateUrl(), '_self');
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
      <Table
        className={cx('table')}
        loading={isTemplateListLoading}
        dataSource={dataSource}
        columns={tableColumns}
      />
    </div>
  );
};

export default React.memo(TestReportTemplate);
