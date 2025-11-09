const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.join(__dirname, '../public');

const imagesToCompress = [
  'sample-dress-green.png',
  'sample-dress-pink.png'
];

async function compressImage(filename) {
  const inputPath = path.join(publicDir, filename);
  const outputPath = path.join(publicDir, filename);
  
  console.log(`压缩图片: ${filename}`);
  
  const originalSize = fs.statSync(inputPath).size;
  console.log(`原始大小: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
  
  // 备份原文件
  const backupPath = inputPath.replace('.png', '.backup.png');
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(inputPath, backupPath);
    console.log(`已备份到: ${path.basename(backupPath)}`);
  } else {
    console.log(`备份已存在，跳过`);
  }
  
  // 压缩图片：调整大小并优化质量
  await sharp(inputPath)
    .resize(1024, 1024, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .png({
      quality: 80,
      compressionLevel: 9,
      palette: true // 使用调色板模式进一步压缩
    })
    .toFile(outputPath + '.tmp');
  
  // 替换原文件
  fs.unlinkSync(outputPath);
  fs.renameSync(outputPath + '.tmp', outputPath);
  
  const newSize = fs.statSync(outputPath).size;
  console.log(`压缩后大小: ${(newSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`压缩率: ${((1 - newSize / originalSize) * 100).toFixed(1)}%`);
  console.log('');
}

async function main() {
  console.log('\n========================================');
  console.log('🗜️  开始压缩示例图片');
  console.log('========================================\n');
  
  for (const filename of imagesToCompress) {
    try {
      await compressImage(filename);
    } catch (error) {
      console.error(`压缩 ${filename} 失败:`, error.message);
    }
  }
  
  console.log('========================================');
  console.log('✅ 图片压缩完成！');
  console.log('========================================\n');
  console.log('备份文件保存在 public 目录，文件名为 *.backup.png');
  console.log('如需恢复，请手动重命名备份文件\n');
}

main().catch(console.error);

