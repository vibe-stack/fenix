function isTopLevelBrowsingContext() {
  if (typeof window === 'undefined') {
    return true
  }

  try {
    return window.top === window.self
  } catch {
    return false
  }
}

export function describeWebGPUPageContext() {
  if (typeof window === 'undefined' || typeof location === 'undefined') {
    return 'The current runtime does not expose a browser window or location.'
  }

  const secureContextLabel = window.isSecureContext ? 'secure-context' : 'insecure-context'
  const browsingContextLabel = isTopLevelBrowsingContext() ? 'top-level-page' : 'embedded-page'

  return `origin=${location.origin}, protocol=${location.protocol}, context=${secureContextLabel}, frame=${browsingContextLabel}`
}

export function createWebGPUUnavailableMessage() {
  const guidance: string[] = []

  if (typeof window !== 'undefined' && !window.isSecureContext) {
    guidance.push('Chrome only exposes WebGPU to secure contexts such as https:// origins or http://localhost.')
  }

  if (!isTopLevelBrowsingContext()) {
    guidance.push('Embedded browser contexts can block WebGPU through Permissions-Policy even when Chrome supports it.')
  }

  const guidanceSuffix = guidance.length > 0 ? ` ${guidance.join(' ')}` : ''

  return `WebGPU is unavailable in this browser context. ${describeWebGPUPageContext()}.${guidanceSuffix}`
}