import React from 'react';

import { pick } from 'lodash';
import { Select, Button, Checkbox, message } from '@osui/ui';
import { hasArrayItem } from '@/lib/utils/helper';
import { useSafeState } from 'ahooks';

import { useDataContext, useCurrentTestConfig } from '../hooks';
import { TestTypeNameMapping, TestType } from '@/lib/constants';

import cx from './index.less';

const DefaultIsolateMode = 'disabled';

const isolateModeSelectOptions = [
  {
    label: '可操作跨空间的测试数据',
    value: 'enabled',
  },
  {
    label: '不可操作跨空间测试数据',
    value: 'disabled',
  },
];

const IsolateTestType = () => {
  const { workspace } = useDataContext();
  const workspaceKey = workspace?.key;
  const [isolateMode, setIsolateMode] = useSafeState<'enabled' | 'disabled'>(DefaultIsolateMode);
  const [isolateTestType, setIsolateTestType] = useSafeState([]);

  const testConfig = useCurrentTestConfig(workspaceKey);

  const handleSave = async () => {
    const willUpdateIsolateTestType = isolateMode === 'enabled' ? isolateTestType : [];
    await testConfig.save({
      isolateTestType: willUpdateIsolateTestType,
    });
    message.success('空间数据隔离配置保存成功');
  };

  React.useEffect(() => {
    const isolateTestType = testConfig?.get('isolateTestType');
    setIsolateTestType(isolateTestType ?? []);
    setIsolateMode(hasArrayItem(isolateTestType) ? 'enabled' : 'disabled');
  }, [setIsolateMode, setIsolateTestType, testConfig]);

  return (
    <div>
      <Select
        value={isolateMode}
        className={cx('select')}
        options={isolateModeSelectOptions}
        onChange={value => setIsolateMode(value as any)}
      />
      {isolateMode === 'enabled' ? (
        <div className={cx('specific')}>
          <p>跨空间测试数据操作配置</p>
          {Object.entries(
            pick(TestTypeNameMapping, [
              TestType.TestDetail,
              TestType.TestPlan,
              TestType.TestExecution,
              TestType.TestDefect,
            ]),
          ).map(([type, name]) => (
            <div key={type}>
              <Checkbox
                onChange={e => {
                  setIsolateTestType(testTypes => {
                    const checked = e.target.checked;
                    return checked
                      ? testTypes.concat(type)
                      : testTypes.filter(item => item !== type);
                  });
                }}
                checked={isolateTestType.includes(type)}
              />
              <span className={cx('action-name')}>可跨空间创建，关联{name}</span>
            </div>
          ))}
        </div>
      ) : null}
      <Button type="primary" className={cx('action-btn')} onClick={handleSave}>
        保存
      </Button>
    </div>
  );
};

export default IsolateTestType;
