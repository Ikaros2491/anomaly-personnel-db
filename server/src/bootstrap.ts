import { execSync } from 'node:child_process'
import { seedDatabase } from './seed.js'
import { startServer } from './index.js'

async function bootstrap() {
  console.log('Applying database schema...')
  // --accept-data-loss: safe for intentional column drops (e.g. removed passwordPlaintext).
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' })

  await seedDatabase()

  startServer()
}

bootstrap().catch((error) => {
  console.error(error)
  process.exit(1)
})
