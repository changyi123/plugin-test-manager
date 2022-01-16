#!/bin/bash

yarn && yarn build
rm -rf test-manager-plugin.zip
zip -r test-manager-plugin.zip dist trigger manifest.yml
