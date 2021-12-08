#!/bin/bash

randomVersion=$RANDOM%2
echo $randomVersion
yarn && yarn build
rm -rf build.zip
zip -r build.zip dist manifest.yml
