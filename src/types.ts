export interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: string;
  sizeKb: number;
}

export interface AndroidProjectFile {
  path: string;
  title: string;
  language: string;
  description: string;
  content: string;
}
