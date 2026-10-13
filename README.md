# PlainDoc｜文档白话解读工具

粘贴租约、账单或 Offer 文本，生成一句话总结、关键条款与费用、潜在风险和下一步说明。项目包含静态前端，以及适用于 Vercel 和 Cloudflare Pages 的两套 API 适配。

## 项目状态

这是一个原型项目：文档解读有规则演示模式与可选模型模式，Stripe Checkout 有接口，但支付回调仍是占位实现，尚未完成签名验证、权益发放和完整付费闭环。

未配置 `OPENAI_API_KEY` 或模型调用失败时，`/api/decode` 返回规则抽取结果并标记 `demo: true`。模型调用成功时标记 `demo: false`。文档解读用于辅助理解。

## 技术与目录

| 路径 | 用途 |
| --- | --- |
| [out/index.html](out/index.html) | 项目首页 |
| [out/decode.html](out/decode.html) | 粘贴、示例文档和解读界面 |
| [api/](api/) | Vercel API 适配 |
| [functions/api/](functions/api/) | Cloudflare Pages Functions 适配 |
| [vercel.json](vercel.json) | Vercel 路由配置 |
| [wrangler.toml](wrangler.toml) | Cloudflare Pages 配置 |

## 本地预览

静态界面无需构建：

```bash
python3 -m http.server 4173 --directory out
```

打开 [localhost:4173](http://localhost:4173)。该命令只提供静态页面；API 功能需使用对应平台的开发环境。

Cloudflare Pages 本地开发入口：

```bash
npx wrangler pages dev out
```

本地变量放入 `.dev.vars`，线上变量配置在托管平台，密钥不提交到 Git。

## 环境变量

| 变量 | 用途 |
| --- | --- |
| `OPENAI_API_KEY` | 可选；开启模型解读，缺失时使用规则演示 |
| `STRIPE_SECRET_KEY` | 创建 Stripe Checkout Session |
| `PRICE_SINGLE` / `PRICE_PACK5` | 单次包与五次包对应的 Stripe Price ID |
| `PUBLIC_BASE_URL` | 支付成功／取消后的站点地址 |
| `STRIPE_WEBHOOK_SECRET` | 预留支付回调配置；当前回调尚未实现签名验证 |

## API 导航

| 路径 | 用途 |
| --- | --- |
| `POST /api/decode` | 文本解读，接收 `kind` 与 `text`；文本长度约 40–20,000 字符 |
| `POST /api/stripe/checkout` | 按 `single` 或 `pack5` 创建 Checkout Session |
| `POST /api/stripe/webhook` | 支付回调占位接口，尚未发放权益 |
| `GET /api/health` | 返回模型、Stripe 和价格配置是否存在 |

`/api/health` 的配置标记只说明环境变量是否存在，不代表模型、计费或支付闭环已验收。

## 部署

Vercel 使用 `api/` 与 `vercel.json`；Cloudflare Pages 使用 `out/` 与 `functions/`：

```bash
npx wrangler pages deploy out --project-name=plaindoc
```

正式开放收费前，需要完成回调签名验证、幂等处理、权益发放和支付后的解读权限校验。
