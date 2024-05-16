#!/bin/bash

# 获取 git 版本信息
tag=$(cat manifest.tmpl.yml | grep version | awk -F': ' '{print $2}' | sed 's/"//g')
commit=$(git log --oneline | cut -d$'\n' -f1)
branch=$(git rev-parse --abbrev-ref HEAD)
date=$(date +"%Y-%m-%d %T")

rootDir=$(
    cd $(dirname $0)
    pwd
)

# 构建插件静态资源文件
yarn && yarn build -- --env PROXIMA_VERSION_COMMIT="$commit" PROXIMA_VERSION_BRANCH="$branch" PROXIMA_VERSION_DATE="$date" PROXIMA_VERSION_TAG="$tag"

# 构建chart
cd chart
yarn && yarn build --env PROXIMA_VERSION_TAG="${tag}"
cp dist/combined-components.css dist/combined-components
cd ..

buildZip() {
    cd "${rootDir}"
    # dev 包构建
    isDev=$1
    fileExt=''
    workspacePageHidden='hidden: true'
    if $isDev; then
        fileExt='_DEV'
        workspacePageHidden='hidden: false'
    fi

    sed "s/{workspacePageHidden}/$workspacePageHidden/g" manifest.tmpl.yml >manifest.yml
    yarn build-package
    cp -r icons dist/main/icons
    name=$(awk -F': ' '{if (FNR==2) key=$2; else if (FNR==5) version=$2} END {print key"_"version}' manifest.yml | sed 's/"//g')
    filename="$name$fileExt.zip"

    if $isDev; then
        rm -rf $filename
        cd "$rootDir/dist" && zip -r "$filename" * && mv "$filename" "$rootDir"
    else
        mkdir -p release
        rm -rf "release/$filename"
        cd "$rootDir/dist" && zip -r "$filename" * && mv "$filename" "$rootDir/release"
    fi
}

buildZip false
buildZip true
echo '插件包构建成功'
