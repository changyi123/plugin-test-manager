import React, { useState, useEffect, useCallback, useMemo } from 'react';

import Parse from '@/lib/parse';
import { WordTemplate as WordTemplateObject } from '@/lib/models';

import { FileType } from '@/lib/types/Test';
import { Button, Table, message, Space, Modal } from 'antd';
import TemplateModal from './TemplateModal';
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
  const columns = [
    {
      title: '模板名称',
      dataIndex: 'name',
    },
    {
      title: '操作',
      dataIndex: 'action',
      render: (text, record) => {
        return (
          <Space size="middle">
            <a onClick={() => templateConfig(record)}>编辑</a>
            <a onClick={() => templateDelete(record)}>删除</a>
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
    return templateData ? '上传测试报告模板' : '编辑测试报告模板';
  }, [templateData]);
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
      title: '删除模板',
      content: '确定删除该模板吗？',
      onOk: async () => {
        try {
          await wordTemplateApi.delete({ objectId: record.objectId });
          getList();
          message.success('删除成功！');
        } catch (error) {
          message.error(error?.message || '删除失败！');
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
      message.success('操作成功');
    } catch (error) {
      message.error(error?.message || '操作失败');
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
          上传报告模板
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
            return `共 ${total} 条数据`;
          },
          pageSizeOptions: ['10', '30', '50'],
          showSizeChanger: true,
          current: currentIndex,
          pageSize: pageSize,
          onChange: pageChange,
          onShowSizeChange: showSizeChange,
          total: total,
        }}
      />
    </div>
  );
};

export default WordTemplate;
