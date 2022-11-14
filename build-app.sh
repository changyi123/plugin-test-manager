#!/bin/bash

commit=$(git log --oneline | cut -d$'\n' -f1)
branch=$(git rev-parse --abbrev-ref HEAD)
date=$(date +"%Y-%m-%d %T")

# 浪潮环境需要隐藏掉页面
workspacePageHidden="hidden: false"

while true; do
    read -p "是否要隐藏测试管理面板? N?" i
    case $i in
    [Yy1]*)
        workspacePageHidden="hidden: true"
        break
        ;;
    *) break ;;
    esac
done

sed "s/{workspacePageHidden}/${workspacePageHidden}/g" manifest.tmpl.yml >manifest.yml
echo -e "branch: $branch\ncommit: \"$commit\"\ndate: $date\n$workspacePageHidden\n" >version.yml

yarn && yarn build -- --env PROXIMA_VERSION_COMMIT="$commit" PROXIMA_VERSION_BRANCH="$branch" PROXIMA_VERSION_DATE="$date"

yarn build-package

filename=$(echo test-manager-plugin-${branch}.zip | sed 's!/!-!g')
rm -rf $filename
cd dist && zip -r $filename * && mv $filename ..
echo '插件包构建成功'
