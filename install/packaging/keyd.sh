#!/bin/bash

mkdir /etc/keyd
sudo cp -R ~/.local/share/archy/config/keyd /etc
sudo systemctl restart keyd.service
