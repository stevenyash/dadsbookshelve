export interface BookDetails {
  book_title: string
  author: string
  isbn: string
  genre_id: number | string
  image_url: File | null
  image_url_preview: string
  softcopy_price?: string
  hardcopy_price?: string
  overview?: string
  comments?: string
}

export interface FileDetails {
  soft_copy: File | null
  soft_copy_name: string
}

export interface ConsentData {
  agreement: string
  declaration: string
  revenue_sharing_percentage: string
  agreement_confirmation: boolean
  ownership_declaration: boolean
  user_details_confirmation: boolean
  e_signature: string
  user_email?: string
  user_phone?: string
  user_id?: string
}

export interface SubmissionForm {
  format: 'softcopy' | 'hardcopy'
  step: number
  bookDetails: BookDetails
  fileDetails: FileDetails
  consent: ConsentData
}

export const initialBookDetails: BookDetails = {
  book_title: '',
  author: '',
  isbn: '',
  genre_id: '',
  image_url: null,
  image_url_preview: '',
  softcopy_price: '',
  hardcopy_price: '',
  overview: '',
  comments: '',
}

export const initialFileDetails: FileDetails = {
  soft_copy: null,
  soft_copy_name: '',
}

export const initialConsent: ConsentData = {
  agreement: '',
  declaration: '',
  revenue_sharing_percentage: '70',
  agreement_confirmation: false,
  ownership_declaration: false,
  user_details_confirmation: false,
  e_signature: '',
  user_email: '',
  user_phone: '',
  user_id: '',
}