import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Parse from '@/lib/parse';
import { WordTemplate as WordTemplateObject } from '@/lib/models';
import { FileType } from '@/lib/types/Test';
import { Button, Table, message, Space, Modal } from 'antd';
import TemplateModal from './TemplateModal';
import useI18n from '@/lib/hooks/useI18n';
import cx from './index.less';

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

const WordTemplate: React.FC = () => {
  const { t } = useI18n();
  const columns = [
    {
      title: t('page.config.wordTemplate.templateName'),
      dataIndex: 'name',
    },
    {
      title: t('common.action'),
      dataIndex: 'action',
      render: (text, record) => {
        return (
          <Space size="middle">
            <a onClick={() => templateConfig(record)}>{t('common.editor')}</a>
            <a onClick={() => templateDelete(record)}>{t('common.delete')}</a>
          </Space>
        );
      },
      width: 100,
    },
  ];

  const [visible, setVisible] = useState(false);
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [templateData, setTemplateData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const getList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await wordTemplateApi.findByPagination(currentIndex, pageSize);
      setLoading(false);
      setList(res.data);
      setTotal(res.total);
    } catch (error) {
      setLoading(false);
    }
  }, [currentIndex, pageSize]);
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
          await wordTemplateApi.delete({ objectId: record.objectId });
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
        await wordTemplateApi.edit({ ...value, objectId: templateData.objectId });
      } else {
        // 新建
        await wordTemplateApi.create(value);
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
        <Button onClick={addTemplate} type="primary">
          {t('page.config.wordTemplate.uploadTemplate')}
        </Button>
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
