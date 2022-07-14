#!/bin/bash

# test for a target dist file to look for
if [ -z "$1" ]
then
  echo "No dist file type was specified, default to variables.json"
  fetchType='variables'
else
  fetchType=$1
fi

# set up what we want to look for
lastRelease=`npm show @adobe/spectrum-tokens@beta version`
fetchTarget="@adobe/spectrum-tokens@$lastRelease/dist/json/$fetchType.json"

echo "Attempting to fetch and diff $fetchTarget"

# clean up the last run
rm .tmp/old-$fetchType.json

# grab the unpackage for the version we asked for
fetchURL="https://unpkg.com/$fetchTarget"
curl --silent -o .tmp/old-$fetchType.json $fetchURL

# git diff is pretty
git diff --no-index .tmp/old-$fetchType.json dist/json/$fetchType.json

# diff sends 1 if there are differences, the script thinks it had an error# 
# this just catches the code and stuffs it if there's actually a diff
exit_code=$?

if [ $exit_code == 0 ]
then  
  echo "No difference found."
fi

