# Vercel 部署故障排查指南

## 📋 当前状态检查清单

### ✅ 已完成的修复

1. ✅ 图片压缩（28MB → 1.1MB）
2. ✅ 文件扩展名修正（.jpg → .png）
3. ✅ 添加 filesystem handler
4. ✅ Serverless Functions 适配
5. ✅ CORS 配置（允许 .vercel.app）
6. ✅ API URL 自动检测（localhost vs 生产环境）
7. ✅ 健康监控 URL 修复
8. ✅ 函数处理器格式修正

### ⚠️ 待确认的配置

- [ ] Vercel 环境变量是否已配置
- [ ] 部署是否已完成
- [ ] 是否需要清除构建缓存

---

## 🔍 诊断步骤

### 步骤 1：检查部署状态

1. 访问 https://vercel.com/dashboard
2. 选择项目 **yigui**
3. 查看 **Deployments** 标签
4. 确认最新部署状态：
   - ✅ Ready（绿色）- 部署成功
   - 🔄 Building（黄色）- 正在构建
   - ❌ Error（红色）- 部署失败

**如果是 Building：** 等待完成（3-5分钟）

**如果是 Error：** 查看错误日志：
- 点击失败的部署
- 查看 **Build Logs** 找到错误原因

---

### 步骤 2：测试 Health 接口

打开浏览器访问：
```
https://yigui.youyou.pw/health
```

**预期结果（成功）：**
```json
{
  "status": "ok",
  "message": "智能衣柜后端服务运行中"
}
```

**如果返回 404 或 500：**
- 说明 Serverless Function 有问题
- 查看 **Runtime Logs**（见步骤5）

---

### 步骤 3：测试配置接口

访问：
```
https://yigui.youyou.pw/api/config
```

**预期结果（环境变量已配置）：**
```json
{
  "success": true,
  "configured": true,
  "config": {
    "bucket": "你的bucket名称",
    "region": "oss-cn-beijing"
  }
}
```

**如果 `configured: false`：**
- ❌ 环境变量未配置或配置错误
- 前往步骤4配置环境变量

---

### 步骤 4：配置环境变量

1. Vercel Dashboard → 项目 **yigui**
2. **Settings** → **Environment Variables**
3. 点击 **Add New**

**必须添加以下 5 个变量：**

| 变量名 | 值 | 说明 |
|--------|---|------|
| `ALIYUN_ACCESS_KEY_ID` | `LTAI...` | 阿里云 AccessKey ID |
| `ALIYUN_ACCESS_KEY_SECRET` | `xxx...` | 阿里云 AccessKey Secret |
| `ALIYUN_BAILIAN_API_KEY` | `sk-...` | 百炼 API Key |
| `OSS_BUCKET` | `你的bucket` | OSS Bucket 名称 |
| `OSS_REGION` | `oss-cn-beijing` | OSS 区域 |

**重要：**
- 每个变量的 Environment 选择 **Production**, **Preview**, **Development**（全选）
- 添加完成后点击 **Save**
- **必须点击 "Redeploy" 重新部署！**

---

### 步骤 5：查看 Runtime Logs

如果 API 返回 500 错误：

1. Vercel Dashboard → **Deployments**
2. 点击最新的 Ready 部署
3. 切换到 **Runtime Logs** 标签
4. 查找错误信息

**常见错误：**

#### 错误1：找不到模块
```
Error: Cannot find module 'express'
```
**解决方案：** 检查 `backend/package.json` 是否存在，重新部署

#### 错误2：环境变量未定义
```
Error: ALIYUN_BAILIAN_API_KEY is required
```
**解决方案：** 配置环境变量（步骤4）

#### 错误3：函数超时
```
Function execution timed out
```
**解决方案：** 已在 `vercel.json` 中设置 `maxDuration: 60`

---

### 步骤 6：清除构建缓存

如果代码已更新但部署没有生效：

1. Vercel Dashboard → **Deployments**
2. 找到最新部署
3. 点击右侧的 **"..."** 菜单
4. 选择 **Redeploy**
5. ✅ **勾选 "Clear Build Cache"**
6. 点击 **Redeploy**

这会强制清除所有缓存并重新构建。

---

### 步骤 7：浏览器测试

1. **强制刷新页面**（清除浏览器缓存）
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **打开开发者工具**（F12）

3. **切换到 Network 标签**

4. **刷新页面并检查：**
   - ✅ 不应有 `localhost:3100` 的请求
   - ✅ 所有 API 请求应该是 `/api/xxx` 或 `https://yigui.youyou.pw/api/xxx`
   - ❌ 如果有 404 或 500 错误，点击查看详情

---

## 🐛 常见问题及解决方案

### 问题1：HTTP 500 Internal Server Error

**可能原因：**
- 环境变量未配置
- 后端依赖未安装
- 代码运行时错误

**解决方案：**
1. 检查 `/api/config` 接口，确认 `configured: true`
2. 查看 Runtime Logs 找错误原因
3. 确认所有环境变量拼写正确

### 问题2：HTTP 404 Not Found

**可能原因：**
- Serverless Function 未部署
- 路由配置错误

**解决方案：**
1. 确认 `api/index.js` 文件存在
2. 检查 `vercel.json` 中的 routes 配置
3. 清除缓存重新部署

### 问题3：CORS 错误

**可能原因：**
- CORS 配置未包含当前域名

**解决方案：**
- 已在 `backend/server.js` 中配置允许 `.vercel.app` 域名
- 如果自定义域名，需要添加到 `ALLOWED_ORIGINS` 环境变量

### 问题4：API 请求超时

**可能原因：**
- AI 试穿处理时间过长
- 函数超时限制太短

**解决方案：**
- 已在 `vercel.json` 中设置 `maxDuration: 60` 秒
- Vercel Hobby 计划最长 10 秒，Pro 计划 60 秒
- 如果是 Hobby 计划，可能需要升级

---

## 📞 需要帮助？

如果按照以上步骤仍无法解决，请提供：

1. **Vercel 部署状态截图**
2. **`/health` 接口的响应**（或错误信息）
3. **`/api/config` 接口的响应**
4. **Runtime Logs 的错误信息**
5. **浏览器控制台的 Network 标签截图**

---

## ✅ 成功验证清单

部署成功后，以下所有项应该都正常：

- [ ] `https://yigui.youyou.pw/health` 返回 `{"status":"ok",...}`
- [ ] `https://yigui.youyou.pw/api/config` 返回 `{"configured":true,...}`
- [ ] 前端页面能正常加载
- [ ] 示例图片正常显示
- [ ] 选择示例照片和衣物后，点击"开始试穿"能发起请求
- [ ] 浏览器控制台没有 404 或 500 错误
- [ ] 所有 API 请求都是相对路径（不是 localhost:3100）

---

## 🚀 下一步

如果所有测试都通过：
1. 尝试实际的虚拟试穿功能
2. 测试图片上传
3. 测试数据保存

如果虚拟试穿功能仍有问题：
- 检查阿里云百炼 API Key 是否正确
- 检查 OSS 配置是否正确
- 查看 Runtime Logs 中的详细错误信息

