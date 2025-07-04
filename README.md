## NestJS Starter Kit [v2]

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![build](https://github.com/monstar-lab-oss/nestjs-starter-rest-api/actions/workflows/build-workflow.yml/badge.svg?branch=master&event=push)](https://github.com/monstar-lab-oss/nestjs-starter-rest-api/actions/workflows/build-workflow.yml)
[![tests](https://github.com/monstar-lab-oss/nestjs-starter-rest-api/actions/workflows/tests-workflow.yml/badge.svg?branch=master&event=push)](https://github.com/monstar-lab-oss/nestjs-starter-rest-api/actions/workflows/tests-workflow.yml)

This starter kit has the following outline:

- Monolithic Project
- REST API

This is a Github Template Repository, so it can be easily [used as a starter template](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/creating-a-repository-from-a-template) for other repositories.

## Sample implementations

To view sample implementations based on this starter kit, please visit the [nestjs-sample-solutions](https://github.com/monstar-lab-oss/nestjs-sample-solutions) repository.

## Starter kit Features

One of our main principals has been to keep the starter kit as lightweight as possible. With that in mind, here are some of the features that we have added in this starter kit.

| Feature                  | Info               | Progress |
|--------------------------|--------------------|----------|
| Authentication           | JWT                | Done     |
| Authorization            | RBAC (Role based)  | Done     |
| ORM Integration          | TypeORM            | Done     |
| DB Migrations            | TypeORM            | Done     |
| Logging                  | winston            | Done     |
| Request Validation       | class-validator    | Done     |
| Pagination               | SQL offset & limit | Done     |
| Docker Ready             | Dockerfile         | Done     |
| Devcontainer             | -                  | Done     |
| Auto-generated OpenAPI   | -                  | Done     |
| Auto-generated ChangeLog | -                  | WIP      |

Apart from these features above, our start-kit comes loaded with a bunch of minor awesomeness like prettier integration, commit-linting husky hooks, package import sorting, SonarCloud github actions, docker-compose for database dependencies, etc. :D

## Consulting

Most of the features added to this starter kit have already been tried out in production applications by us here at MonstarLab. Our production applications are more feature rich, and we constantly strive to bring those features to this OSS starter kit.

If you would like to use a more feature rich starter kit, with more awesome features from Day 1, then please reach out to us and we can collaborate on it together as technology partners. :)

## Installation

Note: when using docker, all the `npm` commands can also be performed using `./scripts/npm` (for example `./scripts/npm install`).
This script allows you to run the same commands inside the same environment and versions than the service, without relying on what is installed on the host.

```bash
$ npm install
```

Create a `.env` file from the template `.env.template` file.

Generate public and private key pair for jwt authentication:

### With docker

Run this command:
```bash
./scripts/generate-jwt-keys
```

It will output something like this. You only need to add it to your `.env` file.
```
To setup the JWT keys, please add the following values to your .env file:
JWT_PUBLIC_KEY_BASE64="(long base64 content)"
JWT_PRIVATE_KEY_BASE64="(long base64 content)"
```

### Without docker

```bash
$ ssh-keygen -t rsa -b 2048 -m PEM -f jwtRS256.key
# Don't add passphrase
$ openssl rsa -in jwtRS256.key -pubout -outform PEM -out jwtRS256.key.pub
```

You may save these key files in `./local` directory as it is ignored in git.

Encode keys to base64:

```bash
$ base64 -i local/jwtRS256.key

$ base64 -i local/jwtRS256.key.pub
```

Must enter the base64 of the key files in `.env`:

```bash
JWT_PUBLIC_KEY_BASE64=BASE64_OF_JWT_PUBLIC_KEY
JWT_PRIVATE_KEY_BASE64=BASE64_OF_JWT_PRIVATE_KEY
```

## Running the app

We can run the project with or without docker.

### Local

To run the server without Docker we need this pre-requisite:

- Postgres server running

Commands:

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

### Docker

```bash
# build image
$ docker build -t my-app .

# run container from image
$ docker run -p 3000:3000 --volume 'pwd':/usr/src/app --network --env-file .env my-app

# run using docker compose
$ docker compose up
```

Learn more about Docker conventions [here](https://github.com/monstar-lab-group/nodejs-backend/blob/master/architecture/docker-ready.md). (WIP - Currently this is an internal org link.)

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Migrations

```bash
# using docker
$ docker compose exec app npm run migration:run

# generate migration (replace CreateUsers with name of the migration)
$ npm run migration:generate --name=CreateUsers

# run migration
$ npm run migration:run

# revert migration
$ npm run migration:revert
```

## Architecture

- [Project Structure](./docs/project-structure.md)

## Contributors

- [Yash Murty](https://github.com/yashmurty)
- [S M Asad Rahman](https://github.com/asad-mlbd)
- [Tanveer Hassan](https://github.com/war1oc)
- [Saad Bin Amjad](https://github.com/Saad-Amjad)
- [Sivan Payyadakath](https://github.com/sivanpayyadakath)
- [Sébastien Caparros](https://github.com/Seb-C)

## External Links

<a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo.svg" width="150" alt="Nest Logo" /></a>

[![SonarCloud](https://sonarcloud.io/images/project_badges/sonarcloud-white.svg)](https://sonarcloud.io/dashboard?id=monstar-lab-oss_nestjs-starter-rest-api)

你已经设置好了大部分 `.env` 配置，但缺少的关键点是：

```
JWT_PUBLIC_KEY_BASE64=
JWT_PRIVATE_KEY_BASE64=
```

这两个值是 **Base64 编码的 RSA 公私钥**，通常用于 **JWT（JSON Web Token）签名和验证**。

---

### ✅ 步骤：生成并配置 JWT 公私钥对

#### 第 1 步：生成 RSA 密钥对

使用以下命令在本地生成一对 2048 位的 RSA 密钥（你也可以使用其他工具）：

```bash
# 生成私钥
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048

# 从私钥生成公钥
openssl rsa -pubout -in private.pem -out public.pem
```

#### 第 2 步：Base64 编码

然后将生成的 `private.pem` 和 `public.pem` 文件内容进行 Base64 编码：

```bash
# 编码私钥
base64 -i private.pem

# 编码公钥
base64 -i public.pem
```

复制输出的内容，并粘贴到 `.env` 文件中的对应位置：

```env
JWT_PRIVATE_KEY_BASE64=（将 base64 编码后的 private.pem 内容粘贴在这里）
JWT_PUBLIC_KEY_BASE64=（将 base64 编码后的 public.pem 内容粘贴在这里）
```

> ⚠️ 注意：Base64 编码后的内容可能很长，确保它是一整行（如果换行可能会出错）。
