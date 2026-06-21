import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from './db.js'
import { BUILTIN_PERSONNEL, SEED_USERS } from './seedData.js'
import { personnelToRowData } from './personnel.js'

async function clearDatabase() {
  await prisma.pendingPersonnelSubmission.deleteMany()
  await prisma.signupRequest.deleteMany()
  await prisma.personnelRecord.deleteMany()
  await prisma.user.deleteMany()
}

export async function seedDatabase(options: { force?: boolean } = {}) {
  if (options.force) {
    await clearDatabase()
  }

  let usersCreated = 0
  let recordsCreated = 0

  for (const user of SEED_USERS) {
    const existing = await prisma.user.findUnique({ where: { username: user.username } })
    if (existing) continue

    const password =
      'passwordEnv' in user
        ? process.env[user.passwordEnv] ?? user.passwordDefault
        : user.password

    await prisma.user.create({
      data: {
        username: user.username,
        passwordHash: await bcrypt.hash(password, 10),
        displayName: user.displayName,
        clearance: user.clearance,
        badgeId: user.badgeId,
        isAdministrator: user.isAdministrator,
        isSystem: true,
        deactivated: false,
      },
    })
    usersCreated++
  }

  for (const record of BUILTIN_PERSONNEL) {
    const recordUid = `builtin-${record.id}`
    const existing = await prisma.personnelRecord.findUnique({ where: { recordUid } })
    if (existing) continue

    const row = personnelToRowData(
      {
        recordUid,
        id: record.id,
        name: record.name,
        aliases: record.aliases,
        fields: record.fields,
        isUserCreated: false,
      },
      { isBuiltin: true },
    )

    await prisma.personnelRecord.create({ data: row })
    recordsCreated++
  }

  if (usersCreated === 0 && recordsCreated === 0) {
    console.log('Seed data already complete, nothing to add.')
  } else {
    console.log(`Seed complete: ${usersCreated} user(s), ${recordsCreated} record(s) added.`)
  }
}

async function main() {
  await seedDatabase({ force: true })
}

const entryScript = process.argv[1] ?? ''
if (entryScript.endsWith('seed.ts') || entryScript.endsWith('seed.js')) {
  main()
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
