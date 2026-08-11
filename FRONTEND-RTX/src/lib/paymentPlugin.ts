import type { PaymentProcessor, PaymentPayload, PaymentResult, VerificationResult, CaptureResult, PaymentStatus } from './paymentTypes'

export type PluginPaymentMethod = 'mpesa' | 'paypal' | 'stripe' | 'flutterwave' | 'custom'

export interface PaymentPlugin {
  name: string
  method: PluginPaymentMethod
  currency: string
  initiate(payload: PaymentPayload): Promise<PaymentResult>
  verify(verificationUrl: string, checkoutRequestId?: string): Promise<VerificationResult>
  captureOrder(token: string, payerId: string): Promise<CaptureResult>
  mapStatus(status: string): PaymentStatus
  getStatusMessage(status: PaymentStatus): string
}

const registeredPlugins: Map<PluginPaymentMethod, PaymentPlugin> = new Map()

export function registerPaymentPlugin(plugin: PaymentPlugin): void {
  if (registeredPlugins.has(plugin.method)) {
    console.warn(`[PaymentPlugin] Overwriting existing plugin: ${plugin.method}`)
  }
  registeredPlugins.set(plugin.method, plugin)
  console.log(`[PaymentPlugin] Registered: ${plugin.name} (${plugin.method})`)
}

export function unregisterPaymentPlugin(method: PluginPaymentMethod): boolean {
  return registeredPlugins.delete(method)
}

export function getPaymentPlugin(method: PluginPaymentMethod): PaymentPlugin | undefined {
  return registeredPlugins.get(method)
}

export function getAvailablePlugins(): PaymentPlugin[] {
  return Array.from(registeredPlugins.values())
}

export function hasPlugin(method: PluginPaymentMethod): boolean {
  return registeredPlugins.has(method)
}

export function createPaymentPluginAdapter(plugin: PaymentPlugin) {
  return {
    async initiate(payload: PaymentPayload): Promise<PaymentResult> {
      return await plugin.initiate(payload)
    },

    async verify(verificationUrl: string, checkoutRequestId?: string): Promise<VerificationResult> {
      return await plugin.verify(verificationUrl, checkoutRequestId)
    },

    async captureOrder(token: string, payerId: string): Promise<CaptureResult> {
      return await plugin.captureOrder(token, payerId)
    },

    mapStatus(status: string): PaymentStatus {
      return plugin.mapStatus(status)
    },

    getStatusMessage(status: PaymentStatus): string {
      return plugin.getStatusMessage(status)
    },
  }
}

export interface PaymentModuleConfig {
  module: string
  plugins: PluginPaymentMethod[]
  defaultPlugin?: PluginPaymentMethod
  amount?: number
  metadata?: Record<string, any>
}

const moduleConfigs: Map<string, PaymentModuleConfig> = new Map()

export function registerModule(config: PaymentModuleConfig): void {
  const { module, plugins, defaultPlugin } = config
  
  if (!module) {
    console.error('[PaymentModule] Module name is required')
    return
  }

  if (!plugins?.length) {
    console.error('[PaymentModule] At least one plugin is required')
    return
  }

  const validPlugins = plugins.filter(p => hasPlugin(p))
  if (validPlugins.length === 0) {
    console.error('[PaymentModule] No valid plugins registered')
    return
  }

  const defaultMethod = defaultPlugin || validPlugins[0]
  
  moduleConfigs.set(module, {
    module,
    plugins: validPlugins,
    defaultPlugin: hasPlugin(defaultMethod) ? defaultMethod : validPlugins[0],
  })

  console.log(`[PaymentModule] Registered module: ${module} with plugins: ${validPlugins.join(', ')}`)
}

export function getModuleConfig(module: string): PaymentModuleConfig | undefined {
  return moduleConfigs.get(module)
}

export function isModuleSupported(module: string): boolean {
  return moduleConfigs.has(module)
}

export function getSupportedModules(): string[] {
  return Array.from(moduleConfigs.keys())
}

export const paymentPluginSystem = {
  register: registerPaymentPlugin,
  unregister: unregisterPaymentPlugin,
  get: getPaymentPlugin,
  getAll: getAvailablePlugins,
  has: hasPlugin,
  createAdapter: createPaymentPluginAdapter,

  registerModule,
  getModuleConfig,
  isSupported: isModuleSupported,
  getSupportedModules,
}

export default paymentPluginSystem