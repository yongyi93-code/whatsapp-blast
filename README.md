# WhatsApp 群发工具（whatsappblast）

一个本地网页工具：扫码登录你自己的 WhatsApp，从 Excel/CSV 读收件人名单，发送带**个性化变量**和**图片/文件附件**的消息，内置**随机延迟**和**单次发送上限**降低封号风险。

> ⚠️ **使用须知**：本工具通过自动化 WhatsApp 网页版（whatsapp-web.js）实现，属于**非官方**方式。请只向**已同意接收**的联系人发送；发送过快或量过大有被 WhatsApp 封号的风险。频率与数量自行控制，风险自负。

## 环境要求

- Node.js ≥ 18（开发使用 v26）
- 一部能扫码、保持在线的手机 WhatsApp

## 安装

```bash
npm install
```

首次运行会自动下载 Chromium（whatsapp-web.js 依赖 Puppeteer），需要联网，稍等片刻。

**如果自带 Chromium 下载失败**：在 macOS 上工具会自动改用系统已安装的 Google Chrome（`/Applications/Google Chrome.app`）。其他系统或自定义路径可用环境变量指定：

```bash
CHROME_PATH="/path/to/chrome" npm start
```

## 启动

**方式一：命令行（原方式）**

```bash
npm start
```

然后浏览器打开 http://localhost:3000

**方式二：桌面 App（推荐，Mac）**

```bash
npm run start:electron   # 开发态直接运行
npm run dist:mac         # 打包成 .app / .dmg，产物在 dist/ 目录
```

打包后双击生成的 App 即可使用，无需开终端、无需手动开浏览器。登录态和上传文件保存在 `~/Library/Application Support/WhatsApp群发工具/` 下，下次打开免重新扫码。

## 迁移到另一台电脑（macOS）

用一键脚本 `setup.sh` 在新 Mac 上把环境装好（Node + 依赖 + 浏览器检查）。**只复制源码，不复制登录态和依赖**——新机重新扫码、重新装依赖，最干净。

**第一步：在旧 Mac 上打包**（自动排除生成物）

```bash
cd ~/Downloads
zip -r whatsappblast-portable.zip whatsappblast \
  -x "*/node_modules/*" "*/.wwebjs_auth/*" "*/.wwebjs_cache/*" "*/uploads/*" "*/.DS_Store"
```

把 `whatsappblast-portable.zip` 通过 U 盘 / AirDrop / 云盘传到新 Mac。

> 不会被打包进去的目录都是新机会自动重建的：`node_modules/`（重装依赖）、`.wwebjs_auth/`（重新扫码登录）、`.wwebjs_cache/`、`uploads/`。

**第二步：在新 Mac 上安装并启动**

```bash
unzip whatsappblast-portable.zip
cd whatsappblast
bash setup.sh      # 自动装 Node + 依赖 + 下载 Chromium
npm start          # 启动后浏览器开 http://localhost:3000 扫码登录
```

`setup.sh` 会：检测 Node 是否 ≥ 18（缺失则用 Homebrew 安装）→ `npm install` → 检查系统是否装了 Google Chrome（macOS 默认用它启动；没装会提示 `brew install --cask google-chrome` 或用 `CHROME_PATH="" npm start` 改用自带 Chromium）。

## 使用步骤

1. **扫码登录**：页面会显示二维码 → 手机 WhatsApp → 设置 → 已关联的设备 → 关联设备 → 扫码。登录态会保存在 `.wwebjs_auth/`，下次启动免扫码。
2. **上传名单**：上传 `.xlsx` / `.xls` / `.csv`。
   - **第一列**为手机号；其余列为变量，**列名即变量名**。
   - 号码建议带国家码，如 `60123456789`。本地号（如 `0123456789`）会自动补默认国家码（见配置）。
3. **编写消息**：用 `{列名}` 插入变量，例如：`你好 {name}，你的订单 {order} 已发货。`
4. **附件（可选）**：上传图片/文件；有文字时，文字作为第一个附件的说明文字（caption）。
5. **设置延迟并发送**：调整每条之间的随机延迟（默认 8–20 秒），点「开始发送」，实时查看进度和结果；可随时「停止」。

### Excel 名单示例

| phone | name | order |
|-------|------|-------|
| 60123456789 | 小明 | A1001 |
| 60198887777 | 小红 | A1002 |

对应模板 `你好 {name}，订单 {order} 已发货。` 会发给小明：`你好 小明，订单 A1001 已发货。`

## 配置

改 `src/config.js` 或用环境变量：

| 项 | 环境变量 | 默认 | 说明 |
|----|----------|------|------|
| 端口 | `PORT` | 3000 | |
| 默认国家码 | `DEFAULT_COUNTRY_CODE` | `60`（马来西亚） | 号码无国家码时补全 |
| 最小延迟 | `DELAY_MIN_MS` | 8000 | 每条间隔下限（毫秒） |
| 最大延迟 | `DELAY_MAX_MS` | 20000 | 每条间隔上限（毫秒） |
| 单次上限 | `MAX_PER_RUN` | 100 | 单次最多发送条数，超出需分批 |
| 浏览器路径 | `CHROME_PATH` | macOS 系统 Chrome | 指定浏览器可执行文件 |

例：中国号码、延迟 15–40 秒启动：

```bash
DEFAULT_COUNTRY_CODE=86 DELAY_MIN_MS=15000 DELAY_MAX_MS=40000 npm start
```

## 测试

```bash
npm test
```

（覆盖号码清洗与变量替换逻辑，不依赖真实 WhatsApp。）

## 安全说明

- 依赖里的 `xlsx`(SheetJS) 有公开的原型污染告警，仅在解析**恶意构造**的表格时触发。本工具读取的是你自己的文件，风险可控；请勿用它解析来路不明的 Excel。
- 登录会话保存在 `.wwebjs_auth/`，已加入 `.gitignore`，请勿提交或分享。

## 项目结构

```
src/
  config.js       配置项
  recipients.js   解析 Excel/CSV、号码清洗、变量提取
  whatsapp.js     封装 whatsapp-web.js（登录、二维码、发送）
  sender.js       群发循环（变量替换、随机延迟、上限、进度回调）
  server.js       Express + socket.io 服务
public/           网页界面
test/             单元测试
```
