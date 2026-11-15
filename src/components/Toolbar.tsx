import type { CSSProperties } from 'react';
import type { PaperStyle, Tool } from '../lib/types';
import { INK_COLORS } from '../lib/defaults';
import { Icon } from './Icon';

interface ToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  color: string;
  setColor: (color: string) => void;
  width: number;
  setWidth: (width: number) => void;
  pressureSensitive: boolean;
  setPressureSensitive: (value: boolean) => void;
  allowTouch: boolean;
  setAllowTouch: (value: boolean) => void;
  paperStyle: PaperStyle;
  setPaperStyle: (style: PaperStyle) => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function Toolbar(props: ToolbarProps) {
  return (
    <section className="toolbar" aria-label="ابزارهای نوشتن">
      <div className="tool-group" role="group" aria-label="نوع ابزار">
        <button type="button" className={`tool-button ${props.tool === 'pen' ? 'is-active' : ''}`} onClick={() => props.setTool('pen')} title="قلم" aria-label="قلم" aria-pressed={props.tool === 'pen'}>
          <Icon name="pen" /><span>قلم</span>
        </button>
        <button type="button" className={`tool-button ${props.tool === 'highlighter' ? 'is-active' : ''}`} onClick={() => props.setTool('highlighter')} title="هایلایتر" aria-label="هایلایتر" aria-pressed={props.tool === 'highlighter'}>
          <Icon name="highlighter" /><span>هایلایتر</span>
        </button>
        <button type="button" className={`tool-button ${props.tool === 'eraser' ? 'is-active' : ''}`} onClick={() => props.setTool('eraser')} title="پاک‌کن" aria-label="پاک‌کن" aria-pressed={props.tool === 'eraser'}>
          <Icon name="eraser" /><span>پاک‌کن</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="color-group" role="group" aria-label="رنگ قلم">
        {INK_COLORS.map((item) => (
          <button
            type="button"
            key={item.value}
            className={`color-swatch ${props.color === item.value ? 'is-selected' : ''}`}
            style={{ '--swatch-color': item.value } as CSSProperties & { '--swatch-color': string }}
            onClick={() => props.setColor(item.value)}
            title={item.label}
            aria-label={`رنگ ${item.label}`}
            aria-pressed={props.color === item.value}
          />
        ))}
      </div>

      <div className="toolbar-divider size-divider" />

      <label className="size-control">
        <span>ضخامت</span>
        <input type="range" min="1" max="14" step="0.5" value={props.width} onChange={(event) => props.setWidth(Number(event.target.value))} />
        <b>{props.width.toLocaleString('fa-IR')}</b>
      </label>

      <div className="toolbar-divider desktop-divider" />

      <div className="toolbar-actions">
        <button type="button" className="icon-button" onClick={props.onUndo} disabled={!props.canUndo} title="واگرد" aria-label="واگرد"><Icon name="undo" /></button>
        <button type="button" className="icon-button" onClick={props.onRedo} disabled={!props.canRedo} title="ازنو" aria-label="ازنو"><Icon name="redo" /></button>
        <button type="button" className="icon-button export-button" onClick={props.onExport} title="خروجی تصویر" aria-label="خروجی تصویر"><Icon name="download" /></button>
      </div>

      <div className="toolbar-bottom-options">
        <label className="mini-select">
          <span>کاغذ</span>
          <select value={props.paperStyle} onChange={(event) => props.setPaperStyle(event.target.value as PaperStyle)}>
            <option value="grid">شطرنجی</option>
            <option value="ruled">خط‌دار</option>
            <option value="dots">نقطه‌ای</option>
            <option value="blank">سفید</option>
          </select>
        </label>
        <label className={`switch-option ${props.pressureSensitive ? 'is-on' : ''}`}>
          <input type="checkbox" checked={props.pressureSensitive} onChange={(event) => props.setPressureSensitive(event.target.checked)} />
          <Icon name="pressure" size={16} />
          <span>حساسیت فشار</span>
        </label>
        <label className={`switch-option ${props.allowTouch ? 'is-on' : ''}`}>
          <input type="checkbox" checked={props.allowTouch} onChange={(event) => props.setAllowTouch(event.target.checked)} />
          <Icon name="touch" size={16} />
          <span>نوشتن با لمس</span>
        </label>
      </div>
    </section>
  );
}
