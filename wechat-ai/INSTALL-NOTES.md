# 本机安装说明（给 OpenClaw / npm 用）
# 目的：把整套东西装在工作区内，避开 DSH 沙箱对工作区外路径的写入拦截。
# 这个文件本身不含敏感信息，只有路径配置。

## 为什么需要它

本机 npm 的全局目录是 `D:\nodejs`、缓存是 `C:\Users\ZhuanZ\AppData\Local\npm-cache`，
两者都在当前会话的可写范围之外。因此所有 npm/openclaw 命令都必须显式重定向：

- `--prefix`      -> 本目录（包装进 .\node_modules）
- `--cache`       -> 本目录下的 .npm-cache
- `--globalconfig`-> 本目录下的 .npmrc（避免读写用户级配置）
- 环境变量 `HOME` / `USERPROFILE` -> 本目录（让 OpenClaw 的状态目录落在工作区内）

## 目录结构

```
wechat-ai\
  npm-global\        <- npm --prefix 指向这里
    node_modules\    <- openclaw 及其依赖
    .npm-cache\      <- npm 缓存
    .openclaw\       <- OpenClaw 的状态/配置目录（通过 HOME 重定向）
  logs\              <- 运行日志
```

## 卸载方法

删掉 `npm-global` 整个目录即可，本机其他位置不受影响。
如果建了开机自启项，一并删除（见 README 里的说明）。
