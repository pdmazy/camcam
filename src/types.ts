export interface CapturedPhoto {
  id: string;
  dataUrl: string;
  photocopyUrl?: string;
  grayscaleUrl?: string;
  originalUrl?: string;
  timestamp: string;
  sizeKb: number;
}

export type PageSize = 'A4' | 'A5' | 'A6' | 'B5';
export type PageOrientation = 'portrait' | 'landscape';
export type LayoutMode = '1-in-1' | '2-in-1' | '4-in-1';
export type MarginMode = 'standard' | 'compact' | 'none';

export interface PrintSettings {
  pageSize: PageSize;
  layoutMode: LayoutMode;
  orientation: PageOrientation;
  margin: MarginMode;
  addCutLine: boolean;
  addTimestampFooter: boolean;
  secondaryPhoto?: string; // For 2-in-1 (e.g. back of ID card)
}

export interface AndroidProjectFile {
  path: string;
  title: string;
  language: string;
  description: string;
  content: string;
}

