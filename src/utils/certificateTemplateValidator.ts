import { CertificateTemplateSchema, CanvasConfig, FieldConfig, BackgroundConfig } from '../types/certificateTemplateSchema';

/**
 * 验证证书模板JSON结构
 * @param templateContent JSON字符串
 * @returns 验证后的模板结构对象
 * @throws Error 如果JSON格式无效或结构不符合要求
 */
export function validateCertificateTemplate(templateContent: string): CertificateTemplateSchema {
  // 1. 验证是否为有效的JSON
  let parsed: any;
  try {
    parsed = JSON.parse(templateContent);
  } catch (error) {
    throw new Error('templateContent must be a valid JSON string');
  }

  // 2. 验证根结构
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('templateContent must be a JSON object');
  }

  // 3. 验证canvas配置
  if (!parsed.canvas || typeof parsed.canvas !== 'object') {
    throw new Error('canvas configuration is required');
  }

  const canvas = parsed.canvas as CanvasConfig;
  if (typeof canvas.width !== 'number' || canvas.width <= 0) {
    throw new Error('canvas.width must be a positive number');
  }
  if (typeof canvas.height !== 'number' || canvas.height <= 0) {
    throw new Error('canvas.height must be a positive number');
  }

  // 4. 验证background配置
  if (!canvas.background || typeof canvas.background !== 'object') {
    throw new Error('canvas.background configuration is required');
  }

  const background = canvas.background as BackgroundConfig;
  if (!['image', 'color', 'gradient'].includes(background.type)) {
    throw new Error('canvas.background.type must be one of: image, color, gradient');
  }

  if (background.type === 'image' && !background.src) {
    throw new Error('canvas.background.src is required when type is image');
  }
  if (background.type === 'color' && !background.color) {
    throw new Error('canvas.background.color is required when type is color');
  }
  if (background.type === 'gradient' && !background.gradient) {
    throw new Error('canvas.background.gradient is required when type is gradient');
  }

  // 验证border配置（可选）
  if (canvas.border) {
    if (typeof canvas.border !== 'object') {
      throw new Error('canvas.border must be an object');
    }
    if (typeof canvas.border.width !== 'number' || canvas.border.width < 0) {
      throw new Error('canvas.border.width must be a non-negative number');
    }
    if (canvas.border.color && typeof canvas.border.color !== 'string') {
      throw new Error('canvas.border.color must be a string');
    }
    if (canvas.border.style && !['solid', 'dashed', 'dotted'].includes(canvas.border.style)) {
      throw new Error('canvas.border.style must be one of: solid, dashed, dotted');
    }
  }

  // 5. 验证fields数组
  if (!Array.isArray(parsed.fields)) {
    throw new Error('fields must be an array');
  }

  if (parsed.fields.length === 0) {
    throw new Error('fields array cannot be empty');
  }

  // 6. 验证每个field
  const fieldKeys = new Set<string>();
  parsed.fields.forEach((field: any, index: number) => {
    if (!field || typeof field !== 'object') {
      throw new Error(`fields[${index}] must be an object`);
    }

    // 验证key
    if (!field.key || typeof field.key !== 'string') {
      throw new Error(`fields[${index}].key is required and must be a string`);
    }

    // 验证key唯一性
    if (fieldKeys.has(field.key)) {
      throw new Error(`Duplicate field key: ${field.key}`);
    }
    fieldKeys.add(field.key);

    // 验证type
    if (!['text', 'date', 'image', 'shape'].includes(field.type)) {
      throw new Error(`fields[${index}].type must be one of: text, date, image, shape`);
    }

    // 验证position
    if (!field.position || typeof field.position !== 'object') {
      throw new Error(`fields[${index}].position is required and must be an object`);
    }
    if (typeof field.position.x !== 'number' || typeof field.position.y !== 'number') {
      throw new Error(`fields[${index}].position.x and position.y must be numbers`);
    }

    // 验证style（image类型不需要style，其他类型需要）
    if (field.type !== 'image') {
      if (!field.style || typeof field.style !== 'object') {
        throw new Error(`fields[${index}].style is required and must be an object`);
      }
      
      if (field.type === 'text' || field.type === 'date') {
        if (typeof field.style.fontSize !== 'number' || field.style.fontSize <= 0) {
          throw new Error(`fields[${index}].style.fontSize must be a positive number`);
        }
        if (!field.style.color || typeof field.style.color !== 'string') {
          throw new Error(`fields[${index}].style.color is required and must be a string`);
        }
      } else if (field.type === 'shape') {
        // 形状类型的样式验证（可选）
        if (field.style.fillColor && typeof field.style.fillColor !== 'string') {
          throw new Error(`fields[${index}].style.fillColor must be a string`);
        }
        if (field.style.strokeColor && typeof field.style.strokeColor !== 'string') {
          throw new Error(`fields[${index}].style.strokeColor must be a string`);
        }
        if (field.style.strokeWidth && (typeof field.style.strokeWidth !== 'number' || field.style.strokeWidth < 0)) {
          throw new Error(`fields[${index}].style.strokeWidth must be a non-negative number`);
        }
        // 验证通用颜色属性（用于几何装饰、分隔线、徽章等）
        if (field.style.color && typeof field.style.color !== 'string') {
          throw new Error(`fields[${index}].style.color must be a string`);
        }
        // 验证代币颜色（用于勋章）
        if (field.style.coinColor && typeof field.style.coinColor !== 'string') {
          throw new Error(`fields[${index}].style.coinColor must be a string`);
        }
      }
    }

    // 验证align（如果提供，且字段有style）
    if (field.style && field.style.align && !['left', 'center', 'right'].includes(field.style.align)) {
      throw new Error(`fields[${index}].style.align must be one of: left, center, right`);
    }

    // 验证date类型的format
    if (field.type === 'date' && field.format) {
      const validFormats = ['YYYY-MM-DD', 'YYYY年MM月DD日', 'MM/DD/YYYY', 'DD/MM/YYYY'];
      if (!validFormats.includes(field.format)) {
        throw new Error(`fields[${index}].format must be one of: ${validFormats.join(', ')}`);
      }
    }

    // 验证image类型的src
    if (field.type === 'image' && !field.src) {
      throw new Error(`fields[${index}].src is required when type is image`);
    }

    // 验证shape类型的shape和size
    if (field.type === 'shape') {
      const validShapes = ['medal', 'circle', 'star', 'geometric', 'line', 'badge'];
      if (field.shape && !validShapes.includes(field.shape)) {
        throw new Error(`fields[${index}].shape must be one of: ${validShapes.join(', ')}`);
      }
      if (field.size && (typeof field.size !== 'number' || field.size <= 0)) {
        throw new Error(`fields[${index}].size must be a positive number`);
      }
      // 验证badge类型的badgeType
      if (field.shape === 'badge' && field.badgeType) {
        const validBadgeTypes = ['certified', 'graduation', 'official'];
        if (!validBadgeTypes.includes(field.badgeType)) {
          throw new Error(`fields[${index}].badgeType must be one of: ${validBadgeTypes.join(', ')}`);
        }
      }
      // 验证line类型的width（在style中）
      if (field.shape === 'line' && field.style && field.style.width) {
        if (typeof field.style.width !== 'number' || field.style.width <= 0) {
          throw new Error(`fields[${index}].style.width must be a positive number`);
        }
      }
    }
  });

  return parsed as CertificateTemplateSchema;
}
