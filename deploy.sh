#!/bin/bash

########### PREPARE ###########

set -o errexit

echo_blue() {
    echo "\033[34m$1\033[0m"
}

echo_yellow() {
    echo "\033[33m$1\033[0m"
}

echo_green() {
    echo "\033[32m$1\033[0m"
}

curr=0
total=3

########### EXECUTE ###########

((++curr)) && echo_yellow "[$curr/$total] executing git updating..."
git pull
git submodule update --rebase --recursive

((++curr)) && echo_yellow "[$curr/$total] clearing old files..."
rm -rf ./dist
rm -rf ./node_modules
pnpm i

((++curr)) && echo_yellow "[$curr/$total] building and deploying production code..."
pnpm build
pnpm prod

echo_green "[END] task completed."