#!/bin/bash 
apt-get -y update

apt-get install -y zip git vim htop bzip2 curl nodejs npm
sudo ln -s /usr/bin/nodejs /usr/bin/node
npm install

ulimit -n 1000000
