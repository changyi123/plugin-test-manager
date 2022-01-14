#!/bin/bash

yarn && yarn build
rm -rf build.zip
zip -r build.zip dist trigger manifest.yml
