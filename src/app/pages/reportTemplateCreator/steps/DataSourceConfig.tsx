import { Button, message, Select, Table } from 'antd';
import { useAtomValue } from 'jotai';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { DeleteOutlined } from '@/icons';
import {
  DataSource,
  DataSourceCollection,
  genDataSourceConfigUid,
  TemplateDataSourceConfig,
} from '@/lib/testReport';
import { testConfigMutation, testReportMutation } from '@/services/mutation';
import { testConfigQuery, testReportQuery } from '@/services/query';

import { ActionRefType } from '../index';
import { testReportWitchConnectWithLocationAtom } from '../store';
import cx from './DataSourceConfig.less';

const FirstLevelDataSourceCollection = DataSourceCollection.filter(ds => ds.isFirstLevel);
const SecondLevelDataSourceCollection = DataSourceCollection.filter(ds => !ds.isFirstLevel);

/** 数据源选择器 */
const DataSourceSelector: React.FC<{
  actionRef: React.MutableRefObject<{
    resetSelector: () => void;
  }>;
  onAddDataSource: (value: TemplateDataSourceConfig) => void;
}> = ({ actionRef, onAddDataSource }) => {
  const [dataSourceConfig, setDataSourceConfig] = React.useState([]);
  const [secondLevelDataSource, setSecondLevelDataSource] = React.useState<DataSource[]>([]);

  const { t: scopedT } = useTranslation('', {
    keyPrefix: 'page.reportTemplateCreator.dataSourceConfig',
  });

  const resetSelector = () => {
    setDataSourceConfig([]);
    setSecondLevelDataSource([]);
  };

  React.useImperativeHandle(actionRef, () => ({
    resetSelector,
  }));

  const selectOptionsBuilder = (dataSource: DataSource[]) =>
    dataSource.map(ds => ({
      label: scopedT(`label.${ds.key}`),
      value: ds.key,
    }));

  const selectChangeHandler = isFirstLevel => data => {
    if (isFirstLevel) {
      const secondLevelDataSource = SecondLevelDataSourceCollection.filter(ds =>
        Array.isArray(ds.dependOn) ? ds.dependOn.includes(data) : true,
      );
      setSecondLevelDataSource(secondLevelDataSource);
      setDataSourceConfig([data]);
    } else {
      setDataSourceConfig(prevDs => [prevDs[0], data]);
    }
  };

  // 添加数据源
  const handleAddDataSource = () => {
    if (dataSourceConfig.length === 0) return;
    onAddDataSource(
      dataSourceConfig.map(dsKey =>
        DataSourceCollection.find(ds => ds.key === dsKey),
      ) as TemplateDataSourceConfig,
    );
  };

  return (
    <div className={cx('data-selector')}>
      <Select
        className={cx('select')}
        value={dataSourceConfig[0]}
        onChange={selectChangeHandler(true)}
        options={selectOptionsBuilder(FirstLevelDataSourceCollection)}
      />
      <Select
        className={cx('select')}
        value={dataSourceConfig[1]}
        onChange={selectChangeHandler(false)}
        disabled={dataSourceConfig.length === 0}
        options={selectOptionsBuilder(secondLevelDataSource)}
      />
      <Button
        className={cx('button')}
        onClick={handleAddDataSource}
        disabled={!dataSourceConfig[0]}
        type="primary"
      >
        {scopedT('button.addDataSource')}
      </Button>
    </div>
  );
};

/** 数据源关联 */
const DataSourceBinding: React.FC<{
  reportDataSourceFlattenData: any[];
  onDataConfigTemplateChange: (value: Record<string, TemplateDataSourceConfig>) => void;
}> = ({ reportDataSourceFlattenData, onDataConfigTemplateChange }) => {
  const testReportTemplateData = useAtomValue(testReportWitchConnectWithLocationAtom);

  const [templateDataSourceConfig, setTemplateDataSourceConfig] = React.useState(
    {} as Record<string, TemplateDataSourceConfig>,
  );

  const { data: chartGroupData } = testReportQuery.useChartGroupQuery({
    id: testReportTemplateData.chartGroup?.objectId,
    includeChart: true,
  });

  const { t: scopedT } = useTranslation('', {
    keyPrefix: 'page.reportTemplateCreator.dataSourceConfig',
  });

  // 同步到父组件
  React.useEffect(() => {
    onDataConfigTemplateChange(templateDataSourceConfig);
  }, [onDataConfigTemplateChange, templateDataSourceConfig]);

  React.useEffect(() => {
    if (testReportTemplateData.templateConfig) {
      setTemplateDataSourceConfig(testReportTemplateData.templateConfig.dataSource);
    }
  }, [testReportTemplateData]);

  // 选中下来框
  const handleSelectOption = (dataSourceConfig, rowData) => {
    setTemplateDataSourceConfig(prev => ({
      ...prev,
      [rowData.chartId]: dataSourceConfig,
    }));
  };

  const columns = [
    {
      title: scopedT('table.title.chartName'),
      dataIndex: 'chartName',
    },
    {
      title: scopedT('table.title.dataSource'),
      dataIndex: 'dataSource',
      render: (_, rowData) => {
        const { chartId } = rowData;
        const options =
          reportDataSourceFlattenData?.map(ds => ({
            ...ds,
            value: ds.key,
          })) ?? [];

        const dataConfig = templateDataSourceConfig[chartId];
        const value = dataConfig ? genDataSourceConfigUid(dataConfig) : null;

        return (
          <Select
            value={value}
            options={options}
            style={{ width: 250 }}
            onSelect={(_, opt) => handleSelectOption(opt.original, rowData)}
          />
        );
      },
    },
  ];

  const dataSource =
    chartGroupData?.charts.map(chart => ({
      key: chart.objectId,
      chartId: chart.objectId,
      chartName: chart.name,
    })) ?? [];

  return (
    <Table
      columns={columns}
      pagination={false}
      className={cx('table')}
      dataSource={dataSource}
      scroll={{ x: 500 }}
    />
  );
};

const DataSourceConfig: React.FC<{ actionRef: React.MutableRefObject<ActionRefType> }> = ({
  actionRef,
}) => {
  const { t: scopedT } = useTranslation('', {
    keyPrefix: 'page.reportTemplateCreator.dataSourceConfig',
  });

  const dataSourceSelectorActionRef = React.useRef(null);
  const templateDataSourceConfigDataRef = React.useRef(null);
  const { mutateAsync: updateTestConfig } = testConfigMutation.useTestConfigUpdateMutation();
  const { mutateAsync: updateTestReport } = testReportMutation.useTestReportUpdateMutation();
  const { data: globalTestConfig } = testConfigQuery.useGlobalTestConfig();
  const testReportTemplateData = useAtomValue(testReportWitchConnectWithLocationAtom);

  const extraConfig = globalTestConfig?.extra;
  const reportDataSource = extraConfig?.reportDataSource;

  React.useImperativeHandle(actionRef, () => ({
    goNextButtonClick: async () => {
      const dataSource = templateDataSourceConfigDataRef.current;
      await updateTestReport({
        objectId: testReportTemplateData.objectId,
        templateConfig: {
          ...testReportTemplateData.templateConfig,
          dataSource,
        },
      });
      message.success(scopedT('message.dataSourceConfigSaveSuccess'));
      // 跳转会原链接
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has('redirectLink')) {
        window.open(decodeURIComponent(searchParams.get('redirectLink')), '_self');
      }
    },
  }));

  const handleDataConfigTemplateChange = templateDataSourceConfig => {
    templateDataSourceConfigDataRef.current = templateDataSourceConfig;
  };

  const handleAddDataSource = async dataSource => {
    if (Array.isArray(reportDataSource)) {
      const updateDataSourceUid = genDataSourceConfigUid(dataSource);
      const existedDataSourceUidList = reportDataSource.map(genDataSourceConfigUid);
      // 已存在则不添加
      if (existedDataSourceUidList.includes(updateDataSourceUid)) {
        dataSourceSelectorActionRef.current.resetSelector();
        return message.warning(scopedT('message.dataSourceExisted'));
      }

      extraConfig.reportDataSource = extraConfig.reportDataSource.concat([dataSource]);
    } else {
      extraConfig.reportDataSource = [dataSource];
    }

    await updateTestConfig({
      objectId: globalTestConfig.objectId,
      extra: extraConfig,
    });

    dataSourceSelectorActionRef.current.resetSelector();
    message.success(scopedT('message.addDataSourceSuccess'));
  };

  const handleDeleteDataSource = async dataSourceConfigUid => {
    if (Array.isArray(reportDataSource)) {
      const reservedDataSource = reportDataSource.filter(
        ds => genDataSourceConfigUid(ds) !== dataSourceConfigUid,
      );

      extraConfig.reportDataSource = reservedDataSource;

      await updateTestConfig({
        objectId: globalTestConfig.objectId,
        extra: extraConfig,
      });

      message.success(scopedT('message.deleteDataSourceSuccess'));
    }
  };

  const reportDataSourceFlattenData =
    reportDataSource?.map(ds => ({
      key: genDataSourceConfigUid(ds),
      label: ds.map(ds => scopedT(`label.${ds.key}`)).join('，'),
      original: ds,
    })) ?? [];

  return (
    <div className={cx('container')}>
      <h3 className={cx('title')}>{scopedT('title')}</h3>
      <div className={cx('data-setting')}>
        <div className={cx('subtitle')}>{scopedT('subtitle.addDataSource')}</div>
        <DataSourceSelector
          onAddDataSource={handleAddDataSource}
          actionRef={dataSourceSelectorActionRef}
        />
        <div className={cx('list')}>
          {Array.isArray(reportDataSource) &&
            reportDataSourceFlattenData.map(ds => (
              <div className={cx('item')} key={ds.key}>
                <span>{ds.label}</span>
                <a onClick={() => handleDeleteDataSource(ds.key)}>
                  <DeleteOutlined />
                </a>
              </div>
            ))}
        </div>
      </div>
      <div className={cx('data-bind')}>
        <div className={cx('subtitle')}>{scopedT('subtitle.bindDataSource')}</div>
        <DataSourceBinding
          reportDataSourceFlattenData={reportDataSourceFlattenData}
          onDataConfigTemplateChange={handleDataConfigTemplateChange}
        />
      </div>
    </div>
  );
};

export default React.memo(DataSourceConfig);
