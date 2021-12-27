import React from 'react';
import { Button, message, Input, Select, Radio, Layout, Form } from '@osui/ui';
import { useLocalStorageState, useMount } from 'ahooks';
import { merge } from 'lodash';

const DEV_STORAGE_KEY = 'test_manager_dev';

// 环境域名
const urlOptions = [
  {
    env: 'one',
    label: 'huishang2 集成环境',
    value: 'http://proxima.huishang2.gitee.work/api/project',
  },
  {
    env: 'single',
    label: '81.61 独立部署',
    value: 'http://192.168.81.61',
  },
];

const Dev: React.FC = () => {
  const [devConfig, setDevConfig] = useLocalStorageState(DEV_STORAGE_KEY, {
    defaultValue: {},
  });

  const [form] = Form.useForm();

  const handleValuesChange = (_, values) => {
    setDevConfig(merge(devConfig, values));
  };

  return (
    <Layout style={{ display: 'flex', height: '100vh' }}>
      <Layout.Header>
        <h1 style={{ color: '#fff' }}>本地开发环境配置页面</h1>
      </Layout.Header>
      <Layout.Content style={{ padding: 30 }}>
        <Form form={form} initialValues={devConfig} onValuesChange={handleValuesChange}>
          <>
            <Form.Item
              name="env"
              tooltip={{ title: 'eg: 集成环境 one.huishang2' }}
              label="proxima 部署环境"
            >
              <Radio.Group>
                <Radio.Button value="one">one 集成部署</Radio.Button>
                <Radio.Button value="single">独立部署</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item name="baseURL" tooltip={{ title: '环境名' }} label="BASE_URL">
              <Select>
                {urlOptions.map(url => (
                  <Select.Option
                    disabled={url.env === form.getFieldValue('env')}
                    key={url.value}
                    {...url}
                  >
                    {url.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="actor" tooltip={{ title: '模拟用户信息' }} label="模拟用户信息">
              <Input />
            </Form.Item>
          </>

          <>
            <Form.Item
              name="workspaceKey"
              tooltip={{ title: 'workspace_key' }}
              label="mock_workspace_key"
            >
              <Input />
            </Form.Item>
            <Form.Item name="itemId" tooltip={{ title: 'item_id' }} label="mock_item_id">
              <Input />
            </Form.Item>
          </>
        </Form>
      </Layout.Content>
    </Layout>
  );
};

export default Dev;
