#!/bin/bash

set -xeu

TAG=1.12.1-release

#URL=https://github.com/GMOD/jbrowse/archive/${TAG}.tar.gz

#mkdir jbrowse || true

#wget ${URL} -O - | tar xzvf - --strip-components=1 -C jbrowse

git clone https://github.com/GMOD/jbrowse.git

cd jbrowse

git checkout tags/${TAG}

git submodule update --init --recursive --force

./setup.sh
