# OSS 配置指南

虚拟试穿功能需要将图片上传到阿里云OSS，然后通过URL提供给百炼API使用。

## 错误提示

如果遇到以下错误：
- `OSS 上传失败: The specified bucket does not exist`
- `OSS 配置不完整`

请按照以下步骤配置OSS。

## 配置步骤

### 1. 创建阿里云OSS Bucket

1. 登录 [阿里云OSS控制台](https://oss.console.aliyun.com/)
2. 点击「创建Bucket」
3. 填写Bucket信息：
   - **Bucket名称**：例如 `smart-wardrobe-tryon`
   - **地域**：选择离你最近的地域，例如 `华东1（杭州）`
   - **存储类型**：选择 `标准存储`
   - **读写权限**：选择 `公共读`（因为百炼API需要访问图片URL）
4. 点击「确定」创建

### 2. 获取 AccessKey

1. 登录 [阿里云RAM控制台](https://ram.console.aliyun.com/manage/ak)
2. 点击「创建AccessKey」
3. 复制 `AccessKey ID` 和 `AccessKey Secret`

### 3. 配置环境变量

编辑 `backend/.env` 文件，添加以下配置：

```env
# 阿里云 AccessKey（用于 OSS 存储）
ALIYUN_ACCESS_KEY_ID=你的AccessKey_ID
ALIYUN_ACCESS_KEY_SECRET=你的AccessKey_Secret

# OSS 存储配置
OSS_BUCKET=你的Bucket名称
OSS_REGION=oss-cn-hangzhou  # 根据你选择的地域填写
```

**地域对照表**：
- 华东1（杭州）：`oss-cn-hangzhou`
- 华东2（上海）：`oss-cn-shanghai`
- 华北2（北京）：`oss-cn-beijing`
- 华南1（深圳）：`oss-cn-shenzhen`
- 更多地域请查看 [OSS地域列表](https://help.aliyun.com/document_detail/31837.html)

### 4. 重启后端服务

配置完成后，重启后端服务：

```bash
cd backend
npm run dev
```

### 5. 测试配置

访问测试接口：

```bash
GET http://localhost:3100/api/test-connection
```

如果返回 `success: true`，说明配置正确。

## 常见问题

### Q: Bucket必须设置为"公共读"吗？

A: 是的，因为百炼API需要通过URL访问图片。如果设置为私有，需要生成签名URL，但百炼API可能无法访问签名URL。

### Q: 可以使用其他存储服务吗？

A: 目前代码只支持阿里云OSS。如果需要使用其他服务（如腾讯云COS、AWS S3），需要修改 `backend/services/bailian-vton-service.js` 中的上传逻辑。

### Q: 如何查看Bucket是否正确配置？

A: 在OSS控制台查看：
1. Bucket是否存在
2. Bucket的读写权限是否为"公共读"
3. Bucket所在的地域是否与配置的 `OSS_REGION` 一致

### Q: AccessKey没有权限怎么办？

A: 确保AccessKey有该Bucket的以下权限：
- `oss:PutObject`（上传文件）
- `oss:GetObject`（读取文件）
- `oss:ListObjects`（列出文件）

可以在RAM控制台为AccessKey添加OSS的完整权限。

## 费用说明

- OSS存储费用：按实际存储量计费，通常很便宜（约0.12元/GB/月）
- 流量费用：如果图片访问量大，会产生流量费用
- 请求费用：PUT请求按次数计费，通常很便宜

对于个人使用，费用通常很低（每月几元到几十元）。

## 临时解决方案（不推荐）

如果暂时无法配置OSS，虚拟试穿功能将无法使用。你可以：
1. 先使用其他功能（衣柜管理、搭配推荐等）
2. 配置好OSS后再使用虚拟试穿功能

