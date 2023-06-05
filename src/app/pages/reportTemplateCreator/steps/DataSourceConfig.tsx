import { Button, Select } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { DataSource, DataSourceCollection, TemplateDataSourceConfig } from '@/lib/testReport';
import { testReportQuery } from '@/services/query';

import cx from './DataSourceConfig.less';

const FirstLevelDataSourceCollection = DataSourceCollection.filter(ds => ds.isFirstLevel);
const SecondLevelDataSourceCollection = DataSourceCollection.filter(ds => !ds.isFirstLevel);

/** 数据源选择器 */
const DataSourceSelector: React.FC<{
  onChange: (value: TemplateDataSourceConfig) => void;
}> = ({ onChange }) => {
  const [dataSourceConfig, setDataSourceConfig] = React.useState([]);
  const [secondLevelDataSource, setSecondLevelDataSource] = React.useState<DataSource[]>([]);

  const { t: scopedT } = useTranslation('', {
    keyPrefix: 'page.reportTemplateCreator.dataSourceConfig',
  });

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
    onChange(
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
      <Button className={cx('button')} onClick={handleAddDataSource} type="primary">
        {scopedT('buttons.addDataSource')}
      </Button>
    </div>
  );
};

/** 数据源关联 */
const DataSourceBinding: React.FC = () => {
  // TODO: 查询的模板 Id
  const { data: templateData } = testReportQuery.useTemplateQuery({ id: '1' });
  const {
    data: { charts },
  } = testReportQuery.useChartGroupQuery({
    id: templateData?.chartGroup.objectId,
    includeChart: true,
  });

  console.info(charts);

  return null;
};

const DataSourceConfig: React.FC = () => {
  const { t: scopedT } = useTranslation('', {
    keyPrefix: 'page.reportTemplateCreator.dataSourceConfig',
  });
  return (
    <div className={cx('container')}>
      <h3 className={cx('title')}>{scopedT('title')}</h3>
      <div className={cx('data-setting')}>
        <DataSourceSelector onChange={console.info} />
        <DataSourceBinding />
      </div>
      <div className={cx('data-bind')}></div>
    </div>
  );
};

export default React.memo(DataSourceConfig);
