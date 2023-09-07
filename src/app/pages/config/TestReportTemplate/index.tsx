import { useMemoizedFn } from 'ahooks';
import { Button, message, Modal, Switch, Table } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { genReportTemplateUrl } from '@/lib/testReport';
import { testReportServices } from '@/services';
import { testConfigMutation } from '@/services/mutation';
import { testConfigQuery, testReportQuery } from '@/services/query';

import cx from './index.less';

// 测试报告模板
const TestReportTemplate: React.FC = () => {
  const { t: scopedT } = useTranslation('', {
    keyPrefix: 'page.config.testReportTemplate',
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

  const { data: globalTestConfig } = testConfigQuery.useGlobalTestConfig();
  const { mutateAsync: updateTestConfig, isLoading: isUpdateLoading } =
    testConfigMutation.useTestConfigUpdateMutation();

  const enableWorkspaceReportTemplate =
    globalTestConfig?.extra?.enableWorkspaceReportTemplate ?? false;

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
      window.open(
        genReportTemplateUrl({
          testReportId: objectId,
        }),
      );
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
        const tags = ['isGlobalTemplate', 'isDefaultTemplate', 'workspace'].map(key => {
          const tagTextStrategies = {
            workspace: () =>
              rowData.workspace?.name
                ? `${scopedT(`table.tag.${key}`)}：${rowData.workspace?.name}`
                : scopedT(`table.tag.${key}`),
          };

          const tagVisibleStrategies = {
            isGlobalTemplate: () => rowData.isGlobalTemplate && !rowData.workspace,
          };
          const visible = tagVisibleStrategies[key] ? tagVisibleStrategies[key]() : !!rowData[key];

          const tagText = tagTextStrategies[key]
            ? tagTextStrategies[key]()
            : scopedT(`table.tag.${key}`);

          return visible ? (
            <span key={key} className={cx('tag', key)} title={tagText}>
              {tagText}
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
    window.open(genReportTemplateUrl());
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
      <div className={cx('workspace-template-setting')}>
        <h6>{scopedT('workspaceTemplateSetting.title')}</h6>
        <div>
          <Switch
            loading={isUpdateLoading}
            className={cx('switch')}
            checked={enableWorkspaceReportTemplate}
            onChange={async () => {
              await updateTestConfig({
                objectId: globalTestConfig?.objectId,
                extra: {
                  ...globalTestConfig?.extra,
                  enableWorkspaceReportTemplate: !enableWorkspaceReportTemplate,
                },
              });
              message.success(scopedT('workspaceTemplateSetting.updateSuccess'));
            }}
          />
          <span style={{ marginLeft: 8 }}>{scopedT('workspaceTemplateSetting.label')}</span>
        </div>
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
