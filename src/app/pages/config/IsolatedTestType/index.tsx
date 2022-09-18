import React from 'react';

import { useSafeState } from 'ahooks';
import { pick, difference } from 'lodash';
import { Select, Button, Checkbox, message } from 'antd';

import { useDataContext, useCurrentTestConfig } from '../hooks';
import { TestTypeNameMapping, TestType } from '@/lib/constants';

import cx from './index.less';

// 所有隔离类型配置
const AllIsolateTestType = [TestType.TestDefect, TestType.Case, TestType.Execution, TestType.Plan];

// 判断所有测试类型是否都被设置空间隔离
const isIsolateAllTestType = (isolation: string[]) => {
  return difference(AllIsolateTestType, isolation).length === 0;
};

// 默认隔离方案配置
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

const IsolatedTestType = () => {
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
    message.success('空间数据隔离配置保存成功');
  };

  React.useEffect(() => {
    const isolateTestType = testConfig?.get('isolateTestType');
    // 默认隔离测试实体类型配置
    const defaultIsolateTestType = DefaultIsolateMode === 'disabled' ? AllIsolateTestType : [];
    setIsolateTestType(isolateTestType ? isolateTestType : defaultIsolateTestType);
    setIsolateMode(isIsolateAllTestType(isolateTestType) ? 'disabled' : 'enabled');
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
              TestType.Case,
              TestType.Plan,
              TestType.Execution,
              TestType.TestDefect,
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

export default IsolatedTestType;
