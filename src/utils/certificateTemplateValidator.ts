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
    if (!['text', 'date', 'image'].includes(field.type)) {
      throw new Error(`fields[${index}].type must be one of: text, date, image`);
    }

    // 验证position
    if (!field.position || typeof field.position !== 'object') {
      throw new Error(`fields[${index}].position is required and must be an object`);
    }
    if (typeof field.position.x !== 'number' || typeof field.position.y !== 'number') {
      throw new Error(`fields[${index}].position.x and position.y must be numbers`);
    }

    // 验证style
    if (!field.style || typeof field.style !== 'object') {
      throw new Error(`fields[${index}].style is required and must be an object`);
    }
    if (typeof field.style.fontSize !== 'number' || field.style.fontSize <= 0) {
      throw new Error(`fields[${index}].style.fontSize must be a positive number`);
    }
    if (!field.style.color || typeof field.style.color !== 'string') {
      throw new Error(`fields[${index}].style.color is required and must be a string`);
    }

    // 验证align（如果提供）
    if (field.style.align && !['left', 'center', 'right'].includes(field.style.align)) {
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
  });

  return parsed as CertificateTemplateSchema;
}
