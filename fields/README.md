# remote-component-template

远程组件模版仓库

目前react等基础库还没有打包为sdk，所以统一忽略打包导出。

dev命令暂时不可用，可以打包后主项目嵌入。

## 编译

```shell
pnpm run build
```

## 连调

1. 使用 `pnpm run build` 命令编译出文件
2. 执行 `pnpm run server` 启动node服务
3. 执行 `pnpm run ngrok` 启动ngrok
4. 获取到ngrok返回的地址 + /plugin 即为插件地址
