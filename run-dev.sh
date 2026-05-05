#!/bin/bash
cd /home/z/my-project
while true; do
  npm run dev >> /home/z/my-project/dev.log 2>&1
  echo "[$(date)] Restarting..." >> /home/z/my-project/dev.log
  sleep 2
done
