import { Button, message, Modal, Space, Table } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { judgeTestReportVersion, TEST_REPORT_VERSION } from '@/lib/appEnv';
import useI18n from '@/lib/hooks/useI18n';
import Parse from '@/lib/parse';
import { FileType } from '@/lib/types/Test';
import { ReportTemplate, WordTemplate as WordTemplateObject } from '@/services/models';

import cx from './index.less';
import TemplateModal from './TemplateModal';

export interface WordTemplateInterface {
  objectId?: string;
  name: string;
  file: FileType;
  dataSet?: string[];
  workspace?: string[];
}

export const wordTemplateApi = {
  async create(data: WordTemplateInterface): Promise<any> {
    await new WordTemplateObject(data).save();
  },

  async delete({ objectId }: { objectId: string }): Promise<any> {
    await new WordTemplateObject({ objectId }).destroy();
  },

  async edit(record: {
    objectId?: string;
    name?: string | number;
    description?: string | number;
  }): Promise<any> {
    await new WordTemplateObject(record).save();
  },
  async findByPagination(currentIndex = 1, pageSize = 10): Promise<any> {
    const query = new Parse.Query(WordTemplateObject).exists('createdAt');
    const total = await query.count(true);
    const data = await query
      .addDescending('updatedAt')
      .skip((currentIndex - 1) * pageSize)
      .limit(pageSize)
      .find();
    return {
      data: data.map(ele => ele.toJSON()),
      total: total,
      pageSize,
      current: currentIndex,
    };
  },
};

export const reportTemplateApi = {
  async create(data: WordTemplateInterface): Promise<any> {
    const { file, ...rest } = data;
    await new ReportTemplate({ ...rest, url: file.href }).save();
  },

  async delete({ objectId }: { objectId: string }): Promise<any> {
    await new ReportTemplate({ objectId }).destroy();
  },

  async edit(record: { objectId?: string; name?: string | number; file?: any }): Promise<any> {
    const { file, ...rest } = record;
    await new ReportTemplate({ ...rest, url: file.href }).save();
  },
  async findByPagination(currentIndex = 1, pageSize = 10): Promise<any> {
    const query = new Parse.Query(ReportTemplate).exists('createdAt');
    const total = await query.count(true);
    const data = await query
      .addDescending('updatedAt')
      .skip((currentIndex - 1) * pageSize)
      .limit(pageSize)
      .find();
    return {
      data: data.map(ele => ele.toJSON()),
      total: total,
      pageSize,
      current: currentIndex,
    };
  },
};

const downLoadFile = record => {
  const file = judgeTestReportVersion([TEST_REPORT_VERSION.V1, TEST_REPORT_VERSION.V2])
    ? record
    : record.file;
  const xhr = new XMLHttpRequest();
  xhr.open('GET', file.url, true);
  xhr.responseType = 'blob';
  xhr.onload = () => {
    if (xhr.status === 200) {
      // 获取文件blob数据并保存
      const urlObject = window.URL;
      const export_blob = new Blob([xhr.response], { type: xhr.getResponseHeader('content-type') });
      const link = document.createElement('a');
      link.href = urlObject.createObjectURL(export_blob);
      link.download = file.name;
      link.click();
      // document.body.removeChild(link);
    }
  };
  xhr.send();
};

const WordTemplate: React.FC = () => {
  const { t } = useI18n();
  const columns = [
    {
      title: t('page.config.wordTemplate.templateName'),
      dataIndex: 'name',
    },
    {
      title: t('common.updateAt'),
      dataIndex: 'updatedAt',
    },
    {
      title: t('common.action'),
      dataIndex: 'action',
      render: (text, record) => {
        return (
          <Space size="middle">
            <a onClick={() => templateConfig(record)}>{t('common.editor')}</a>
            <a onClick={() => templateDelete(record)}>{t('common.delete')}</a>
            <a onClick={() => downLoadFile(record)}>{t('common.download')}</a>
          </Space>
        );
      },
      width: 180,
    },
  ];

  const apis = useMemo(
    () =>
      judgeTestReportVersion([TEST_REPORT_VERSION.V1, TEST_REPORT_VERSION.V2])
        ? reportTemplateApi
        : wordTemplateApi,
    [],
  );

  const [visible, setVisible] = useState(false);
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [templateData, setTemplateData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const getList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apis.findByPagination(currentIndex, pageSize);
      setLoading(false);
      setList(res.data);
      setTotal(res.total);
    } catch (error) {
      setLoading(false);
    }
  }, [apis, currentIndex, pageSize]);
  const title = useMemo(() => {
    return templateData
      ? t('page.config.wordTemplate.uploadTestReportTemplate')
      : t('page.config.wordTemplate.editorTestReportTemplate');
  }, [templateData, t]);
  useEffect(() => {
    getList();
  }, [getList]);

  const templateConfig = record => {
    setTemplateData(record);
    setVisible(true);
  };

  const templateDelete = record => {
    Modal.confirm({
      centered: true,
      title: t('page.config.wordTemplate.deleteTemplate'),
      content: t('page.config.wordTemplate.areYouSureToDeleteThisTemplate'),
      onOk: async () => {
        try {
          await apis.delete({ objectId: record.objectId });
          getList();
          message.success(t('common.deleteSuccess'));
          // 删除模板数据后删除文件
          const arr = record.file?.href?.split('/') || [];
          const fileName = arr[arr.length - 1];
          if (fileName) {
            Parse.Cloud.run('deleteFile', {
              fileName: fileName,
            });
          }
        } catch (error) {
          message.error(error?.message || t('common.deleteFail'));
        }
      },
    });
  };
  const handleCancel = () => {
    setVisible(false);
  };
  const handleSubmit = async value => {
    try {
      // 编辑
      if (templateData) {
        await apis.edit({ ...value, objectId: templateData.objectId });
      } else {
        // 新建
        await apis.create(value);
      }
      getList();
      setVisible(false);
      message.success(t('common.actionSuccess'));
    } catch (error) {
      message.error(error?.message || t('common.actionFail'));
    }
  };
  const addTemplate = () => {
    setVisible(true);
    setTemplateData(null);
  };
  const pageChange = pageIndex => {
    setCurrentIndex(pageIndex);
  };
  const showSizeChange = pageSize => {
    setPageSize(pageSize);
  };
  return (
    <div className={cx('word-template')}>
      <div className={cx('word-template-btn')}>
        {!loading &&
          (judgeTestReportVersion([TEST_REPORT_VERSION.V1, TEST_REPORT_VERSION.V2]) ||
            list.length === 0) && (
            <Button onClick={addTemplate} type="primary">
              {t('page.config.wordTemplate.uploadTemplate')}
            </Button>
          )}
      </div>
      {visible && (
        <TemplateModal
          visible={visible}
          handleCancel={handleCancel}
          handleSubmit={handleSubmit}
          templateData={templateData}
          title={title}
        />
      )}
      <Table
        loading={loading}
        size="small"
        rowKey="objectId"
        columns={columns}
        dataSource={list}
        pagination={{
          size: 'small',
          showTotal(total) {
            return `${t('common.tableTotal.0')} ${total} ${t('common.tableTotal.1')}`;
          },
          pageSizeOptions: ['10', '30', '50'],
          showSizeChanger: true,
          current: currentIndex,
          // pageSize: pageSize,
          onChange: pageChange,
          onShowSizeChange: showSizeChange,
          total: total,
        }}
      />
    </div>
  );
};

export default WordTemplate;
