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

      // 支持fontStyle（斜体）属性
      const fontStyle = style.fontStyle === 'italic' ? 'italic' : 'normal';
      const baseFontSize = style.fontSize || 24;
      const baseFontWeight = style.fontWeight || 'normal';
      const fontFamily = style.fontFamily || 'Arial';
      const textColor = style.color || '#000000';
      const maxWidth = style.maxWidth || width;
      const lineHeight = style.lineHeight || baseFontSize;
      const x = position.x || width / 2;
      let y = position.y || height / 2;
      
      const text = String(value);
      
      // 检查是否包含加粗标记 <b>...</b>
      const hasBoldTags = text.includes('<b>') && text.includes('</b>');
      
      if (hasBoldTags) {
        // 支持部分文本加粗：解析 <b>...</b> 标记
        ctx.textBaseline = 'top';
        ctx.fillStyle = textColor;
        
        // 按换行符分段处理
        const paragraphs = text.split(/\r?\n/);
        let currentY = y;
        
        for (const paragraph of paragraphs) {
          if (paragraph === '') {
            currentY += lineHeight;
            continue;
          }
          
          // 解析段落中的加粗标记
          const parts: Array<{ text: string; bold: boolean }> = [];
          let remaining = paragraph;
          
          while (remaining.length > 0) {
            const boldStart = remaining.indexOf('<b>');
            const boldEnd = remaining.indexOf('</b>');
            
            if (boldStart !== -1 && boldEnd !== -1 && boldEnd > boldStart) {
              // 添加加粗标记前的普通文本
              if (boldStart > 0) {
                parts.push({ text: remaining.substring(0, boldStart), bold: false });
              }
              // 添加加粗文本
              parts.push({ text: remaining.substring(boldStart + 3, boldEnd), bold: true });
              // 继续处理剩余文本
              remaining = remaining.substring(boldEnd + 4);
            } else {
              // 没有更多加粗标记，添加剩余文本
              if (remaining.length > 0) {
                parts.push({ text: remaining, bold: false });
              }
              break;
            }
          }
          
          // 计算当前行的总宽度，用于居中对齐
          let totalWidth = 0;
          const measurements: Array<{ width: number; text: string; bold: boolean }> = [];
          
          for (const part of parts) {
            ctx.font = `${fontStyle} ${part.bold ? 'bold' : baseFontWeight} ${baseFontSize}px ${fontFamily}`;
            const width = ctx.measureText(part.text).width;
            totalWidth += width;
            measurements.push({ width, text: part.text, bold: part.bold });
          }
          
          // 计算起始X坐标（根据对齐方式，确保居中）
          let currentX = x;
          if (style.align === 'center' || style.align !== 'left' && style.align !== 'right') {
            // 居中对齐：从中心点向左偏移总宽度的一半
            currentX = x - totalWidth / 2;
            ctx.textAlign = 'left'; // 使用left对齐，然后手动计算位置
          } else if (style.align === 'right') {
            currentX = x - totalWidth;
            ctx.textAlign = 'left';
          } else {
            // left对齐
            currentX = x;
            ctx.textAlign = 'left';
          }
          
          // 渲染各部分文本
          for (const measure of measurements) {
            ctx.font = `${fontStyle} ${measure.bold ? 'bold' : baseFontWeight} ${baseFontSize}px ${fontFamily}`;
            ctx.fillText(measure.text, currentX, currentY);
            currentX += measure.width;
          }
          
          currentY += lineHeight;
        }
      } else {
        // 没有加粗标记，使用原有逻辑
        ctx.font = `${fontStyle} ${baseFontWeight} ${baseFontSize}px ${fontFamily}`;
        ctx.fillStyle = textColor;
        ctx.textAlign = style.align === 'left' ? 'left' : style.align === 'right' ? 'right' : 'center';
        ctx.textBaseline = 'top';
        
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

      // 支持fontStyle（斜体）属性
      const fontStyle = style.fontStyle === 'italic' ? 'italic' : 'normal';
      ctx.font = `${fontStyle} ${style.fontWeight || 'normal'} ${style.fontSize || 24}px ${style.fontFamily || 'Arial'}`;
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
      
      // 添加阴影效果
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
      
      // 绘制徽章圆形背景（优化渐变）
      const gradient = ctx.createRadialGradient(
        centerX - radius * 0.3,
        centerY - radius * 0.3,
        0,
        centerX,
        centerY,
        radius
      );
      gradient.addColorStop(0, lightenColor(badgeColor, 0.2));
      gradient.addColorStop(0.4, badgeColor);
      gradient.addColorStop(1, darkenColor(badgeColor, 0.4));
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // 重置阴影
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // 添加更明显的边框
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = Math.max(3, radius * 0.05);
      ctx.stroke();
      
      // 添加内边框（增加层次感）
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = Math.max(1, radius * 0.02);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - Math.max(3, radius * 0.05), 0, Math.PI * 2);
      ctx.stroke();
      
      // 绘制徽章图标（根据大小调整线条粗细）
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(5, radius * 0.08);
      
      if (badgeType === 'certified') {
        // 绘制对勾（更粗更明显，优化比例）
        ctx.beginPath();
        ctx.moveTo(centerX - radius * 0.28, centerY - radius * 0.05);
        ctx.lineTo(centerX - radius * 0.08, centerY + radius * 0.2);
        ctx.lineTo(centerX + radius * 0.32, centerY - radius * 0.3);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        // 添加高光效果
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = Math.max(2, radius * 0.03);
        ctx.beginPath();
        ctx.moveTo(centerX - radius * 0.28, centerY - radius * 0.05);
        ctx.lineTo(centerX - radius * 0.08, centerY + radius * 0.2);
        ctx.lineTo(centerX + radius * 0.32, centerY - radius * 0.3);
        ctx.stroke();
      } else if (badgeType === 'graduation') {
        // 绘制毕业帽（更精致，增加细节）
        // 帽顶（带渐变）
        const capGradient = ctx.createLinearGradient(
          centerX - radius * 0.45,
          centerY - radius * 0.25,
          centerX + radius * 0.45,
          centerY + radius * 0.05
        );
        capGradient.addColorStop(0, '#FFFFFF');
        capGradient.addColorStop(1, '#E0E0E0');
        ctx.fillStyle = capGradient;
        ctx.beginPath();
        ctx.moveTo(centerX - radius * 0.45, centerY - radius * 0.25);
        ctx.lineTo(centerX + radius * 0.45, centerY - radius * 0.25);
        ctx.lineTo(centerX + radius * 0.35, centerY + radius * 0.05);
        ctx.lineTo(centerX - radius * 0.35, centerY + radius * 0.05);
        ctx.closePath();
        ctx.fill();
        
        // 帽顶边框
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = Math.max(1, radius * 0.02);
        ctx.stroke();
        
        // 帽檐（带阴影效果）
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + radius * 0.05, radius * 0.52, radius * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 流苏（带渐变）
        const tasselGradient = ctx.createRadialGradient(
          centerX,
          centerY + radius * 0.2,
          0,
          centerX,
          centerY + radius * 0.2,
          radius * 0.12
        );
        tasselGradient.addColorStop(0, '#FFD700');
        tasselGradient.addColorStop(1, '#FFA500');
        ctx.fillStyle = tasselGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY + radius * 0.2, radius * 0.12, 0, Math.PI * 2);
        ctx.fill();
      } else if (badgeType === 'official') {
        // 绘制星星（更精致，带渐变）
        const starGradient = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          radius * 0.6
        );
        starGradient.addColorStop(0, '#FFFFFF');
        starGradient.addColorStop(1, '#FFD700');
        ctx.fillStyle = starGradient;
        ctx.beginPath();
        const starPoints = 5;
        const innerRadius = radius * 0.38;
        for (let i = 0; i < starPoints * 2; i++) {
          const angle = (i * Math.PI) / starPoints - Math.PI / 2;
          const r = i % 2 === 0 ? radius * 0.58 : innerRadius;
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
        
        // 添加星星边框
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = Math.max(2, radius * 0.03);
        ctx.stroke();
      }
      
      // 绘制底部横幅（对所有类型都添加）
      let bannerText = '';
      if (badgeType === 'certified') {
        bannerText = 'CERTIFIED';
      } else if (badgeType === 'official') {
        bannerText = 'OFFICIAL';
      } else if (badgeType === 'graduation') {
        bannerText = 'ACCREDITED';
      }
      
      if (bannerText) {
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
        
        // 绘制横幅文字（增加阴影效果）
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.floor(radius * 0.2)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bannerText, centerX, centerY + radius * 0.725);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
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

// 辅助函数：变亮颜色
function lightenColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + Math.floor(255 * amount));
  const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + Math.floor(255 * amount));
  const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + Math.floor(255 * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
