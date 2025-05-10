# NestJS Docker 环境配置问题诊断与解决方案

## 问题描述

在使用 NestJS REST Starter Kit 启动项目时，遇到了数据库连接问题。主要错误信息为：

```
ERROR [TypeOrmModule] Unable to connect to the database. Retrying (1)...
Error: getaddrinfo ENOTFOUND pgsqldb
    at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:118:26)
```

同样，在使用 Adminer 连接数据库时，也遇到了无法解析主机名的问题：

```
SQLSTATE[08006] [7] could not translate host name "pgsqldb" to address: Name does not resolve
```

## 原因分析

通过分析，我们确定了多个问题：

1. **Docker 守护进程未运行**：在尝试使用 Docker 命令时，系统提示 "Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?"

2. **Docker Compose 未安装**：执行 `docker-compose` 命令时报错 "command not found: docker-compose"

3. **Docker 网络配置不正确**：容器之间无法通过主机名相互访问，特别是 Adminer 容器无法连接到 PostgreSQL 容器

4. **服务未添加到同一网络**：在 docker-compose.yml 中，Adminer 服务没有被添加到 app-network 网络中

## 解决流程

### 1. 安装与启动 Docker

首先，确保 Docker Desktop 已安装并启动：

- 在 macOS 上，下载并安装 Docker Desktop
- 启动 Docker Desktop 应用程序
- 等待状态显示为"运行中"

### 2. 使用 Docker Compose

现代 Docker 安装中，Docker Compose 已作为 Docker 的子命令提供：

```bash
# 使用空格而不是连字符
docker compose build
docker compose up -d
```

如果需要单独安装：

- macOS: `brew install docker-compose`
- Linux: `sudo apt-get install docker-compose-plugin`

### 3. 解决容器网络问题

修改 docker-compose.yml 文件，确保所有服务都在同一网络中：

```yaml
services:
  app:
    # 其他配置...
    networks:
      - app-network

  pgsqldb:
    container_name: pgsqldb
    # 其他配置...
    networks:
      - app-network

  adminer:
    # 其他配置...
    networks:
      - app-network # 添加这一行，关键修复

networks:
  app-network:
    driver: bridge
```

### 4. 重建环境

完整重建 Docker 环境：

```bash
# 停止所有容器
docker compose down

# 可选：清理未使用的网络
docker network prune

# 重新启动所有容器
docker compose up -d
```

## 技术要点

1. **Docker 网络原理**：在 Docker Compose 中，同一网络内的容器可以通过服务名或容器名相互访问

2. **主机名解析**：Docker 内置 DNS 服务器允许容器通过名称而不是 IP 地址相互通信

3. **容器通信**：服务必须明确添加到同一网络才能通过主机名通信

4. **环境变量**：使用环境变量（如 DB_HOST）配置数据库连接，便于在不同环境间切换

5. **容器依赖**：使用 `depends_on` 确保服务按正确顺序启动

## 最佳实践

1. **避免使用 IP 地址**：在容器配置中使用服务名或容器名，而不是 IP 地址，以确保适应动态环境

2. **显式定义网络**：在 docker-compose.yml 中明确定义并配置网络

3. **使用容器名**：为关键服务（如数据库）设置固定的容器名称（container_name）

4. **测试连接**：使用 `docker exec` 进入容器并测试网络连接，以诊断问题

5. **检查日志**：使用 `docker logs` 查看容器日志，获取更多错误信息

## 结论

本次故障排除体现了 Docker 容器化环境中常见的网络配置问题。通过系统分析错误信息，检查配置文件，并逐步排除可能的原因，最终确定了问题所在。关键修复是确保所有服务都连接到同一个 Docker 网络。这种方法解决了应用程序和数据库管理工具连接数据库的问题，同时保持了配置的可移植性和环境的一致性。

这种解决方案不依赖于固定 IP 地址，因此适用于生产环境，可以随着容器的重启和重建而保持稳定性。
我看到您尝试直接 ping `pgsqldb` 主机名，但无法解析。这是因为 `pgsqldb` 是 Docker 网络中的容器名称，只有在 Docker 容器运行起来后才能访问。

让我们按步骤解决这个问题：

1. **首先，确保 Docker 服务正在运行**

   - 打开 Docker Desktop
   - 等待 Docker 引擎完全启动

2. **创建并启动容器**
   在项目根目录下运行：

   ```bash
   docker-compose up -d
   ```

   这个命令会：

   - 构建所有服务的镜像
   - 创建并启动所有容器
   - `-d` 参数表示在后台运行

3. **验证容器是否正在运行**

   ```bash
   docker-compose ps
   ```

   您应该能看到三个容器都在运行：

   - app
   - pgsqldb
   - adminer

4. **检查容器网络**

   ```bash
   docker network ls
   docker network inspect nestjs-starter-rest-api_default
   ```

5. **测试数据库连接**
   您可以通过以下方式测试数据库连接：

   - 访问 http://localhost:8080 使用 Adminer 界面
   - 使用以下连接信息：
     - 系统：PostgreSQL
     - 服务器：pgsqldb
     - 用户名：${DB_USER}
     - 密码：${DB_PASS}
     - 数据库：${DB_NAME}

6. **检查环境变量**
   确保您已经创建了 `.env` 文件，包含所有必要的环境变量：

   ```
   DB_USER=your_username
   DB_PASS=your_password
   DB_NAME=your_database
   DB_PORT=5432
   ```

7. **查看容器日志**
   如果遇到问题，可以查看容器日志：

   ```bash
   docker-compose logs -f
   ```

8. **进入容器内部测试**
   如果需要，可以进入容器内部测试：
   ```bash
   docker-compose exec pgsqldb psql -U ${DB_USER} -d ${DB_NAME}
   ```
