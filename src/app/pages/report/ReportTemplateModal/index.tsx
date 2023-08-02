import { Button, message, Modal, Table } from 'antd';
import dayjs from 'dayjs';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { genReportTemplateUrl } from '@/lib/testReport';
import { testReportQuery } from '@/services/query';
import { deleteTestReport, setDefaultReportTemplate } from '@/services/testReport/service';

import cx from './index.less';

export type ActionType = {
  open: () => void;
};

const ReportTemplateModal: React.FC<{
  workspace: any;
  actionRef: React.ForwardedRef<ActionType>;
}> = ({ workspace, actionRef }) => {
  const [open, setOpen] = React.useState(false);
  const { t } = useTranslation('', {
    keyPrefix: 'report.workspaceReportTemplate',
  });

  React.useImperativeHandle(actionRef, () => ({
    open: () => setOpen(true),
  }));

  const { data: workspaceTemplateList, refetch: refreshWorkspaceTemplateList } =
    testReportQuery.useWorkspaceTemplateListQuery(
      open && {
        workspace: workspace?.objectId,
        onlyWorkspaceTemplate: true,
      },
    );

  const actions = {
    edit: testReportId => {
      window.open(
        genReportTemplateUrl({
          testReportId,
        }),
      );
    },
    delete: async testReportId => {
      Modal.confirm({
        title: t('deleteConfirm.title'),
        content: t('deleteConfirm.content'),
        okType: 'danger',
        okText: t('deleteConfirm.okText'),
        onOk: async () => {
          await deleteTestReport(testReportId);
          refreshWorkspaceTemplateList();
          message.success(t('message.deleteSuccess'));
        },
      });
    },
    setDefault: async testReportId => {
      await setDefaultReportTemplate(testReportId);
      refreshWorkspaceTemplateList();
      message.success(t('message.setDefaultSuccess'));
    },
  };

  const tableColumns = [
    {
      title: t('tableColumns.name'),
      dataIndex: 'name',
      width: 320,
    },
    {
      title: t('tableColumns.createdAt'),
      dataIndex: 'createdAt',
      width: 160,
      render: createdAt => dayjs(createdAt).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: t('tableColumns.action'),
      dataIndex: 'objectId',
      render(objectId, row) {
        return (
          <>
            <Button
              type="link"
              size="small"
              className={cx('edit')}
              onClick={() => actions.edit(objectId)}
            >
              {t('buttons.edit')}
            </Button>
            <Button
              type="link"
              size="small"
              disabled={row.isDefaultTemplate}
              onClick={() => actions.setDefault(objectId)}
            >
              {t('buttons.setDefault')}
            </Button>
            <Button onClick={() => actions.delete(objectId)} type="link" size="small" danger>
              {t('buttons.delete')}
            </Button>
          </>
        );
      },
    },
  ];

  return (
    <Modal
      open={open}
      width={780}
      maskClosable={false}
      title={t('modalTitle')}
      onCancel={() => {
        setOpen(false);
      }}
      footer={
        <Button
          onClick={() => {
            window.open(
              genReportTemplateUrl({
                workspaceKey: workspace?.key,
              }),
            );
          }}
          type="primary"
        >
          {t('buttons.create')}
        </Button>
      }
    >
      <Table
        style={{
          height: 486,
        }}
        scroll={{
          y: 400,
        }}
        dataSource={workspaceTemplateList}
        columns={tableColumns}
      />
    </Modal>
  );
};

export default ReportTemplateModal;
