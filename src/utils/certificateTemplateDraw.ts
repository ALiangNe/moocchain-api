import { Canvas, loadImage } from 'skia-canvas';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

/**
 * 加载图片（支持本地路径和URL）
 */
export async function loadImageFromSource(src: string): Promise<any> {
  // 处理URL图片
  if (src.startsWith('http://') || src.startsWith('https://')) {
    let response: any;
    try {
      response = await axios.get(src, { responseType: 'arraybuffer' });
    } catch (error) {
      console.error(`Failed to download image from ${src}:`, error);
      throw new Error(`Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const buffer = Buffer.from(response.data);
    let image: any;
    try {
      image = await loadImage(buffer);
    } catch (error) {
      console.error(`Failed to load image from buffer:`, error);
      throw new Error(`Failed to load image from buffer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    return image;
  }

  // 处理本地路径
  let imagePath: string;
  if (path.isAbsolute(src)) {
    imagePath = src;
  } else {
    const projectRoot = path.resolve(__dirname, '../../');
    imagePath = path.resolve(projectRoot, src);
  }

  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  let image: any;
  try {
    image = await loadImage(imagePath);
  } catch (error) {
    console.error(`Failed to load image from ${imagePath}:`, error);
    throw new Error(`Failed to load image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  return image;
}

/**
 * 生成证书图片
 * 使用skia-canvas和sharp生成证书图片
 */
export async function generateCertificateImage(templateData: any): Promise<Buffer> {
  const { canvas: canvasConfig, fields } = templateData;
  const width = canvasConfig?.width || 1600;
  const height = canvasConfig?.height || 1200;

  // 创建Canvas
  const canvas = new Canvas(width, height);
  const ctx = canvas.getContext('2d');

  // 绘制背景
  const background = canvasConfig?.background;
  if (!background) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  } else if (background.type === 'color') {
    ctx.fillStyle = background.color || '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  } else if (background.type === 'image' && background.src) {
    let bgImage: any;
    try {
      bgImage = await loadImageFromSource(background.src);
    } catch (error) {
      console.warn('Failed to load background image, using white background:', error);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
    }
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, width, height);
    }
  } else {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  }

  // 绘制边框
  const border = canvasConfig?.border;
  if (border && border.width > 0) {
    ctx.strokeStyle = border.color || '#000000';
    ctx.lineWidth = border.width;
    
    if (border.style === 'dashed') {
      ctx.setLineDash([10, 5]);
    } else if (border.style === 'dotted') {
      ctx.setLineDash([2, 2]);
    } else {
      ctx.setLineDash([]);
    }
    
    const halfWidth = border.width / 2;
    ctx.strokeRect(halfWidth, halfWidth, width - border.width, height - border.width);
  }

  // 设置默认字体和样式
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 渲染字段
  const fieldList = fields || [];
  for (const field of fieldList) {
    // 处理文本字段
    if (field.type === 'text') {
      const position = field.position || {};
      const style = field.style || {};
      let value = field.value || field.defaultValue || '';
      
      if (!value) continue;

      ctx.font = `${style.fontWeight || 'normal'} ${style.fontSize || 24}px ${style.fontFamily || 'Arial'}`;
      ctx.fillStyle = style.color || '#000000';
      ctx.textAlign = style.align === 'left' ? 'left' : style.align === 'right' ? 'right' : 'center';
      ctx.textBaseline = 'top';
      
      const maxWidth = style.maxWidth || width;
      const lineHeight = style.lineHeight || style.fontSize || 24;
      const x = position.x || width / 2;
      let y = position.y || height / 2;
      
      const text = String(value);
      const wrapLineByChar = (input: string, max: number): string[] => {
        const chars = input.split('');
        const lines: string[] = [];
        let line = '';
        for (const ch of chars) {
          const testLine = line + ch;
          if (ctx.measureText(testLine).width > max && line.length > 0) {
            lines.push(line);
            line = ch;
          } else {
            line = testLine;
          }
        }
        if (line.length > 0) lines.push(line);
        return lines;
      };

      // 支持显式换行：先按 \n 分段，再按 maxWidth 自动折行
      const paragraphs = text.split(/\r?\n/);
      const lines: string[] = [];
      for (const p of paragraphs) {
        if (p === '') {
          lines.push('');
          continue;
        }
        if (maxWidth < width) {
          lines.push(...wrapLineByChar(p, maxWidth));
        } else {
          lines.push(p);
        }
      }

      if (lines.length > 1) {
        ctx.textBaseline = 'top';
        lines.forEach((ln, index) => {
          const lineY = y + index * lineHeight;
          ctx.fillText(ln, x, lineY);
        });
      } else {
        // 单行文本
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
      }
      continue;
    }

    // 处理日期字段
    if (field.type === 'date') {
      const position = field.position || {};
      const style = field.style || {};
      
      // 获取日期值，如果没有则使用当前日期
      let dateValue = field.value;
      if (!dateValue || dateValue === 'NaN-NaN-NaN') {
        dateValue = new Date().toISOString().split('T')[0];
      }
      
      // 解析日期
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        dateValue = new Date().toISOString().split('T')[0];
      }
      
      let formattedDate = dateValue;
      if (field.format) {
        const validDate = new Date(dateValue);
        if (!isNaN(validDate.getTime())) {
          const year = validDate.getFullYear();
          const month = String(validDate.getMonth() + 1).padStart(2, '0');
          const day = String(validDate.getDate()).padStart(2, '0');
          
          if (field.format === 'YYYY-MM-DD') {
            formattedDate = `${year}-${month}-${day}`;
          } else if (field.format === 'YYYY年MM月DD日') {
            formattedDate = `${year}年${month}月${day}日`;
          } else if (field.format === 'MM/DD/YYYY') {
            formattedDate = `${month}/${day}/${year}`;
          } else if (field.format === 'DD/MM/YYYY') {
            formattedDate = `${day}/${month}/${year}`;
          }
        }
      }

      ctx.font = `${style.fontWeight || 'normal'} ${style.fontSize || 24}px ${style.fontFamily || 'Arial'}`;
      ctx.fillStyle = style.color || '#000000';
      ctx.textAlign = style.align === 'left' ? 'left' : style.align === 'right' ? 'right' : 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(formattedDate, position.x || width / 2, position.y || height / 2);
      continue;
    }

    // 处理图片字段
    if (field.type === 'image') {
      const imageSrc = field.src || field.value;
      if (!imageSrc) continue;

      const position = field.position || {};
      let image: any;
      
      try {
        image = await loadImageFromSource(imageSrc);
      } catch (error) {
        console.warn(`Failed to load image for field ${field.key}:`, error);
        continue;
      }

      const imageWidth = field.width || image.width;
      const imageHeight = field.height || image.height;
      const imageX = position.x - (imageWidth / 2);
      const imageY = position.y - (imageHeight / 2);
      
      ctx.drawImage(image, imageX, imageY, imageWidth, imageHeight);
      continue;
    }

    // 处理形状字段 - 勋章
    if (field.type === 'shape' && field.shape === 'medal') {
      const position = field.position || {};
      const style = field.style || {};
      const size = field.size || 200;
      const centerX = position.x;
      const centerY = position.y;
      const radius = size / 2;
      const coinColor = style.coinColor || '#007AFF';
      
      ctx.save();
      
      // 绘制银色质感勋章 - 使用径向渐变
      const gradient = ctx.createRadialGradient(
        centerX - radius * 0.3,
        centerY - radius * 0.3,
        0,
        centerX,
        centerY,
        radius
      );
      gradient.addColorStop(0, '#F5F5F5');
      gradient.addColorStop(0.3, '#E8E8E8');
      gradient.addColorStop(0.6, '#C0C0C0');
      gradient.addColorStop(1, '#A8A8A8');
      
      // 绘制银色圆形主体
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // 添加高光效果
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      
      // 绘制银色五角星
      ctx.fillStyle = '#D3D3D3';
      ctx.beginPath();
      const starPoints = 5;
      const innerRadius = radius * 0.4;
      for (let i = 0; i < starPoints * 2; i++) {
        const angle = (i * Math.PI) / starPoints - Math.PI / 2;
        const r = i % 2 === 0 ? radius * 0.75 : innerRadius;
        const px = centerX + Math.cos(angle) * r;
        const py = centerY + Math.sin(angle) * r;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();
      
      // 绘制蓝色代币围绕勋章
      const coinRadius = 8;
      const coinDistance = radius + 25;
      const coinCount = 12;
      ctx.fillStyle = coinColor;
      
      for (let i = 0; i < coinCount; i++) {
        const angle = (i * 2 * Math.PI) / coinCount;
        const coinX = centerX + Math.cos(angle) * coinDistance;
        const coinY = centerY + Math.sin(angle) * coinDistance;
        
        // 绘制代币（小圆点）
        ctx.beginPath();
        ctx.arc(coinX, coinY, coinRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 添加代币高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(coinX - coinRadius * 0.3, coinY - coinRadius * 0.3, coinRadius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = coinColor;
      }
      
      ctx.restore();
      continue;
    }

    // 处理形状字段 - 圆形
    if (field.type === 'shape' && field.shape === 'circle') {
      const position = field.position || {};
      const style = field.style || {};
      const size = field.size || 100;
      const radius = size / 2;
      
      ctx.save();
      ctx.fillStyle = style.fillColor || '#000000';
      ctx.strokeStyle = style.strokeColor || '#000000';
      ctx.lineWidth = style.strokeWidth || 2;
      
      ctx.beginPath();
      ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
      if (style.fillColor) ctx.fill();
      if (style.strokeColor) ctx.stroke();
      ctx.restore();
      continue;
    }

    // 处理形状字段 - 几何装饰（四角装饰）
    if (field.type === 'shape' && field.shape === 'geometric') {
      const style = field.style || {};
      const color = style.color || '#00CED1';
      
      ctx.save();
      
      // 创建渐变
      const gradient1 = ctx.createLinearGradient(0, 0, 200, 200);
      gradient1.addColorStop(0, color);
      gradient1.addColorStop(1, 'rgba(0, 206, 209, 0.1)');
      
      const gradient2 = ctx.createLinearGradient(width, 0, width - 200, 200);
      gradient2.addColorStop(0, color);
      gradient2.addColorStop(1, 'rgba(0, 206, 209, 0.1)');
      
      const gradient3 = ctx.createLinearGradient(0, height, 200, height - 200);
      gradient3.addColorStop(0, color);
      gradient3.addColorStop(1, 'rgba(0, 206, 209, 0.1)');
      
      const gradient4 = ctx.createLinearGradient(width, height, width - 200, height - 200);
      gradient4.addColorStop(0, color);
      gradient4.addColorStop(1, 'rgba(0, 206, 209, 0.1)');
      
      ctx.globalAlpha = 0.2;
      
      // 左上角装饰 - 多个三角形叠加
      ctx.fillStyle = gradient1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(200, 0);
      ctx.lineTo(0, 200);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(140, 0);
      ctx.lineTo(0, 140);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(90, 0);
      ctx.lineTo(0, 90);
      ctx.closePath();
      ctx.fill();
      
      // 右上角装饰
      ctx.fillStyle = gradient2;
      ctx.beginPath();
      ctx.moveTo(width, 0);
      ctx.lineTo(width - 200, 0);
      ctx.lineTo(width, 200);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(width, 0);
      ctx.lineTo(width - 140, 0);
      ctx.lineTo(width, 140);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(width, 0);
      ctx.lineTo(width - 90, 0);
      ctx.lineTo(width, 90);
      ctx.closePath();
      ctx.fill();
      
      // 左下角装饰
      ctx.fillStyle = gradient3;
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(200, height);
      ctx.lineTo(0, height - 200);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(140, height);
      ctx.lineTo(0, height - 140);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(90, height);
      ctx.lineTo(0, height - 90);
      ctx.closePath();
      ctx.fill();
      
      // 右下角装饰
      ctx.fillStyle = gradient4;
      ctx.beginPath();
      ctx.moveTo(width, height);
      ctx.lineTo(width - 200, height);
      ctx.lineTo(width, height - 200);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(width, height);
      ctx.lineTo(width - 140, height);
      ctx.lineTo(width, height - 140);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(width, height);
      ctx.lineTo(width - 90, height);
      ctx.lineTo(width, height - 90);
      ctx.closePath();
      ctx.fill();
      
      ctx.globalAlpha = 1.0;
      ctx.restore();
      continue;
    }

    // 处理形状字段 - 分隔线
    if (field.type === 'shape' && field.shape === 'line') {
      const position = field.position || {};
      const style = field.style || {};
      const lineWidth = style.width || 400;
      const lineColor = style.color || '#cccccc';
      
      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(position.x - lineWidth / 2, position.y);
      ctx.lineTo(position.x + lineWidth / 2, position.y);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    // 处理形状字段 - 认证徽章
    if (field.type === 'shape' && field.shape === 'badge') {
      const position = field.position || {};
      const style = field.style || {};
      const size = field.size || 80;
      const badgeType = (field as any).badgeType || 'certified';
      const badgeColor = style.color || '#007AFF';
      const radius = size / 2;
      const centerX = position.x;
      const centerY = position.y;
      
      ctx.save();
      
      // 绘制徽章圆形背景
      const gradient = ctx.createRadialGradient(
        centerX - radius * 0.3,
        centerY - radius * 0.3,
        0,
        centerX,
        centerY,
        radius
      );
      gradient.addColorStop(0, badgeColor);
      gradient.addColorStop(1, darkenColor(badgeColor, 0.3));
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // 添加边框
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // 绘制徽章图标
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      
      if (badgeType === 'certified') {
        // 绘制对勾（更粗更明显）
        ctx.beginPath();
        ctx.moveTo(centerX - radius * 0.25, centerY);
        ctx.lineTo(centerX - radius * 0.05, centerY + radius * 0.25);
        ctx.lineTo(centerX + radius * 0.35, centerY - radius * 0.25);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      } else if (badgeType === 'graduation') {
        // 绘制毕业帽（更精致）
        ctx.beginPath();
        // 帽顶
        ctx.moveTo(centerX - radius * 0.45, centerY - radius * 0.25);
        ctx.lineTo(centerX + radius * 0.45, centerY - radius * 0.25);
        ctx.lineTo(centerX + radius * 0.35, centerY + radius * 0.05);
        ctx.lineTo(centerX - radius * 0.35, centerY + radius * 0.05);
        ctx.closePath();
        ctx.fill();
        
        // 帽檐
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + radius * 0.05, radius * 0.5, radius * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 流苏
        ctx.beginPath();
        ctx.arc(centerX, centerY + radius * 0.2, radius * 0.12, 0, Math.PI * 2);
        ctx.fill();
      } else if (badgeType === 'official') {
        // 绘制星星（更精致）
        ctx.beginPath();
        const starPoints = 5;
        const innerRadius = radius * 0.35;
        for (let i = 0; i < starPoints * 2; i++) {
          const angle = (i * Math.PI) / starPoints - Math.PI / 2;
          const r = i % 2 === 0 ? radius * 0.55 : innerRadius;
          const px = centerX + Math.cos(angle) * r;
          const py = centerY + Math.sin(angle) * r;
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();
        ctx.fill();
      }
      
      // 绘制底部横幅（仅对 certified 和 official）
      if (badgeType === 'certified' || badgeType === 'official') {
        const bannerText = badgeType === 'certified' ? 'CERTIFIED' : 'OFFICIAL';
        const bannerHeight = radius * 0.35;
        const bannerWidth = radius * 1.7;
        
        // 绘制横幅背景（带圆角效果）
        ctx.fillStyle = badgeColor;
        const bannerX = centerX - bannerWidth / 2;
        const bannerY = centerY + radius * 0.55;
        const cornerRadius = 4;
        ctx.beginPath();
        ctx.moveTo(bannerX + cornerRadius, bannerY);
        ctx.lineTo(bannerX + bannerWidth - cornerRadius, bannerY);
        ctx.quadraticCurveTo(bannerX + bannerWidth, bannerY, bannerX + bannerWidth, bannerY + cornerRadius);
        ctx.lineTo(bannerX + bannerWidth, bannerY + bannerHeight - cornerRadius);
        ctx.quadraticCurveTo(bannerX + bannerWidth, bannerY + bannerHeight, bannerX + bannerWidth - cornerRadius, bannerY + bannerHeight);
        ctx.lineTo(bannerX + cornerRadius, bannerY + bannerHeight);
        ctx.quadraticCurveTo(bannerX, bannerY + bannerHeight, bannerX, bannerY + bannerHeight - cornerRadius);
        ctx.lineTo(bannerX, bannerY + cornerRadius);
        ctx.quadraticCurveTo(bannerX, bannerY, bannerX + cornerRadius, bannerY);
        ctx.closePath();
        ctx.fill();
        
        // 绘制横幅文字
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.floor(radius * 0.18)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bannerText, centerX, centerY + radius * 0.725);
      }
      
      ctx.restore();
      continue;
    }
  }

  // 转换为Buffer
  const pngBuffer = await canvas.toBuffer('png');

  // 使用sharp优化图片质量
  let optimizedBuffer: Buffer;
  try {
    optimizedBuffer = await sharp(pngBuffer)
      .png({ quality: 90 })
      .toBuffer();
  } catch (error) {
    console.error('Failed to optimize image with sharp:', error);
    throw new Error(`Failed to optimize certificate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return optimizedBuffer;
}

// 辅助函数：加深颜色
function darkenColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - Math.floor(255 * amount));
  const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - Math.floor(255 * amount));
  const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - Math.floor(255 * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
