#!/bin/bash

commit=$(git log --oneline | cut -d$'\n' -f1)
branch=$(git rev-parse --abbrev-ref HEAD)
date=$(date +"%Y-%m-%d %T")

# 构建插件静态资源文件
yarn && yarn build -- --env PROXIMA_VERSION_COMMIT="$commit" PROXIMA_VERSION_BRANCH="$branch" PROXIMA_VERSION_DATE="$date"

buildZip() {
    # dev 包构建
    isDev=$1
    fileExt=''
    workspacePageHidden='hidden: true'
    if $isDev; then
        fileExt='_DEV'
        workspacePageHidden='hidden: false'
    fi
    sed "s/{workspacePageHidden}/${workspacePageHidden}/g" manifest.tmpl.yml >manifest.yml
    yarn build-package
    name=$(awk -F': ' '{if (FNR==2) key=$2; else if (FNR==5) version=$2} END {print key"_"version}' manifest.yml | sed 's/"//g')
    filename="${name}${fileExt}.zip"
    echo $filename
    rm -rf $filename
    cd dist && zip -r $filename * && mv $filename .. && cd ..
}

buildZip false
buildZip true
echo '插件包构建成功'
