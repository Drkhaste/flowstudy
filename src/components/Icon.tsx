import type { ReactNode, SVGProps } from 'react';

type IconName = 'pen' | 'highlighter' | 'eraser' | 'undo' | 'redo' | 'download' | 'save' | 'check' | 'touch' | 'pressure' | 'info' | 'spark' | 'install' | 'trash';

const paths: Record<IconName, ReactNode> = {
  pen: <><path d="m12 19 7-7 3 3-7 7-3-3Z"/><path d="m18 13-7-7-8 8v5h5l8-8Z"/><path d="m2 21 5-1"/></>,
  highlighter: <><path d="m9 11 6-6 4 4-6 6"/><path d="m5 15 8-8 4 4-8 8H5v-4Z"/><path d="M3 21h18"/></>,
  eraser: <><path d="m7 21-4-4a2 2 0 0 1 0-3l9-9a2 2 0 0 1 3 0l6 6a2 2 0 0 1 0 3l-7 7H7Z"/><path d="m14 21 7-7"/><path d="m7 14 6 7"/></>,
  undo: <><path d="M3 7v6h6"/><path d="M5 13a8 8 0 1 1 2.2 5.5"/></>,
  redo: <><path d="M21 7v6h-6"/><path d="M19 13a8 8 0 1 0-2.2 5.5"/></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></>,
  save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  touch: <><path d="M8 13V5a2 2 0 1 1 4 0v6-2a2 2 0 1 1 4 0v3-1a2 2 0 1 1 4 0v5a6 6 0 0 1-6 6h-2a6 6 0 0 1-5-2l-3-4a2 2 0 0 1 3-3l1 1"/></>,
  pressure: <><path d="M3 17a9 9 0 0 1 18 0"/><path d="m12 13 4-5"/><path d="M12 17h.01"/></>,
  info: <><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></>,
  spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 14 1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1L19 14Z"/></>,
  install: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
  trash: <><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></>,
};

interface Props extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 18, ...props }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  );
}
