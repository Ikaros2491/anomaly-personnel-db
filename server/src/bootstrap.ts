import { execSync } from 'node:child_process'
import { seedDatabase } from './seed.js'
import { startServer } from './index.js'

async function bootstrap() {
  console.log('Applying database schema...')
  execSync('npx prisma db push', { stdio: 'inherit' })

  await seedDatabase()

  startServer()
}

bootstrap().catch((error) => {
  console.error(error)
  process.exit(1)
})
