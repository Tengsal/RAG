import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';

async function startServer(): Promise<void> {
  // Connect to MongoDB
  await connectDB();

  const PORT = parseInt(env.PORT, 10);
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 ADTU Auth Server running on port ${PORT}`);
    console.log(`   Health Check: http://localhost:${PORT}/health`);
    console.log(`   Auth Routes:  http://localhost:${PORT}/auth/*`);
    console.log(`=================================================`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start Auth Server:', error);
  process.exit(1);
});
