# mini-switch

一个用于学习计算机网络协议的 HTTP/HTTPS 调试代理。从零实现，每个功能对应一个网络知识点。

## 为什么叫 mini-switch

"switch" 双关：既是代理分流（类似 SwitchyOmega），也是网络交换（network switch）。"mini" 如实交代定位——不是生产工具，是学习项目。

## 学习目标

写完这个项目，你应该能够：

- 直观理解 TCP 的字节流模型——什么时候"一条消息"不是 TCP 的一个段
- 亲身实现 HTTP 代理，理解 `Host` 头、`Content-Length`、`Transfer-Encoding: chunked` 为什么存在
- 用自签 CA 实现 HTTPS 中间人拦截，彻底搞懂 TLS 证书信任链
- 理解 HTTP 缓存的完整流程——`Cache-Control`、`ETag`、`304 Not Modified`
- 用 WebSocket 做实时推送，理解"HTTP 升级到 WS"的协议切换过程

## 技术栈

```txt
运行时：   Node.js 22+（内置 native fetch、WebSocket、ESM）
语言：     TypeScript
CLI 入口： 零依赖，直接使用 Node 内置模块（net、tls、http、http2）
证书生成： node-forge（纯 JS 生成 CA 根证书 + 域名证书）
Web UI：   React + Vite（Dashboard 面板）
实时推送： 原生 WebSocket
```

## 产品形态

一条命令启动，Web Dashboard 交互：

```bash
$ mini-switch

Proxy:      http://127.0.0.1:8899
Dashboard:  http://127.0.0.1:8899/__dashboard__
CA cert:    ~/.mini-switch/ca.crt
（将 CA 证书导入系统信任存储后，即可拦截 HTTPS）
```

## 实现路线图

按网络层次自底向上推进，每个阶段对应一个学习主题：

### Phase 1：TCP 传输层

**HTTP 正向代理（最小可用版本）**

```
[浏览器] ----TCP---- [mini-switch] ----TCP---- [目标服务器]
```

你会学到：

| 写什么 | 对应的网络知识 |
|--------|----------------|
| `net.createServer` 监听端口，`connection` 事件 | TCP 三次握手的实际触发 |
| 从 socket 读取字节流，按 `\r\n\r\n` 切出 HTTP 头 | TCP 是字节流，应用层自己负责消息边界 |
| 解析 `Host` 头，`net.createConnection` 连目标 | HTTP/1.1 的 `Host` 头为什么是强制的 |
| `clientSocket.pipe(serverSocket).pipe(clientSocket)` | TCP 全双工，`pipe` 的背压机制（`pause`/`resume`） |

### Phase 2：HTTP 应用层

**请求查看 + 规则引擎**

```
[浏览器] ----TCP---- [mini-switch] ----TCP---- [目标服务器]
                          │
                          ├── 记录所有请求/响应
                          ├── rules: example.com/api/* → file://mock.json
                          └── WebSocket 推给 Dashboard
```

你会学到：

| 写什么 | 对应的网络知识 |
|--------|----------------|
| 解析完整的 HTTP 请求/响应（method、headers、body） | HTTP 文本协议的完整结构 |
| 篡改响应：给 HTML 注入 `<script>` | `Content-Length` 必须和 body 字节数一致 |
| 规则匹配 + 本地文件映射 | 强缓存的核心思想——不发请求，直接用本地文件 |
| `reqDelay://3000` 规则 | `setTimeout` → `pipe`，模拟网络延迟 |

### Phase 3：TLS 安全层

**HTTPS 拦截（CONNECT 隧道 + 自签 CA）**

```
[浏览器] --TLS(假证书)--> [mini-switch] --TLS(真证书)--> [目标服务器]
                               │
                               ├── 自签 CA 根证书
                               ├── 动态为每个域名签发证书
                               └── 解密 → 查看/修改 → 重新加密
```

你会学到：

| 写什么 | 对应的网络知识 |
|--------|----------------|
| `CONNECT` 方法 → 建立 TCP 隧道 | HTTP CONNECT 隧道的工作原理 |
| 用 `node-forge` 生成 CA 根证书 + 域名证书 | 证书链、X.509 格式、Subject/Issuer 关系 |
| `tls.createServer` 加载假证书，`tls.connect` 连接真实服务器 | TLS 握手 & ClientHello/ServerHello |
| 浏览器弹警告 → 用户导入 CA 后消失 | 证书信任链的根因——Trust Store 机制 |

### Phase 4：HTTP 缓存机制

**内置缓存层**

```
[浏览器]  <---304 / 强缓存---  [mini-switch]  <---网络请求---  [目标服务器]
                                     │
                                     ├── 缓存存储（磁盘/内存）
                                     ├── Cache-Control 解析
                                     ├── ETag / Last-Modified 验证
                                     └── stale-while-revalidate 异步刷新
```

### Phase 5：实时通信

**WebSocket Dashboard + gRPC 模拟（可选）**

```
[Dashboard] ----WebSocket---- [mini-switch]
```

你会学到：

| 写什么 | 对应的网络知识 |
|--------|----------------|
| 原生 WebSocket 实时推送请求列表 | HTTP Upgrade 机制，`101 Switching Protocols` |
| 可选：实现一个简单 gRPC 代理 | HTTP/2 多路复用的实际应用 |

## 关键文件结构

```
mini-switch/
├── src/
│   ├── proxy/          # 代理核心
│   │   ├── tcp.ts      # TCP 层：net.createServer，socket 读写
│   │   ├── http.ts     # HTTP 层：请求解析、规则匹配、响应篡改
│   │   ├── https.ts    # TLS 层：CONNECT 隧道，自签证书
│   │   └── cache.ts    # 缓存层：Cache-Control 解析，304 协商
│   ├── cert/           # 证书管理
│   │   └── ca.ts       # node-forge 生成 CA + 域名证书
│   ├── dashboard/      # Web UI
│   │   └── ...         # React + Vite 前端
│   └── cli.ts          # 入口：解析命令行参数，启动代理
├── doc/                # 文档
│   └── README.md       # 本文件
└── package.json
```

## 推荐学习顺序

**不要试图一口气写完所有功能。** 每个 Phase 写完，先用 curl / 浏览器测试，用 Wireshark 抓包验证，确认行为符合你的理解，再进入下一阶段。

```txt
Phase 1 (TCP)     →  写完最少的 30 行代理，用 curl -x 测试
                    抓包看三次握手和 HTTP 请求/响应

Phase 2 (HTTP)    →  加上请求查看，改一行 Content-Length 观察浏览器报错

Phase 3 (TLS)     →  这是最核心的。写完 HTTPS 拦截，你再也忘不掉 TLS

Phase 4 (缓存)    →  把 Cache-Control 的 max-age / no-cache / ETag 各实现一遍

Phase 5 (实时)    →  WebSocket Dashboard 把整个系统串起来
```

## 参考资料

本项目的网络知识来源于计算机网络系列文章，按学习顺序：

1. [从前端视角理解计算机网络：系列导读](https://www.coolboiledwater.cn/blog/68?lang=zh)
2. [TCP 详解：从报文结构到可靠传输机制](https://www.coolboiledwater.cn/blog/50?lang=zh)
3. [HTTP 协议演进：从 0.9 到 1.1](https://www.coolboiledwater.cn/blog/51?lang=zh)
4. [揭秘 TLS 协议：从 1.2 到 1.3 的演进](https://www.coolboiledwater.cn/blog/52?lang=zh)
5. [HTTP/2：现代 Web 性能的进化之路](https://www.coolboiledwater.cn/blog/53?lang=zh)
6. [HTTP 缓存机制详解](https://www.coolboiledwater.cn/blog/75?lang=zh)
7. [HTTP 缓存进阶](https://www.coolboiledwater.cn/blog/76?lang=zh)
