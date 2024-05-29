import { Empty, message, Select, SelectProps, Spin } from 'antd';
import { isEqual } from 'lodash';
import { components } from 'proxima-sdk';
import React, { useCallback, useMemo, useState } from 'react';

import { usePluginWorkspace } from '@/components/business/TestEntitySelectorModal/hooks';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { TestConfig as TestConfigModel } from '@/services/models';

import cx from './WorkspaceSelector.less';

const { ItemIcon: WorkspaceIcon } = components.Components.Common;

const WorkspaceSelector: React.FC<
  SelectProps & {
    wrapClassName?: string;
    onChange?: (value: any) => void;
    hiddenLabel?: boolean;
    showCurrent?: boolean;
  }
> = ({
  value,
  onChange,
  hiddenLabel = false,
  showCurrent = false,
  wrapClassName,
  ...otherProps
}) => {
  const [keyword, setKeyword] = useState('');
  const { t } = useI18n();
  const TestConfig = useTestConfig();

  const currentItemTypeMap = useMemo(
    () => TestConfig?.config?.itemTypeMap,
    [TestConfig?.config?.itemTypeMap],
  );

  const [open, setOpen] = useState(false);

  const switchOpen = useCallback(() => setOpen(v => !v), []);

  const { workspaces: options, loading } = usePluginWorkspace({
    keyword,
    currentWorkspace: TestConfig?.workspace?.key,
    showCurrent,
  });

  const beforeChange = useCallback(
    async workspaceKey => {
      // 比较类型映射是否匹配
      const targetConfig = await new Parse.Query(TestConfigModel as any)
        .equalTo('workspaceKey', workspaceKey)
        .first();
      if (!isEqual(currentItemTypeMap, targetConfig?.toJSON()?.itemTypeMap)) {
        return message.error('类型关联不匹配');
      }
      onChange(workspaceKey);
    },
    [currentItemTypeMap, onChange],
  );

  return (
    <div className={wrapClassName ?? cx('workspace-selector-wrap')}>
      {!hiddenLabel && (
        <span className={cx('workspace-selector-label')}>{t('page.config.selectWorkspace')}</span>
      )}
      <Select
        className={cx('workspace-selector')}
        showSearch
        open={open}
        loading={loading}
        value={value}
        labelInValue
        filterOption={false}
        placeholder={t('page.config.workspaceSelectorModal.placeholder')}
        options={options}
        onSearch={setKeyword}
        onChange={beforeChange}
        onClick={() => switchOpen()}
        onBlur={e => {
          e?.relatedTarget && setOpen(false);
        }}
        dropdownRender={() => {
          return (
            <div className={cx('workspace-selector-dropdown')}>
              {options.map(option => (
                <div
                  key={option.key}
                  className={cx('workspace-selector-dropdown-item')}
                  onClick={() => beforeChange(option.key)}
                >
                  <WorkspaceIcon icon={option.icon} />
                  <span className={cx('workspace-selector-dropdown-text')} title={option.name}>
                    {option.name}
                  </span>
                </div>
              ))}
              {!loading && !options?.length && (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={<>{t('common.noData')}</>}
                ></Empty>
              )}
            </div>
          );
        }}
        notFoundContent={
          loading ? (
            <Spin />
          ) : (
            <div>{`${t('components.business.testEntitySelectorModal.notFound')}`}</div>
          )
        }
        {...otherProps}
      ></Select>
    </div>
  );
};

export default WorkspaceSelector;
