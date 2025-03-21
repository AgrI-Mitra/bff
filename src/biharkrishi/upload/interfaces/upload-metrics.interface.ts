export interface UploadMetrics {
  status: 'STARTED' | 'COMPLETED' | 'FAILED';
  fileName: string;
  schemeName: string;
  mainQuestionsCount: number;
  variationsCount: number;
  uploadDate: Date;
  processingTimeMs: number;
  errorMessage?: string;
} 