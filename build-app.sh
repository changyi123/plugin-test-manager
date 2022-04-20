#!/bin/bash

commit=$(git log --oneline | cut -d$'\n' -f1)
branch=$(git rev-parse --abbrev-ref HEAD)

yarn && yarn build -- --env PROXIMA_COMMIT="$commit" PROXIMA_BRANCH="$branch"
rm -rf test-manager-plugin.zip
zip -r test-manager-plugin.zip dist trigger manifest.yml
