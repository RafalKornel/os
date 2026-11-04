#!/bin/bash

mkdir /etc/keyd
sudo cp ~/.local/share/archy/config/keyd/default.conf /etc/keyd/default.conf
sudo systemctl restart keyd.service
