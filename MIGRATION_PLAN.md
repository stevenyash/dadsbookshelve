# Quasar to React Migration Plan

## Overview

Migration from Quasar/Vue to React + Tailwind CSS + Vite while preserving business logic and data flows.

---

## Current Stack

| Layer | Current | Target |
|-------|---------|--------|
| UI Framework | Quasar (Vue 3) | React 18+ |
| Styling | Quasar utilities | Tailwind CSS 4 + daisyUI |
| Build | Quasar CLI | Vite |
| State | Pinia | Zustand or React Context |
| Routing | Vue Router | React Router v7 |
| HTTP | Axios | Axios or Fetch |

---

## Directory Structure Mapping

```
FRONTEND/src/
├── components/           →  src/components/
│   ├── common/          →  src/components/ui/       (Button, Input, Select, Modal)
│   ├── custom/         →  src/components/         (BookCard, Navbar, etc.)
│   └── payment/       →  src/components/payment/
├── pages/              →  src/pages/
│   ├── marketers/      →  src/pages/marketers/
│   ├── users/         →  src/pages/users/
│   ├── books/         →  src/pages/books/
│   └── ...            →  src/pages/{entity}/
├── composables/         →  src/hooks/
│   ├── app.js         →  useApp()
│   ├── auth.js       →  useAuth()
│   ├── listpage.js  →  useListPage()
│   ├── addpage.js   →  useAddPage()
│   ├── editpage.js →  useEditPage()
│   └── viewpage.js →  useViewPage()
├── stores/             →  src/stores/  or  src/context/
│   └── *.js         →  useStore() hooks
├── services/           →  src/services/
│   ├── api.js       →  src/services/api.js
│   └── validators.js →  src/lib/validators
├── router/            →  src/App.jsx (routes)
├── menus.js           →  src/config/menus.js
├── i18n/             →  src/i18n/
└── layouts/          →  src/layouts/

NEW STRUCTURE:
src/
├── components/
│   ├── ui/           (Button, Input, Select, Table, Modal, Card - shadcn-like)
│   ├── layout/        (Navbar, Sidebar, Footer)
│   ├── book/          (BookCard, BookGrid, EpubReader)
│   └── payment/       (PaypalPayment, MpesaPayment)
├── pages/
│   ├── admin/        (user list/add/edit, settings)
│   ├── marketers/    (list/add/edit, wallet)
│   ├── library/      (browse, view)
│   └── shop/         (cart, checkout)
├── hooks/
│   ├── useAuth.js
│   ├── useApi.js
│   └── usePermissions.js
├── stores/
│   ├── authStore.js
│   └── pageStore.js
├── services/
│   ├── api.js
│   └── validators.js
├── config/
│   ├── menus.js
│   └── permissions.js
├── lib/
│   ├── validators.js
│   └── utils.js
├── App.jsx
├── main.jsx
└── index.css (@tailwind base)
```

---

## Component Mapping

### Quasar → React equivalents

| Quasar | React + Tailwind |
|-------|-----------------|
| `<q-btn>` | `<Button>` |
| `<q-input>` | `<Input>` or `<TextField>` |
| `<q-select>` | `<Select>` or `<Combobox>` |
| `<q-table>` | `<DataTable>` (TanStack Table) |
| `<q-card>` | `<Card>` |
| `<q-dialog>` | `<Modal>` |
| `<q-menu>` | `<DropdownMenu>` |
| `<q-tabs>` | `<Tabs>` |
| `<q-breadcrumbs>` | Breadcrumb component |
| `<q-pagination>` |Pagination component |
| `<q-checkbox>` | `<Checkbox>` |
| `<q-toggle>` | `<Switch>` |
| `<q-date>` | DatePicker |
| `QFab` | FloatingActionButton |
| `useQuasar()` | Use React Context |

### Layout Mapping

```jsx
// Quasar Layout
<q-layout view="lHh Lpr lff">
  <q-header elevated>
    <q-toolbar>...</q-toolbar>
  </q-header>
  <q-drawer>...</q-drawer>
  <q-page-container>
    <router-view />
  </q-page-container>
</q-layout>

// React Equivalent
<Layout>
  <Navbar />
  <Sidebar />
  <main>{children}</main>
</Layout>
```

---

## Page Pattern Migration

### Quasar Composables → React Hooks

| Vue Composable | React Hook |
|---------------|-----------|
| `useListPage()` | `useMarketers()` + TanStack Query |
| `useAddPage()` | `useCreateMarketer()` mutation |
| `useEditPage()` | `useMarketer(id)` + `useUpdateMarketer()` |
| `useViewPage()` | `useMarketer(id)` (read-only) |
| `useApp()` | Context or custom hooks |
| `useAuth()` | `useAuthStore()` (Zustand) |

### List Page Pattern

```vue
<!-- Quasar (Vue) -->
<template>
  <q-table :columns="headers" :rows="records" />
</template>
<script setup>
const props = defineProps({...})
const store = usePageStore(key, state)
const page = useListPage({ store, props })
</script>
```

```jsx
// React with TanStack Query
import { useMarketers } from '@/hooks/queries/useMarketers'
import { useDeleteMarketer } from '@/hooks/mutations/useMarketerMutations'

export function MarketersListPage() {
  const { data, isLoading, error } = useMarketers({ page, limit, search })
  const deleteMutation = useDeleteMarketer()
  
  const columns = [
    { key: 'marketer_id', header: 'ID' },
    { key: 'marketer_code', header: 'Code' },
    { key: 'commission_rate', header: 'Commission' },
    { key: 'actions', header: '' },
  ]
  
  const handleDelete = (id) => {
    if (confirm('Delete this record?')) {
      deleteMutation.mutate(id)
    }
  }
  
  return (
    <div class="page-container">
      <div class="flex justify-between mb-4">
        <h1>Marketers</h1>
        <Button as="Link" to="/marketers/add">Add Marketer</Button>
      </div>
      
      <SearchInput 
        value={search} 
        onChange={setSearch} 
        placeholder="Search..."
      />
      
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <Error message={error.message} />
      ) : (
        <DataTable 
          columns={columns} 
          data={data?.records || []}
          pagination={pagination}
          onPageChange={setPage}
        >
          <DataTable.Row>
            <DataTable.Cell>{row.marketer_id}</DataTable.Cell>
            <DataTable.Cell>{row.marketer_code}</DataTable.Cell>
            <DataTable.Cell>{row.commission_rate}%</DataTable.Cell>
            <DataTable.Cell>
              <DropdownMenu>
                <DropdownMenu.Item as="Link" to={`/marketers/view/${row.marketer_id}`}>
                  View
                </DropdownMenu.Item>
                <DropdownMenu.Item as="Link" to={`/marketers/edit/${row.marketer_id}`}>
                  Edit
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => handleDelete(row.marketer_id)}>
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu>
            </DataTable.Cell>
          </DataTable.Row>
        </DataTable>
      )}
    </div>
  )
}
```

### Add Page Pattern

```vue
<!-- Quasar -->
<template>
  <q-form ref="form" @submit.prevent="submit">
    <q-input v-model="formData.name" />
  </q-form>
</template>
```

```jsx
// React with React Hook Form + Zod
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const marketerSchema = z.object({
  marketer_code: z.string().min(1, 'Required'),
  commission_rate: z.coerce.number().min(0).max(100),
  tier: z.string().optional(),
})

export function MarketerAddPage() {
  const navigate = useNavigate()
  const createMutation = useCreateMarketer()
  
  const form = useForm({
    resolver: zodResolver(marketerSchema),
    defaultValues: {
      marketer_code: '',
      commission_rate: 10,
      tier: '',
    }
  })
  
  const onSubmit = form.handleSubmit(async (data) => {
    await createMutation.mutateAsync(data)
    navigate('/marketers')
  })
  
  return (
    <Form form={form} onSubmit={onSubmit}>
      <FormField name="marketer_code" label="Code">
        <Input {...form.register('marketer_code')} />
        <FormError>{form.formState.errors.marketer_code?.message}</FormError>
      </FormField>
      
      <FormField name="commission_rate" label="Commission %">
        <Input type="number" {...form.register('commission_rate')} />
        <FormError>{form.formState.errors.commission_rate?.message}</FormError>
      </FormField>
      
      <FormField name="tier" label="Tier">
        <Select {...form.register('tier')} options={tierOptions} />
      </FormField>
      
      <Button type="submit" loading={createMutation.isPending}>
        Create Marketer
      </Button>
    </Form>
  )
}
```

### View Page Pattern

```vue
<!-- Quasar -->
<template>
  <q-page v-if="record">
    <div>{{ record.field }}</div>
  </q-page>
</template>
```

```jsx
// React
import { useMarketer } from '@/hooks/queries/useMarketer'

export function MarketerViewPage({ id }) {
  const { data: record, isLoading } = useMarketer(id)
  
  if (isLoading) return <Spinner />
  if (!record) return <NotFound />
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{record.marketer_code}</CardTitle>
        <CardDescription>{record.tier}</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label>Commission Rate</Label>
            <Value>{record.commission_rate}%</Value>
          </div>
          <div>
            <Label>Total Earnings</Label>
            <Value>{record.total_earnings}</Value>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button as="Link" to={`/marketers/edit/${id}`}>Edit</Button>
      </CardFooter>
    </Card>
  )
}
```

---

## API Integration

Keep the existing API (`@API/`) unchanged. The React app will call the same endpoints.

```javascript
// src/services/api.js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api'
})

// Add interceptors for auth tokens
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
```

---

## Business Logic to Preserve

### 1. Permissions System

- Keep `PermissionConfig` from `@API/helpers/rbac.js`
- Create React hooks: `usePermission(permissionKey)`
- UI components: `<Can permission="marketers.view">`

### 2. Page Patterns

- `useListPage()` - pagination, filtering, selection
- `useAddPage()` - form validation, submission
- `useEditPage()` - load record, save changes
- `useViewPage()` - display single record

### 3. Payment Flows

- PayPal integration
- Mpesa STK Push
- Wallet system for marketers

### 4. eBook Reader

- EPUB parsing and rendering
- DRM/Security features
- Offline reading

### 5. Marketer System

- Referral tracking
- Commission calculation
- Wallet withdrawals

---

## Key Entities to Migrate (Priority Order)

| Priority | Entity | Pages | Business Logic |
|----------|--------|-------|----------------|
| 1 | Users | list, add, edit, view | Auth, roles, permissions |
| 2 | Marketers | list, add, edit, view, wallet | Commission, referrals |
| 3 | Books | list, add, edit, view | Catalog, genres |
| 4 | Authors | list, add, edit, view | Book associations |
| 5 | Payments | list, history | PayPal, Mpesa |
| 6 | Library | browse, read | Membership, access |
| 7 | Shop | cart, checkout | Orders, inventory |
| 8 | Reports | sales, income | Analytics |
| 9 | Settings | app, prices, fees | Configuration |
| 10 | Sliders | management | Homepage content |
| 11 | Stories/Blog | CRUD | Content management |
| 12 | eBook Converter | upload, process | File conversion |
| 13 | Clients | management | Consents, newsletters |
| 14 | Publishers | management | Publishing workflow |

---

## Migration Steps

### Phase 1: Foundation
1. Create React + Vite project with Tailwind
2. Set up project structure
3. Create base UI components (Button, Input, Card, Modal, Table)
4. Set up React Router
5. Create API service layer

### Phase 2: Auth & Core
6. Implement auth context/store
7. Create login page
8. Create layout components (Navbar, Sidebar)
9. Implement permissions system

### Phase 3: Admin Pages
10. Users management (list, add, edit, view)
11. Marketers management
12. Roles & Permissions

### Phase 4: Business Features
13. Books & Authors
14. Library system
15. Shop & Cart
16. Payments

### Phase 5: Advanced
17. eBook reader
18. Marketer wallet
19. Reports
20. Settings

---

## UI Components to Build

### Base UI (shadcn/ui style)

```
src/components/ui/
├── Button.jsx
├── Input.jsx
├── Textarea.jsx
├── Select.jsx
├── Checkbox.jsx
├── Switch.jsx
├── Card.jsx
├── Modal.jsx
├── Dialog.jsx
├── Table.jsx
├── Tabs.jsx
├── DropdownMenu.jsx
├── Pagination.jsx
├── Toast.jsx
├── Spinner.jsx
├── Badge.jsx
└── Avatar.jsx
```

### Layout Components

```
src/components/layout/
├── Layout.jsx
├── Navbar.jsx
├── Sidebar.jsx
├── Footer.jsx
└── PageHeader.jsx
```

---

## State Management: TanStack Query + Zustand (Recommended)

Instead of manual store data fetching, use **TanStack Query (React Query)** for server state + Zustand for client state. This is more idiomatic for React.

```bash
npm install @tanstack/react-query zustand
```

### Why TanStack Query?

| Manual Store Fetching | TanStack Query |
|-----------------|-------------|
| Manual loading/error states | Built-in states |
| No caching | Auto caching & deduping |
| No background refetch | Background refetch |
| Pagination complex | Built-in infinite query |
| No optimistic updates | Optimistic updates |

### Project Structure with TanStack Query

```
src/
├── lib/
│   └── queryClient.js          # TanStack Query client
├── hooks/
│   ├── queries/            # Query hooks (auto-generated pattern)
│   │   ├── useMarketers.js
│   │   ├── useMarketer.js
│   │   ├── useBooks.js
│   │   └── useUsers.js
│   ├── mutations/         # Mutation hooks
│   │   ├── useCreateMarketer.js
│   │   ├── useUpdateMarketer.js
│   │   └── useDeleteMarketer.js
│   └── ui/               # UI hooks
│       ├── useDebounce.js
│       └── usePagination.js
├── stores/
│   └── useUIStore.js     # UI state only (dialogs, toasts, sidebar)
```

### Query Hook Pattern

```javascript
// hooks/queries/useMarketers.js
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

export function useMarketers({ page = 1, limit = 10, search, sortBy, descending = true }) {
  const queryParams = new URLSearchParams({ page, limit, orderby: sortBy, ordertype: descending ? 'desc' : 'asc' })
  if (search) queryParams.append('search', search)
  
  return useQuery({
    queryKey: ['marketers', page, limit, search, sortBy, descending],
    queryFn: () => api.get(`marketers/index?${queryParams}`).then(r => r.data),
    staleTime: 5 * 60 * 1000, // 5 min cache
  })
}

export function useMarketer(id) {
  return useQuery({
    queryKey: ['marketer', id],
    queryFn: () => api.get(`marketers/view/${id}`).then(r => r.data),
    enabled: !!id,
  })
}

// hooks/mutations/useMarketerMutations.js
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/services/api'

export function useCreateMarketer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data) => api.post('marketers/add', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['marketers'])
      toast.success('Marketer created successfully')
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })
}

export function useUpdateMarketer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }) => api.post(`marketers/edit/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['marketer', variables.id])
      queryClient.invalidateQueries(['marketers'])
      toast.success('Updated successfully')
    }
  })
}

export function useDeleteMarketer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id) => api.get(`marketers/delete/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['marketers'])
      toast.success('Deleted successfully')
    }
  })
}
```

### Usage in Pages

```jsx
// pages/marketers/MarketersListPage.jsx
import { useMarketers } from '@/hooks/queries/useMarketers'
import { useDeleteMarketer } from '@/hooks/mutations/useMarketerMutations'

export function MarketersListPage() {
  const { data, isLoading, error } = useMarketers({ page, limit, search })
  const deleteMutation = useDeleteMarketer()
  
  if (isLoading) return <Spinner />
  if (error) return <Error message={error.message} />
  
  return (
    <DataTable columns={columns} data={data?.records || []} />
  )
}
```

### Zustand for UI State Only

```javascript
// stores/useUIStore.js
import { create } from 'zustand'

export const useUIStore = create((set) => ({
  sidebarOpen: true,
  modalOpen: false,
  activeModal: null,
  toasts: [],
  
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  openModal: (modal) => set({ modalOpen: true, activeModal: modal }),
  closeModal: () => set({ modalOpen: false, activeModal: null }),
  addToast: (toast) => set(state => ({ toasts: [...state.toasts, toast] })),
}))
```

### Alternative: If You Prefer Simpler Approach

Keep Zustand for everything (no TanStack Query):

```javascript
// stores/pageStore.js
import { create } from 'zustand'
import api from '@/services/api'

// Factory to create page stores
export const createPageStore = (name, primaryKey) => create((set, get) => ({
  records: [],
  currentRecord: null,
  loading: false,
  error: null,
  pagination: { page: 1, limit: 10, rowsNumber: 0 },
  
  fetchRecords: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const query = new URLSearchParams(params).toString()
      const res = await api.get(`${name}/index?${query}`)
      set({ 
        records: res.data.records || res.data,
        pagination: { ...get().pagination, rowsNumber: res.data.totalRecords || 0 },
        loading: false 
      })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },
  
  fetchById: async (id) => {
    set({ loading: true })
    try {
      const res = await api.get(`${name}/view/${id}`)
      set({ currentRecord: res.data, loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },
  
  create: async (data) => {
    const res = await api.post(`${name}/add`, data)
    set(state => ({ records: [res.data, ...state.records] }))
    return res.data
  },
  
  update: async (id, data) => {
    const res = await api.post(`${name}/edit/${id}`, data)
    set(state => ({
      records: state.records.map(r => r[primaryKey] === id ? res.data : r),
      currentRecord: res.data
    }))
  },
  
  delete: async (id) => {
    await api.get(`${name}/delete/${id}`)
    set(state => ({
      records: state.records.filter(r => r[primaryKey] !== id)
    }))
  },
  
  setPage: (page) => set(state => ({ 
    pagination: { ...state.pagination, page } 
  })),
}))

// Usage: const useMarketersStore = createPageStore('marketers', 'marketer_id')
```

## Recommended Packages

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^7",
    "axios": "^1.7",
    "zustand": "^5",
    "@tanstack/react-query": "^5",
    "clsx": "^2",
    "tailwind-merge": "^2",
    "@tanstack/react-table": "^8",
    "react-hook-form": "^7",
    "@hookform/resolvers": "^3",
    "zod": "^3",
    "sonner": "^1",
    "lucide-react": "^0.400",
    "date-fns": "^3",
    "react-dropzone": "^14"
  },
  "devDependencies": {
    "vite": "^6",
    "@vitejs/plugin-react": "^4",
    "tailwindcss": "^4",
    "@tailwindcss/vite": "^4",
    "daisyui": "^5",
    "eslint": "^9",
    "typescript": "^5"
  }
}
```

## React Query Client Setup

```javascript
// src/lib/queryClient.js
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// src/main.jsx
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
```

---

## File Estimates

| Category | Count | Notes |
|----------|-------|-------|
| Vue Pages | ~40 | CRUD for each entity |
| Vue Components | ~100+ | Including EpubReader |
| Composables | ~20 | Move to hooks |
| Stores | ~10 | Convert to Zustand |
| Services | ~15 | Keep API as-is |

---

## Notes

- Keep `@API/` completely unchanged - it's backend
- All business logic (permissions, commissions, wallet) stays on API
- React app is purely UI consuming the API
- Consider using shadcn/ui approach for component library
- Use TanStack Table for data tables
- Use React Hook Form + Zod for form validation