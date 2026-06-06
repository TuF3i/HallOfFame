# 项目文档 Spec

## Why
为 HallOfFame 项目编写结构化文档，方便开发者快速上手、部署和了解 API 接口。

## What Changes
- 创建 `docs/` 目录，按主题拆分多份文档

## Impact
- Affected code: 新增 `docs/` 目录下多份 markdown 文档

## ADDED Requirements

### Requirement: 项目文档

#### Scenario: 文档结构
- **THEN** 文档按以下结构拆分：
  - `overview.md` — 项目概述、技术栈、架构图
  - `deploy.md` — 部署指南（依赖服务、配置、启动）
  - `api.md` — API 接口文档（所有路由、请求/响应格式）
