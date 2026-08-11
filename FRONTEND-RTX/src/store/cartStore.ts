import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { IndexedDBStorage } from '@/lib/indexedDB'

export type BookFormat = 'digital' | 'physical'

export interface CartItem {
  book_id: number
  title: string
  cover_image?: string
  author?: string
  price: number
  format: BookFormat
  quantity: number
}

interface CartState {
  items: CartItem[]
  customer: {
    phone: string
    email: string
    paymentMethod: 'mpesa' | 'paypal'
  }
  
  // Getters
  cartItems: CartItem[]
  totalItems: number
  totalPrice: number
  hasDigitalItems: boolean
  hasPhysicalItems: boolean
  
  // Actions
  addBookToCart: (book: Omit<CartItem, 'quantity'>) => boolean
  removeItem: (bookId: number, format: BookFormat) => void
  updateQuantity: (bookId: number, format: BookFormat, quantity: number) => void
  clearCart: () => void
  setCustomer: (customer: Partial<CartState['customer']>) => void
}

const calculatePrice = (book: Omit<CartItem, 'quantity'>, format: BookFormat): number => {
  if (format === 'digital') {
    return book.price
  }
  return book.price
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customer: {
        phone: '',
        email: '',
        paymentMethod: 'mpesa'
      },

      // Getters
      get cartItems() {
        return [...get().items]
      },
      
      get totalItems() {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },
      
      get totalPrice() {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0)
      },
      
      get hasDigitalItems() {
        return get().items.some(item => item.format === 'digital')
      },
      
      get hasPhysicalItems() {
        return get().items.some(item => item.format === 'physical')
      },

      // Actions
      addBookToCart: (book) => {
        const { items } = get()
        
        // Check if same book with same format already exists
        const existingItem = items.find(
          item => item.book_id === book.book_id && item.format === book.format
        )

        // If same format already in cart, don't add again
        if (existingItem) {
          return false
        }

        // Add the item to cart
        set({ 
          items: [...items, { ...book, quantity: 1 }]
        })
        return true
      },

      removeItem: (bookId, format) => {
        set({ 
          items: get().items.filter(
            item => !(item.book_id === bookId && item.format === format)
          )
        })
      },

      updateQuantity: (bookId, format, newQuantity) => {
        const item = get().items.find(
          item => item.book_id === bookId && item.format === format
        )
        
        if (item && format === 'digital' && newQuantity !== 1) {
          return
        }
        
        set({
          items: get().items.map(item =>
            item.book_id === bookId && item.format === format
              ? { ...item, quantity: Math.max(1, newQuantity) }
              : item
          )
        })
      },

      clearCart: () => {
        set({ items: [] })
      },

      setCustomer: (customer) => {
        set({ 
          customer: { ...get().customer, ...customer }
        })
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => IndexedDBStorage),
      partialize: (state) => ({
        items: state.items,
        customer: state.customer,
      }),
    }
  )
)

// Helper hook for reactive getters
export const useCart = () => {
  const store = useCartStore()
  
  return {
    items: store.items,
    customer: store.customer,
    cartItems: store.items,
    totalItems: store.items.reduce((total, item) => total + item.quantity, 0),
    totalPrice: store.items.reduce((total, item) => total + (item.price * item.quantity), 0),
    hasDigitalItems: store.items.some(item => item.format === 'digital'),
    hasPhysicalItems: store.items.some(item => item.format === 'physical'),
    addBookToCart: store.addBookToCart,
    removeItem: store.removeItem,
    updateQuantity: store.updateQuantity,
    clearCart: store.clearCart,
    setCustomer: store.setCustomer,
    isEmpty: store.items.length === 0,
  }
}