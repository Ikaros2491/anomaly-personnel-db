import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from './db.js'
import { BUILTIN_PERSONNEL, SEED_USERS } from './seedData.js'
import { personnelToRowData } from './personnel.js'

async function main() {
  await prisma.pendingPersonnelSubmission.deleteMany()
  await prisma.signupRequest.deleteMany()
  await prisma.personnelRecord.deleteMany()
  await prisma.user.deleteMany()

  for (const user of SEED_USERS) {
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
  }

  for (const record of BUILTIN_PERSONNEL) {
    const row = personnelToRowData(
      {
        recordUid: `builtin-${record.id}`,
        id: record.id,
        name: record.name,
        aliases: record.aliases,
        fields: record.fields,
        isUserCreated: false,
      },
      { isBuiltin: true },
    )

    await prisma.personnelRecord.create({ data: row })
  }

  console.log('Database seeded successfully.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
