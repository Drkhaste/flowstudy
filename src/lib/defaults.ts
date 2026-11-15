import type { PenLabSettings } from './types';

export const DEFAULT_SETTINGS: PenLabSettings = {
  color: '#172b4d',
  width: 4.5,
  tool: 'pen',
  pressureSensitive: true,
  allowTouch: false,
  paperStyle: 'grid',
};

export const INK_COLORS = [
  { value: '#172b4d', label: 'سرمه‌ای' },
  { value: '#146c94', label: 'آبی' },
  { value: '#0f766e', label: 'سبزآبی' },
  { value: '#26834a', label: 'سبز' },
  { value: '#b42318', label: 'قرمز' },
  { value: '#7c3aed', label: 'بنفش' },
  { value: '#d97706', label: 'نارنجی' },
  { value: '#202124', label: 'مشکی' },
];
