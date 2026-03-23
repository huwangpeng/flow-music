# Node.js LTS 镜像
FROM node:20-slim AS base

# 设置工作目录
WORKDIR /src

# 安装构建依赖 (Prisma 等需要)
RUN apt-get update && apt-get install -y openssl python3 build-essential && rm -rf /var/lib/apt/lists/*

# ---- 依赖阶段 ----
FROM base AS dependencies
COPY package*.json ./
RUN npm install

# ---- 构建阶段 ----
FROM base AS build
COPY --from=dependencies /src/node_modules ./node_modules
COPY . .
# 运行 Prisma 生成并构建 Nuxt
RUN npx prisma generate
RUN npm run build

# ---- 运行阶段 ----
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

# 复制产物
COPY --from=build /src/.output ./.output
COPY --from=build /src/prisma ./prisma
COPY --from=build /src/package.json ./package.json

EXPOSE 3000

# 启动命令
CMD ["node", ".output/server/index.mjs"]
