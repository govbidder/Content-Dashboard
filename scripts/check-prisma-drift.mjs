#!/usr/bin/env node
/**
 * Fails if the database state diverges from prisma/migrations:
 *   - migrations applied to DB but missing locally (someone forgot to commit)
 *   - schema in DB drifted from what migrations would produce
 *
 * Pending (committed-but-not-deployed) migrations are NOT a failure — those
 * are normal pre-deploy state.
 *
 * Requires DATABASE_URL + DIRECT_URL in env. Use as a CI step.
 */
import { execFileSync } from 'node:child_process'

if (!process.env.DATABASE_URL) {
  console.warn(
    '::warning::DATABASE_URL not set — skipping Prisma drift check. ' +
      'Configure DATABASE_URL + DIRECT_URL as repo secrets to enable.',
  )
  process.exit(0)
}

let output = ''
try {
  output = execFileSync(
    'npx',
    ['--yes', 'prisma', 'migrate', 'status', '--schema=prisma/schema.prisma'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  )
} catch (err) {
  output = (err.stdout || '') + (err.stderr || '')
}

const FAIL_PATTERNS = [
  /are applied to the database but missing from the local migrations directory/i,
  /Drift detected/i,
  /database schema is not in sync with your migration history/i,
]

const hit = FAIL_PATTERNS.find((p) => p.test(output))
if (hit) {
  console.error('::error::Prisma drift detected.')
  console.error('Pattern matched:', hit.source)
  console.error('\nFull output:')
  console.error(output)
  console.error(
    '\nFix: copy the missing migrations from where they were applied, ' +
      'or run `npx prisma migrate dev` locally and commit the result.',
  )
  process.exit(1)
}

console.log('✓ No Prisma drift between schema and database.')
