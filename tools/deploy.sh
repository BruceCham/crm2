#!/bin/bash
THIS=$(dirname $0)
deploy_cwd=$(
    cd ${THIS}
    dirname `pwd -P`
)
deploy_module=$1
deploy_mode=$2
deploy_env=$3
deploy_dir=$4
deploy_msg=$5

cd ${deploy_cwd}
echo svn cleanup...
svn cleanup ${deploy_cwd}

echo svn revert...
svn revert ${deploy_cwd} -R --depth infinity

echo svn up...
svn up ${deploy_cwd}
npm run build-${deploy_mode}

if [ ${deploy_mode} = "development" ]
    then
    deploy_dist=${deploy_env}/${deploy_dir}/${deploy_module}/
elif [ ${deploy_mode} = "product" ]
    then
    deploy_dist=${deploy_env}/${deploy_dir}/${deploy_module}-dist/
else
    exit 1
fi

cd ${deploy_env}
echo svn cleanup...
svn cleanup ${deploy_env}

echo svn revert...
svn revert ${deploy_env} -R --depth infinity

echo svn up...
svn up ${deploy_env} --username dhp --password dhp

mkdir -p ${deploy_dist}
cp -Rf ${deploy_cwd}/${deploy_module}-dist/ ${deploy_dist}/

svn add ${deploy_dist} --force --auto-props --parents --depth infinity
svn ci ${deploy_dist} -m ${deploy_msg} --username dhp --password dhp
exit 0