// ---------------------------------------------------------------------------
// Company configuration — loaded from environment variables so every
// Distill deployment can be branded for its own company.
// ---------------------------------------------------------------------------

export const COMPANY_NAME = process.env.COMPANY_NAME || 'your company'
export const COMPANY_DESCRIPTION = process.env.COMPANY_DESCRIPTION || ''

/**
 * Returns a context string for LLM prompts. If COMPANY_DESCRIPTION is set,
 * returns "CompanyName — description". Otherwise returns just the name.
 */
export function companyContext(): string {
  if (COMPANY_DESCRIPTION) {
    return `${COMPANY_NAME} — ${COMPANY_DESCRIPTION}`
  }
  return COMPANY_NAME
}
