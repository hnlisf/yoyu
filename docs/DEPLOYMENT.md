# YoYu WSL 部署手册（npm 命令版）

## 📋 部署前检查

```bash
# 1. 清理残留进程（OOM 防护）
pkill -9 -f next 2>/dev/null
pkill -9 -f nest 2>/dev/null
pkill -9 -f dist/src/main.js 2>/dev/null
sleep 2
ps aux | grep -E "next|nest" | grep -v grep | wc -l   # 应 0

# 2. 检查内存
free -h | head -2   # 应 free > 800Mi

# 3. 确认 git 状态
cd ~/yoyu
git checkout main
git pull origin main
git log --oneline -1   # 应 = 最新 main HEAD
```

## 🚀 后端部署（backend）

```bash
cd ~/yoyu/backend

# 1. 安装依赖（npm 不用 corepack 校验）
npm install

# 2. 复制环境变量
cp .env.example .env   # 首次部署
# 已有 .env 跳过此步

# 3. 应用数据库 migration
npx prisma migrate deploy

# 4. ⚠️ 必做：重新生成 Prisma Client
#    漏掉这步会报 14 个 TS 编译错误（v9.1.0 教训）
npx prisma generate

# 5. 初始化种子数据（首次部署）
npm run db:seed

# 6. build
npm run build

# 7. 启动（用 build 后的 dist，节省 290MB 内存）
node dist/src/main.js > /tmp/nest.log 2>&1 &
echo "NEST_PID=$!"
sleep 8

# 8. 验证
curl -s http://localhost:3000/api/health
# 期望: {"status":"ok","timestamp":"..."}
```

## 🚀 前端部署（frontend）

```bash
cd ~/yoyu/frontend

# 1. 安装依赖
npm install

# 2. 复制环境变量
cp .env.example .env.local   # 首次部署

# 3. build（首次或代码变更后必做）
npm run build

# 4. 启动（用 build 后的产物，不要 next dev）
npm run start > /tmp/next.log 2>&1 &
echo "NEXT_PID=$!"
sleep 5

# 5. 验证
curl -s -I http://localhost:3001/ | head -3   # 应 HTTP 200
```

## 🚀 浏览器访问

打开 Chrome 浏览器：

```
http://localhost:3001
```

**WSL 访问注意事项**：
- WSL2 默认 localhost 可在 Windows 浏览器访问
- 若访问不到，执行：`wsl hostname -I` 获取 WSL IP，用 IP 访问

## 🔍 部署后 smoke test（5 项）

```bash
# 后端 API smoke test（不依赖前端）
curl -s http://localhost:3000/api/health
curl -s 'http://localhost:3000/api/fish-species?lang=zh' | head -c 500
```

**期望**：
- `/api/health` 返回 `{"status":"ok",...}`
- 鱼种列表每项含 `userCustomized` 字段

## 🛑 常见错误 + 修复

### 错误 1：`Cannot find matching keyid`
**根因**：corepack 强校验 pnpm 失败  
**修复**：项目已删除 `packageManager` 字段，用 npm 即可

### 错误 2：14 个 TS 编译错误（visualVariant/waterChangeLog 等不存在）
**根因**：漏跑 `npx prisma generate`，Prisma Client 是旧的  
**修复**：
```bash
cd ~/yoyu/backend
npx prisma generate
npm run build
```

### 错误 3：POST `/api/fish-species/custom` 400 错误"鱼种名称不能为空"
**根因**：字段名错（`adaptTempMin` 而非 `tempMin`）  
**修复**：用正确字段名（见 docs/API_CONTRACT.md）

## 🛑 部署完清理

```bash
# kill 所有相关进程
pkill -9 -f dist/src/main.js 2>&1
pkill -9 -f "next start" 2>&1

# 验证清理
sleep 2
ps aux | grep -E "next|nest" | grep -v grep | wc -l   # 应 0
```

## 📚 相关文档

- `docs/API_CONTRACT.md` — API 字段名合约（防请求字段名错）
- `README.md` — 项目主文档
- GitHub: https://github.com/hnlisf/yoyu
