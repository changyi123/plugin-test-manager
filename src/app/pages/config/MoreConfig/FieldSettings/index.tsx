import { Table } from 'antd';
import { TestFiledKeyMapping } from 'common/constant';
import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { AutoResizer } from 'react-base-table';

import { searchFields } from '@/lib/api/proxima';
import useI18n from '@/lib/hooks/useI18n';

import TranslateModal from './TranslateModal';

const TEST_MANAGER_FIELD_KEYS = Object.values(TestFiledKeyMapping);

const FieldSettings: React.FC = () => {
  const [fields, setFields] = useState([]);
  const [fieldData, setFieldData] = useState({});
  const [translateVisible, setTranslateVisible] = useState(false);
  const { t } = useI18n();

  const getFields = useCallback(async () => {
    searchFields({
      keys: TEST_MANAGER_FIELD_KEYS,
      propertyNames: ['name', 'key', 'objectId', 'description'],
    }).then(setFields);
  }, [setFields]);

  useEffect(() => {
    getFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMenuClick = useCallback(
    data => {
      setFieldData(data);
      setTranslateVisible(true);
    },
    [setFieldData],
  );

  const handleTranslateCancel = useCallback(() => {
    setTranslateVisible(false);
    getFields();
  }, [getFields]);

  const columns = [
    {
      key: 'name',
      title: t('common.title'),
      dataIndex: 'name',
    },
    {
      key: 'key',
      title: 'key',
      dataIndex: 'key',
    },
    {
      key: 'description',
      title: t('common.description'),
      dataIndex: 'description',
    },
    {
      key: 'action',
      title: t('common.action'),
      render: (_, rowData) => {
        return <a onClick={_ => handleMenuClick(rowData)}>{t('common.translation')}</a>;
      },
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={fields}
        pagination={false}
        scroll={{ y: 'max-content' }}
      />

      {translateVisible ? (
        <Suspense fallback={null}>
          <TranslateModal
            fieldType="CustomField"
            fieldData={fieldData}
            visible={translateVisible}
            onCancel={handleTranslateCancel}
          />
        </Suspense>
      ) : null}
    </>
  );
};

export default FieldSettings;
