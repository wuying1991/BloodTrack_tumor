# BloodTrack CloudBase Dev 环境验证手册

> 目标：用非生产数据验证“CloudBase Run + TencentDB MongoDB”是否适合 BloodTrack。
>
> 预计耗时：基础部署约 1～2 小时；包含购买、VPC 和故障排查建议预留半天。
>
> 重要：本手册只使用合成测试数据，不迁移真实患者数据。

## 1. 验证完成标准

满足以下条件才算验证通过：

- 当前 `backend/Dockerfile` 能在 CloudBase Run 构建并启动。
- `GET /api/health` 通过 CloudBase HTTPS 域名返回 200。
- Express 通过 VPC 内网连接 TencentDB MongoDB。
- MongoDB 没有对公网开放，安全组只允许 CloudBase 子网。
- 注册、登录、创建/读取/修改/删除一条测试血常规均成功。
- CloudBase 能查看脱敏日志、监控和版本。
- 能部署第二个版本并回滚到前一个版本。
- dev 环境缩容到 0 后能重新冷启动，延迟已记录。
- 测试完成后能删除测试数据，并能找到成本与预算设置。

## 2. 需要准备的内容

### 2.1 账号与权限

- 已实名认证的腾讯云账号。
- 可创建 CloudBase 环境、VPC、安全组和 TencentDB MongoDB 的权限。
- CloudBase 标准版或以上套餐；当前官方文档说明 VPC 内网互联不支持个人版。
- 一个测试用 Git 分支，例如 `cloudbase-dev-poc`。

不要用腾讯云主账号进行日常部署。验证通过后应创建最小权限的子账号或角色。

### 2.2 地域

CloudBase Run、VPC、子网和 MongoDB 必须在同一地域。当前 CloudBase 内网互联文档对地域存在限制，第一次验证建议按控制台和官方文档选择上海地域；如果控制台已经支持其他地域，仍应保证全部资源同地域。

### 2.3 环境变量

CloudBase Run 需要：

| 名称 | 验证环境值 | 说明 |
|---|---|---|
| `NODE_ENV` | `production` | 即使是 dev 云环境也使用生产安全行为 |
| `MONGODB_URI` | TencentDB 内网连接串 | 使用专用 dev 用户和 `bloodtrack_dev` 数据库 |
| `JWT_SECRET` | 新生成的随机长字符串 | 至少 32 字节，不能使用仓库历史值 |
| `JWT_REFRESH_SECRET` | 另一条随机长字符串 | 必须与 `JWT_SECRET` 不同 |
| `FRONTEND_URL` | 可选 | 测试分享链接时填写 dev 网页地址 |

`PORT` 由 CloudBase 平台提供。当前后端已经读取 `process.env.PORT`，不需要写死。

建议在密码管理器或云端密钥管理中生成并保存 JWT 密钥，不要通过聊天、邮件或 Git 传递。

## 3. 阶段 A：本地预检

在购买云资源前先确认当前代码可构建：

```powershell
cd D:\vibe_program\BloodTrack_tumor\backend
npm.cmd ci
npm.cmd test -- --runInBand
npm.cmd run build
docker build -t bloodtrack-api-dev .
```

通过标准：

- 后端测试全部通过。
- TypeScript 构建成功。
- Docker 镜像构建成功。
- Dockerfile 构建上下文必须是 `backend/`，不是仓库根目录。

当前项目已经具备：

- 多阶段 Node 20 Dockerfile。
- 非 root 用户运行。
- `PORT` 环境变量监听。
- `/api/health` 健康检查。
- 生产环境 JWT 密钥缺失时立即退出。

## 4. 阶段 B：创建网络

### 4.1 创建 VPC

在腾讯云“私有网络 VPC”控制台：

1. 地域选择与 CloudBase Run 相同的地域。
2. 新建 VPC，例如 `bloodtrack-dev-vpc`。
3. 创建两个子网：
   - `bloodtrack-dev-run-subnet`：CloudBase Run 使用。
   - `bloodtrack-dev-db-subnet`：MongoDB 使用。
4. 两个子网必须属于同一 VPC，CIDR 不重叠，并预留足够 IP。

示例仅供验证：VPC `10.20.0.0/16`，Run 子网 `10.20.1.0/24`，DB 子网 `10.20.2.0/24`。如果控制台或 CloudBase 对掩码有更严格要求，以控制台校验和当前官方文档为准。

### 4.2 创建安全组

新建安全组 `bloodtrack-dev-mongo-sg`：

- 入站协议：TCP。
- 端口：MongoDB 实例控制台显示的端口，通常为 27017。
- 来源：只填写 `bloodtrack-dev-run-subnet` 的 CIDR。
- 不允许 `0.0.0.0/0`。
- 不为 MongoDB 开启公网地址。

验证通过后，生产环境应使用独立 VPC、安全组和网段。

## 5. 阶段 C：创建 TencentDB MongoDB

在腾讯云 MongoDB 控制台创建 dev 实例：

1. 地域选择与 CloudBase 相同。
2. 架构选择副本集。
3. 验证阶段选择满足项目兼容性的当前受支持版本和最小规格。
4. 计费方式优先选择适合短期验证的方式，购买前查看控制台实际价格。
5. 网络选择 `bloodtrack-dev-vpc`。
6. 子网选择 `bloodtrack-dev-db-subnet`。
7. 绑定 `bloodtrack-dev-mongo-sg`。
8. 不开启公网访问。
9. 开启自动备份；验证环境可使用较短保留期。

实例运行后：

1. 创建专用数据库账号，不使用高权限管理员账号给应用连接。
2. 只授予 `bloodtrack_dev` 数据库所需读写权限。
3. 从控制台复制内网连接地址。
4. 组装 `MONGODB_URI`，并正确 URL 编码用户名和密码中的特殊字符。

连接串结构示意：

```text
mongodb://<app-user>:<encoded-password>@<internal-host>:<port>/bloodtrack_dev?authSource=admin
```

不要把真实连接串写入 `.env.example`、GitHub Actions 日志或本文档。

## 6. 阶段 D：创建 CloudBase Dev 环境

### 6.1 创建环境

在 CloudBase 控制台：

1. 创建环境 `bloodtrack-dev`。
2. 选择支持 CloudBase Run 和 VPC 的套餐。
3. 地域必须与 VPC/MongoDB 一致。
4. 开通云托管 CloudBase Run。

### 6.2 创建服务

新建服务 `bloodtrack-api-dev`，建议配置：

| 配置 | 建议值 |
|---|---|
| 部署方式 | 第一次用本地代码或 Git 仓库部署 |
| 代码目录 | `backend` |
| Dockerfile | `backend/Dockerfile`；如果目标目录已是 backend，则填 `Dockerfile` |
| 监听端口 | `5000` |
| CPU/内存 | 从最小可用规格开始，例如 0.5 CPU / 1 GB |
| 最小实例数 | `0`，只用于观察 dev 冷启动 |
| 最大实例数 | `2` |
| 初始健康检查等待 | 建议 10～20 秒，给 MongoDB 建连留出时间 |
| 日志 | 标准输出 stdout |
| 外部访问 | 开启，用于 HTTPS API 验证 |

当前 Dockerfile 的构建上下文必须是 `backend`。如果从整个 Git 仓库部署，应把“目标目录”设置为 `backend`，否则 Dockerfile 中的 `COPY package*.json ./` 会找错文件。

### 6.3 配置环境变量

在 CloudBase 服务版本配置中添加：

```text
NODE_ENV=production
MONGODB_URI=<TencentDB 内网连接串>
JWT_SECRET=<随机密钥 A>
JWT_REFRESH_SECRET=<随机密钥 B>
```

可选：

```text
FRONTEND_URL=<dev 网页地址>
```

不要设置 `RATE_LIMIT_DISABLED=true`。Dev 服务仍会暴露到公网，应保留限流。

### 6.4 绑定 VPC

进入服务设置/网络设置：

1. 开启私有网络或内网互联。
2. 选择 `bloodtrack-dev-vpc`。
3. 选择 `bloodtrack-dev-run-subnet`。
4. 保存并重新部署服务，使网络配置对新实例生效。

数据库访问只需要 CloudBase 出向访问 VPC。小程序访问 API 仍通过 CloudBase HTTPS 域名。不要误关闭 API 的外部入口。

如果关闭 CloudBase 的公网出向访问，未来调用微信登录接口、订阅消息或 OCR 外部服务时还需要 NAT 网关。验证阶段可保留公网出向，同时让目标 VPC 地址走内网。

## 7. 阶段 E：首次部署

建议第一次使用本地代码部署，排除 Git 授权问题；通过后再切换 Git 自动部署。

部署时观察两个阶段：

1. 构建日志：`npm ci`、TypeScript 编译是否成功。
2. 运行日志：是否先出现 `MongoDB Connected Successfully`，再出现服务监听日志。

如果数据库无法连接，当前进程会退出，CloudBase 版本会显示不健康。这正好能验证 VPC、连接串和安全组。

部署成功后复制平台 HTTPS 域名，例如：

```text
https://<cloudbase-domain>/api/health
```

浏览器打开后预期返回：

```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "...",
  "environment": "production"
}
```

## 8. 阶段 F：业务冒烟测试

使用 Postman、Apifox 或 PowerShell，全部使用虚拟账号和虚拟检验值。

### 8.1 注册

```powershell
$base = 'https://<cloudbase-domain>/api'
$email = "cloudbase-poc-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())@example.com"
$password = '<仅用于测试的强密码>'

$register = Invoke-RestMethod -Method Post -Uri "$base/auth/register" `
  -ContentType 'application/json' `
  -Body (@{
    email = $email
    password = $password
    fullName = 'CloudBase Test User'
  } | ConvertTo-Json)
```

### 8.2 创建血常规

根据注册响应中实际的 access token 字段取值：

```powershell
$token = $register.data.accessToken
$headers = @{ Authorization = "Bearer $token" }

$created = Invoke-RestMethod -Method Post -Uri "$base/blood-tests" `
  -Headers $headers `
  -ContentType 'application/json' `
  -Body (@{
    date = (Get-Date).ToUniversalTime().ToString('o')
    wbc = 5.2
    rbc = 4.3
    hgb = 128
    plt = 180
    neu = 3.1
    lym = 1.5
    notes = 'CloudBase POC synthetic data'
  } | ConvertTo-Json)
```

### 8.3 验证完整链路

依次验证：

1. `GET /api/blood-tests` 能读到测试记录。
2. `PUT /api/blood-tests/:id` 修改 WBC 后，`isAbnormal` 能重新计算。
3. `DELETE /api/blood-tests/:id` 能删除记录。
4. `POST /api/auth/logout` 后旧 access token 被拒绝。
5. CloudBase 日志中没有打印密码、JWT、MongoDB 连接串或检验请求体。

## 9. 阶段 G：Git 自动部署与回滚

基础部署通过后：

1. 在 CloudBase Run 中绑定 GitHub 仓库。
2. 选择验证分支 `cloudbase-dev-poc`。
3. 目标目录设置为 `backend`。
4. 开启该分支自动部署。
5. 提交一个无风险变更，例如健康检查返回中增加版本号。
6. 确认推送后自动构建新版本。
7. 将新版本流量切换为 100%，验证健康检查。
8. 在控制台回滚到前一个版本，再次验证健康检查。

正式环境不建议 main 一推送就直接全量切流。应先经过 CI、staging 和人工批准。

## 10. 阶段 H：冷启动与简单性能测试

Dev 环境最小实例数设为 0：

1. 等待平台将实例缩容到 0。
2. 第一次请求 `/api/health`，记录响应时间。
3. 紧接着再请求一次，记录热实例响应时间。
4. 连续执行登录、列表和创建，确认 MongoDB 连接池能恢复。
5. 查看是否出现重复连接、容器崩溃或 5xx。

判断：

- 如果冷启动明显影响体验，生产最小实例数设为 1。
- 如果热请求仍然慢，检查数据库地域、索引、连接池和容器规格。
- 不用 `/api/health` 的成功掩盖业务接口失败；至少测试一次真实数据库读写。

## 11. 常见故障

| 现象 | 最可能原因 | 检查顺序 |
|---|---|---|
| Docker 构建找不到 package.json | 构建目标目录错误 | 目标目录是否为 `backend` |
| 服务启动后 503 | 端口不一致或进程退出 | 监听端口 5000、运行日志、`PORT` |
| 提示 JWT 密钥缺失 | 生产环境变量没配置 | 两个 JWT 密钥是否存在且足够长 |
| MongoDB connection timeout | VPC/子网/安全组不通 | 同地域、绑定 VPC、27017 来源 CIDR |
| MongoDB authentication failed | 用户、密码或 authSource 错误 | URL 编码、数据库权限、连接串 |
| 健康检查反复失败 | MongoDB 建连慢于检查等待 | 把初始等待调到 10～20 秒 |
| 本地能访问、真机不能访问 | 域名/微信合法域名未配置 | CloudBase HTTPS 域名与公众平台配置 |
| 第一次访问很慢 | 实例从 0 冷启动 | 查看实例数与冷启动日志 |
| 请求突然 429 | 触发后端限流 | 不关闭限流，降低测试频率或用不同测试窗口 |
| 分享地址指向 localhost | 未配置 `FRONTEND_URL` | 设置 dev 网页/小程序分享策略 |

## 12. 验证记录模板

| 项目 | 结果 | 证据/备注 |
|---|---|---|
| Docker 构建 | 通过/失败 | 构建版本、耗时 |
| HTTPS health | 通过/失败 | 状态码、响应时间 |
| VPC MongoDB | 通过/失败 | 仅记录实例标识，不记录连接串 |
| 注册登录 | 通过/失败 | 测试账号标识 |
| 血常规 CRUD | 通过/失败 | 测试记录 ID |
| 令牌失效 | 通过/失败 | 状态码 |
| 日志脱敏 | 通过/失败 | 检查时间范围 |
| 自动部署 | 通过/失败 | Git commit ID |
| 版本回滚 | 通过/失败 | 前后版本号 |
| 冷启动 | 通过/失败 | 冷/热响应时间 |
| 月度预估费用 | 已确认/未确认 | 控制台预算，不填密钥 |

## 13. 验证结束后的处理

如果验证通过：

- 保留 dev CloudBase 环境，但设置预算告警和最大实例数。
- 删除全部 POC 用户与医疗测试记录。
- 保留部署记录和验证表，不保留密钥。
- 创建 staging 环境，不直接把 dev 升格为 production。
- 把 CloudBase 配置项和部署步骤纳入项目 CI/CD 文档。

如果验证失败：

- 不急于改写业务代码。
- 先区分是 CloudBase 构建、网络套餐、地域限制、MongoDB 成本还是平台功能问题。
- 记录失败证据，再比较“CloudBase Run + 公网托管 MongoDB”“普通腾讯云容器服务”或“uniCloud 重写”的真实成本。

## 14. 官方参考

- [CloudBase Run 云托管](https://docs.cloudbase.net/run/introduction)
- [CloudBase Run 服务开发要求](https://docs.cloudbase.net/run/develop/developing-guide)
- [CloudBase Run 部署方式](https://docs.cloudbase.net/run/deploy/deploy/introduce)
- [CloudBase Run 版本配置、健康检查与环境变量](https://docs.cloudbase.net/run/deploy/version-setting)
- [CloudBase Run 内网互联](https://docs.cloudbase.net/run/deploy/networking/internal-link)
- [TencentDB MongoDB 快速创建实例](https://cloud.tencent.com/document/product/240/121250)
- [TencentDB MongoDB 安全组](https://cloud.tencent.com/document/product/240/32716)
- [TencentDB MongoDB 安全与网络](https://cloud.tencent.com/document/product/240/133049)
