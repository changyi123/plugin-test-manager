import { useSafeState } from 'ahooks';
import { Button, Checkbox, message, Select } from 'antd';
import { difference, pick } from 'lodash';
import React from 'react';

import { TestType, TestTypeNameMapping } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';

import { useCurrentTestConfig, useDataContext } from '../hooks';
import cx from './index.less';

// 所有隔离类型配置
const AllIsolateTestType = [
  TestType.TestDefect,
  TestType.Case,
  TestType.Execution,
  TestType.Plan,
  TestType.CaseSet,
];

// 判断所有测试类型是否都被设置空间隔离
const isIsolateAllTestType = (isolation: string[]) => {
  return difference(AllIsolateTestType, isolation).length === 0;
};

// 默认隔离方案配置
const DefaultIsolateMode = 'disabled';

const isolateModeSelectOptions = t => [
  {
    label: t('page.config.isolatedTestType.operableCrossSpaceTestData'),
    value: 'enabled',
  },
  {
    label: t('page.config.isolatedTestType.notOperableCrossSpaceTestData'),
    value: 'disabled',
  },
];

const IsolatedTestType = () => {
  const { t } = useI18n();
  const { workspace } = useDataContext();
  const workspaceKey = workspace?.key;
  const [isolateMode, setIsolateMode] = useSafeState<'enabled' | 'disabled'>(DefaultIsolateMode);
  const [isolateTestType, setIsolateTestType] = useSafeState([]);

  const testConfig = useCurrentTestConfig(workspaceKey);

  const handleSave = async () => {
    const willUpdateIsolateTestType =
      isolateMode === 'disabled' ? AllIsolateTestType : isolateTestType;
    await testConfig.save({
      isolateTestType: willUpdateIsolateTestType,
    });
    message.success(t('page.config.isolatedTestType.workspaceDataIsolationConfigSaveSuccess'));
  };

  React.useEffect(() => {
    const isolateTestType = testConfig?.get('isolateTestType');
    // 默认隔离测试实体类型配置
    const defaultIsolateTestType = DefaultIsolateMode === 'disabled' ? AllIsolateTestType : [];
    setIsolateTestType(Array.isArray(isolateTestType) ? isolateTestType : defaultIsolateTestType);
    setIsolateMode(isIsolateAllTestType(isolateTestType) ? 'disabled' : 'enabled');
  }, [setIsolateMode, setIsolateTestType, testConfig]);

  return (
    <div>
      <Select
        value={isolateMode}
        className={cx('select')}
        options={isolateModeSelectOptions(t)}
        onChange={value => setIsolateMode(value as any)}
      />
      {isolateMode === 'enabled' ? (
        <div className={cx('specific')}>
          <p>{t('page.config.isolatedTestType.crossSpaceTestDataActionConfig')}</p>
          {Object.entries(
            pick(TestTypeNameMapping, [
              TestType.Case,
              TestType.Plan,
              TestType.Execution,
              TestType.TestDefect,
              TestType.CaseSet,
            ]),
          ).map(([type, name]) => (
            <div key={type}>
              <Checkbox
                onChange={e => {
                  setIsolateTestType(testTypes => {
                    const checked = e.target.checked;
                    return checked
                      ? testTypes.filter(item => item !== type)
                      : testTypes.concat(type);
                  });
                }}
                checked={!isolateTestType.includes(type)}
              />
              <span className={cx('action-name')}>
                {t('page.config.isolatedTestType.canBeCreatedAndAssociatedCrossSpace')}
                {t(`common.${name}`)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <Button type="primary" className={cx('action-btn')} onClick={handleSave}>
        {t('common.save')}
      </Button>
    </div>
  );
};

export default IsolatedTestType;
