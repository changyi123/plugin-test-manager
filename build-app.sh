#!/bin/bash

commit=$(git log --oneline | cut -d$'\n' -f1)
branch=$(git rev-parse --abbrev-ref HEAD)

# 浪潮环境需要隐藏掉页面
workspacePageHidden="hidden: false"

while true; do
    read -p "是否要隐藏测试管理面板？" i
    case $i in
        [Yy1]* ) workspacePageHidden="hidden: true"; break;;
        * ) break;;
    esac
done

sed -e "s/{workspacePageHidden}/${workspacePageHidden}/g" manifest.yml.tmpl > manifest.yml

yarn && yarn build -- --env PROXIMA_COMMIT="$commit" PROXIMA_BRANCH="$branch"
rm -rf test-manager-plugin.zip
zip -r test-manager-plugin.zip dist trigger manifest.yml
