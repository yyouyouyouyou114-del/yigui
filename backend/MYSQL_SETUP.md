# MySQL 数据库配置说明

## 数据库信息

- **数据库名称**: `wardrobe_db`
- **用户名**: `root`
- **密码**: `Admin@123`
- **主机**: `localhost`
- **端口**: `3306`

## 重要提示

⚠️ **请勿修改以下数据库**：
- `hanzi_db` - 汉字数据库（请勿修改）
- `tangshi_db` - 唐诗数据库（请勿修改）

## 数据库表结构

### clothing 表（衣物信息表）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | VARCHAR(50) | 衣物ID（主键） |
| name | VARCHAR(200) | 衣物名称 |
| category | VARCHAR(50) | 类别 |
| color | VARCHAR(50) | 颜色 |
| brand | VARCHAR(100) | 品牌（可选） |
| price | DECIMAL(10,2) | 价格（可选） |
| seasons | JSON | 适用季节（JSON数组） |
| tags | JSON | 标签（JSON数组） |
| occasions | JSON | 适用场合（JSON数组） |
| image_path | VARCHAR(500) | 图片存储路径（可选） |
| image_data | LONGBLOB | 图片二进制数据（可选） |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

## 初始化数据库

### 方法1：自动初始化（推荐）

启动后端服务时，会自动初始化数据库：

```bash
cd backend
npm run dev
```

### 方法2：手动初始化

运行初始化脚本：

```bash
cd backend
node scripts/init-db.js
```

### 方法3：通过API初始化

启动服务后，访问：

```bash
POST http://localhost:3100/api/init-db
```

## API 接口

### 1. 获取所有衣物

```
GET /api/clothing
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "clothing_1234567890_abc123",
      "name": "蓝色T恤",
      "category": "top",
      "color": "蓝色",
      "brand": "Nike",
      "price": 299.00,
      "seasons": ["spring", "summer"],
      "tags": ["休闲", "运动"],
      "occasions": ["casual", "sport"],
      "created_at": "2024-01-01T10:00:00.000Z",
      "updated_at": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

### 2. 根据ID获取衣物

```
GET /api/clothing/:id
```

### 3. 获取衣物图片

```
GET /api/clothing/:id/image
```

返回图片的二进制数据。

### 4. 添加衣物

```
POST /api/clothing
Content-Type: multipart/form-data
```

**请求参数**:
- `name` (必填): 衣物名称
- `category` (必填): 类别
- `color` (必填): 颜色
- `brand` (可选): 品牌
- `price` (可选): 价格
- `seasons` (必填): 适用季节，JSON字符串数组，如 `["spring", "summer"]`
- `tags` (可选): 标签，JSON字符串数组，如 `["休闲", "运动"]`
- `occasions` (必填): 适用场合，JSON字符串数组，如 `["casual", "sport"]`
- `image` (可选): 图片文件

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "clothing_1234567890_abc123"
  },
  "message": "衣物添加成功"
}
```

### 5. 更新衣物

```
PUT /api/clothing/:id
Content-Type: multipart/form-data
```

参数同添加衣物接口。

### 6. 删除衣物

```
DELETE /api/clothing/:id
```

### 7. 根据类别查询衣物

```
GET /api/clothing/category/:category
```

### 8. 根据季节查询衣物

```
GET /api/clothing/season/:season
```

## 测试数据库连接

```bash
GET http://localhost:3100/api/test-db
```

## 环境变量配置

在 `backend/.env` 文件中配置：

```env
# MySQL 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Admin@123
DB_NAME=wardrobe_db
```

## 注意事项

1. **数据安全**: 请确保 `.env` 文件已添加到 `.gitignore`，不要将数据库密码提交到代码仓库
2. **图片存储**: 当前图片以二进制形式存储在数据库中，如果图片较多，建议后续改为文件系统或OSS存储
3. **JSON字段**: `seasons`、`tags`、`occasions` 字段使用JSON格式存储，查询时需要使用 `JSON_CONTAINS` 等函数
4. **字符编码**: 数据库使用 `utf8mb4` 编码，支持emoji等特殊字符

