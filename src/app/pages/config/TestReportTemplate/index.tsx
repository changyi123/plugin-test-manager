import { useQuery } from '@tanstack/react-query';
import { useMemoizedFn } from 'ahooks';
import { Button, message, Modal, Table } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import Parse from '@/lib/parse';
import { genReportTemplateUrl } from '@/lib/testReport';
import { testReportServices } from '@/services';
import { Workspace } from '@/services/models';
import { testReportQuery } from '@/services/query';

import cx from './index.less';

// 测试报告模板
const TestReportTemplate: React.FC = () => {
  const { t: scopedT } = useTranslation('', {
    keyPrefix: 'page.config.testReportTemplate',
  });

  const { data: workspaceKey } = useQuery(['route', 'required', 'workspaceKey'], async () => {
    // FIXME: 因没有空白页插件挂载点，创建页面先使用空间页面挂载点，空间使用第一个
    const { key: workspaceKey } = await new Parse.Query(Workspace)
      .select(['key'])
      .first({ json: true });
    return workspaceKey;
  });

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
          message.success(scopedT('message.setDefaultSuccess'));
        },
      });
    },
    editReportTemplate: async objectId => {
      window.open(genReportTemplateUrl(objectId, workspaceKey), '_self');
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
