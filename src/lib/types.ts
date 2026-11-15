export type Tool = 'pen' | 'highlighter' | 'eraser';
export type PaperStyle = 'ruled' | 'grid' | 'dots' | 'blank';

export interface InkPoint {
  /** Coordinates are normalized to the paper bounds (0..1). */
  x: number;
  y: number;
  /** Pointer pressure normalized to 0..1. */
  pressure: number;
  /** Milliseconds since the stroke started. */
  t: number;
  tiltX?: number;
  tiltY?: number;
}

export interface InkStroke {
  id: string;
  tool: Tool;
  color: string;
  width: number;
  pressureSensitive: boolean;
  pointerType: string;
  points: InkPoint[];
}

export interface PenLabSettings {
  color: string;
  width: number;
  tool: Tool;
  pressureSensitive: boolean;
  allowTouch: boolean;
  paperStyle: PaperStyle;
}

export interface StoredDocument {
  schemaVersion: 1;
  updatedAt: number;
  strokes: InkStroke[];
  settings: PenLabSettings;
}
