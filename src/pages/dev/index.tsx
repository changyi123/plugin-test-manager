import React from 'react';
import { Button, message, Input, Select, Radio, Layout, Form, Collapse } from 'antd';
import { useLocalStorageState, useSafeState } from 'ahooks';
import { merge } from 'lodash';
import Parse from '@/lib/parse';

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
    defaultValue: {} as any,
  });
  const [env, setEnv] = useSafeState(devConfig.env);

  const [form] = Form.useForm();
  const login = async () => {
    await Parse.User.logIn(devConfig.username, devConfig.password);
    message.success(`用户【${devConfig.username}】登录成功`);
  };

  const handleValuesChange = (changedVal, values) => {
    setDevConfig(merge(devConfig, values));
    setEnv(values.env);
  };

  return (
    <Layout style={{ display: 'flex', height: '100vh' }}>
      <Layout.Header>
        <h1 style={{ color: '#fff' }}>本地开发环境配置页面</h1>
      </Layout.Header>
      <Layout.Content style={{ padding: 30 }}>
        <Form form={form} initialValues={devConfig} onValuesChange={handleValuesChange}>
          <Collapse defaultActiveKey={['mock']}>
            <Collapse.Panel header="mock 数据" key="mock">
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
            </Collapse.Panel>
            <Collapse.Panel header="调试环境" key="env">
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
                    <Select.Option disabled={url.env !== env} key={url.value} {...url}>
                      {url.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Collapse.Panel>

            {env === 'one' ? (
              <Collapse.Panel header="环境数据配置" key="dev">
                <Form.Item name="actor" tooltip={{ title: '模拟用户信息' }} label="模拟用户信息">
                  <Input />
                </Form.Item>
              </Collapse.Panel>
            ) : null}

            {env === 'single' ? (
              <Collapse.Panel header="环境数据配置" key="dev">
                {/* <Form.Item
                  name="devMode"
                  tooltip={{ title: '开发模式，是否是嵌入proxima-app开发' }}
                  label="开发模式"
                >
                  <Radio.Group>
                    <Radio value="normal">单独启动</Radio>
                    <Radio value="embed">嵌入 proxima-app</Radio>
                  </Radio.Group>
                </Form.Item> */}
                <Form.Item name="username" tooltip={{ title: '输入账号' }} label="账号">
                  <Input />
                </Form.Item>
                <Form.Item name="password" tooltip={{ title: '密码' }} label="输入密码">
                  <Input />
                </Form.Item>
                <Button onClick={login} type="primary">
                  登录
                </Button>
              </Collapse.Panel>
            ) : null}
          </Collapse>
        </Form>
      </Layout.Content>
    </Layout>
  );
};

export default Dev;
