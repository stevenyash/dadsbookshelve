export interface User {
  user_id: number;
  name: string;
  email: string;
  telephone?: string;
  role: string;
}

export interface EbookJob {
  id: number;
  book?: string;
  user_id?: number;
  final_copy?: string;
  readium_manifest?: string;
  date_uploaded?: string;
  payment_status?: string;
  payment_id?: string;
  status?: string;
  book_title?: string;
  isbn?: string;
  author?: string;
  cover_image?: string;
  users_name?: string;
  users_email?: string;
  users_telephone?: string;
  conversion_job?: EbookConversionJob;
}

export interface EbookConversionJob {
  id: number;
  ebook_id: number;
  status: 'pending' | 'queued' | 'processing' | 'converted' | 'failed';
  converted_file?: string;
  download_token?: string;
  download_expires?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

export interface EbookNotification {
  id: number;
  ebook_id: number;
  channel: 'email' | 'sms' | 'whatsapp';
  status: 'pending' | 'sent' | 'failed';
  message?: string;
  sent_at?: string;
  error_message?: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  ebook_id: number;
  admin_id: number;
  action: string;
  details?: string;
  created_at: string;
  admin_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
  code?: string;
}

export type JobStatus = 'pending' | 'processing' | 'converted' | 'failed';
export type PaymentStatus = 'pending' | 'paid';
export type NotificationChannel = 'email' | 'sms' | 'whatsapp';
