/**
 * 证书模板JSON结构类型定义
 * 用于验证管理员上传的证书模板配置
 */

// Canvas配置
export interface CanvasConfig {
  width: number;                  // Canvas宽度（像素）
  height: number;                 // Canvas高度（像素）
  background: BackgroundConfig;   // 背景配置
}

// 背景配置
export interface BackgroundConfig {
  type: 'image' | 'color' | 'gradient';   // 背景类型（image:图片，color:颜色，gradient:渐变）
  src?: string;                           // 图片URL（type为image时必需）
  color?: string;                         // 颜色值（type为color时必需）
  gradient?: {                            // 渐变配置（type为gradient时必需）
    type: 'linear' | 'radial';            // 渐变类型（linear:线性，radial:径向）
    colors: string[];                     // 颜色数组
    direction?: string;                   // 渐变方向
  };
}

// 字段位置
export interface FieldPosition {
  x: number;  // X坐标（像素）
  y: number;  // Y坐标（像素）
}

// 文本样式
export interface TextStyle {
  fontSize: number;                                    // 字体大小（像素）
  fontWeight?: 'normal' | 'bold' | 'lighter' | number; // 字体粗细（normal:正常，bold:粗体，lighter:细体，或数字）
  color: string;                                       // 字体颜色（十六进制颜色值）
  align?: 'left' | 'center' | 'right';                 // 对齐方式（left:左对齐，center:居中，right:右对齐）
  maxWidth?: number;                                   // 文本最大宽度（用于换行）
  fontFamily?: string;                                 // 字体族
  lineHeight?: number;                                 // 行高
}

// 日期格式
export type DateFormat = 'YYYY-MM-DD' | 'YYYY年MM月DD日' | 'MM/DD/YYYY' | 'DD/MM/YYYY';

// 字段类型
export type FieldType = 'text' | 'date' | 'image';

// 字段配置
export interface FieldConfig {
  key: string;                     // 字段唯一标识
  type: FieldType;                 // 字段类型（text:文本，date:日期，image:图片）
  label?: string;                  // 字段标签（用于显示）
  defaultValue?: string;           // 默认值
  position: FieldPosition;         // 字段位置
  style: TextStyle;                // 文本样式
  format?: DateFormat;             // 日期格式（type为date时使用）
  src?: string;                    // 图片URL（type为image时使用）
  width?: number;                  // 图片宽度（type为image时使用）
  height?: number;                 // 图片高度（type为image时使用）
}

// 证书模板JSON结构
export interface CertificateTemplateSchema {
  canvas: CanvasConfig;   // Canvas配置
  fields: FieldConfig[];  // 字段配置数组
}
