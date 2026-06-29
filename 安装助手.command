#!/bin/bash
APP="/Applications/WhatsApp群发工具.app"

if [ ! -d "$APP" ]; then
  osascript -e 'display dialog "请先把 WhatsApp群发工具.app 拖进 Applications（应用程序）文件夹，再双击运行此脚本。" buttons {"好的"} default button 1 with icon caution'
  exit 1
fi

xattr -cr "$APP"
open "$APP"
