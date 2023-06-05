import { Button, message, Select } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  DataSource,
  DataSourceCollection,
  genDataSourceConfigUid,
  TemplateDataSourceConfig,
} from '@/lib/testReport';
import { testConfigMutation } from '@/services/mutation';
import { testConfigQuery, testReportQuery } from '@/services/query';

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
      label: scopedT(`select.labels.${ds.key}`),
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
        {scopedT('buttons.addDataSource')}
      </Button>
    </div>
  );
};

/** 数据源关联 */
const DataSourceBinding: React.FC = () => {
  // TODO: 查询的模板 Id
  // const { data: templateData } = testReportQuery.useTemplateQuery({ id: '1' });
  const { data: chartGroupData } = testReportQuery.useChartGroupQuery({
    // id: templateData?.chartGroup.objectId,
    id: 'X1ZqULzaUM',
    includeChart: true,
  });

  console.info(chartGroupData?.charts);

  return null;
};

const DataSourceConfig: React.FC = () => {
  const { t: scopedT } = useTranslation('', {
    keyPrefix: 'page.reportTemplateCreator.dataSourceConfig',
  });

  const dataSourceSelectorActionRef = React.useRef(null);
  const { mutateAsync: updateTestConfig } = testConfigMutation.useTestConfigMutation();
  const { data: globalTestConfig, refetch: refetchGlobalTestConfig } =
    testConfigQuery.useGlobalTestConfig();

  const extraConfig = globalTestConfig?.extra;
  const reportDataSource = extraConfig?.reportDataSource;

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
    refetchGlobalTestConfig();
    dataSourceSelectorActionRef.current.resetSelector();
    message.success(scopedT('message.addDataSourceSuccess'));
  };

  return (
    <div className={cx('container')}>
      <h3 className={cx('title')}>{scopedT('title')}</h3>
      <div className={cx('data-setting')}>
        <div>
          <DataSourceSelector
            onAddDataSource={handleAddDataSource}
            actionRef={dataSourceSelectorActionRef}
          />
          <div>
            {Array.isArray(reportDataSource) &&
              reportDataSource.map(ds => <li key={genDataSourceConfigUid(ds)}>{scopedT('')}</li>)}
          </div>
        </div>
        <DataSourceBinding />
      </div>
      <div className={cx('data-bind')}></div>
    </div>
  );
};

export default React.memo(DataSourceConfig);
