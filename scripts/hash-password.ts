/**
 * hash-password.ts — Generate a bcrypt hash for use as AUTH_PASSWORD_HASH
 *
 * Usage:
 *   npx tsx scripts/hash-password.ts <password>
 *
 * The output hash can be set as the AUTH_PASSWORD_HASH environment variable.
 */

import bcrypt from 'bcryptjs'

const COST_FACTOR = 12

const password = process.argv[2]

if (!password) {
  console.error('Usage: npx tsx scripts/hash-password.ts <password>')
  process.exit(1)
}

const hash = bcrypt.hashSync(password, COST_FACTOR)
console.log(hash)
