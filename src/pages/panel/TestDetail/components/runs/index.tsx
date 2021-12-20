import React from 'react';
import { Button, Space, Spin, Empty } from '@osui/ui';
import AddTestExecutionModal from './components/AddTestExecutionModal';
// import ExtendTestExecutionModal from './components/ExtendTestExecutionModal';
import Table from './components/Table';
import { useRequest } from 'ahooks';
import { GetTestRunsById } from '@/lib/api/runs';

import css from './index.less';

export const RunsContext = React.createContext<{ refresh?: () => void }>({});

const Runs: React.FC = () => {
  const itemId: string = window?.QiankunProps?.context?.itemId || 'bcOBXkAodq';
  const { data, error, loading, refresh } = useRequest(() => GetTestRunsById(itemId));
  if (error) {
    return <div>加载失败,原因{error?.message}</div>;
  }
  if (loading) {
    return <Spin tip="加载中..."></Spin>;
  }
  if (!data?.data?.length) {
    return <Empty description="测试运行为空，请创建测试执行"></Empty>;
  }
  console.log('data?.data', data?.data);

  return (
    <RunsContext.Provider
      value={{
        refresh,
      }}
    >
      <div className={css('runs')}>
        <div className={css('runs__new')}>
          <Space>
            <AddTestExecutionModal
              trigger={<Button type="primary">新增测试执行</Button>}
              itemId={itemId}
            />
            {/* <ExtendTestExecutionModal
            trigger={<Button type="primary">继承测试执行</Button>}
            itemId={itemId}
          /> */}
          </Space>
        </div>

        <div className={css('runs__content')}>
          {data?.data?.length ? (
            <Table data={data} />
          ) : (
            <Empty description="测试运行为空，请创建测试执行"></Empty>
          )}
        </div>
      </div>
    </RunsContext.Provider>
  );
};

export default Runs;
