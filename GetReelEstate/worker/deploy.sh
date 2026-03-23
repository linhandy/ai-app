#!/bin/bash
# 一键更新 worker（在 ECS 上执行）
set -e

echo "📦 Pulling latest code..."
git pull origin main

echo "📥 Installing dependencies..."
cd GetReelEstate/worker
npm install --production

echo "♻️  Restarting worker..."
pm2 restart ecosystem.config.cjs --update-env

echo "✅ Done. Logs:"
pm2 logs getreel-worker --lines 20
