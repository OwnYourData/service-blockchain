#!/bin/bash

gem build merkle-hash-tree/merkle-hash-tree.gemspec
docker build -t oydeu/srv-merkle .