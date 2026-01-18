import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './db/connection';
import articlesRouter from './routes/articles';
import plansRouter from './routes/plans';
import adminRouter from './routes/admin';
import authRouter from './routes/auth';
import alarmRouter from './routes/alarm';
import bettingRouter from './routes/betting';
import blogRouter from './routes/blog';
import { initTelegramBot, getBot } from './services/telegramBot';
import { alarmController } from './controllers/alarmController';
import { runInitialSetup, checkAndRunDailyRaceJob } from './jobs/dailyRaceJob';
import { checkAndRunDailyTaskReset } from './jobs/dailyTaskResetJob';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// CORS configuration - allow frontend URLs
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in production - adjust if needed
    }
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/articles', articlesRouter);
app.use('/api/plans', plansRouter);
app.use('/api/admin', adminRouter);
app.use('/api/auth', authRouter);
app.use('/api/alarm', alarmRouter);
app.use('/api/betting', bettingRouter);
app.use('/api/blog', blogRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Alarm scheduler - runs every minute
const runAlarmScheduler = async () => {
  try {
    const bot = getBot();
    if (!bot) return;

    const users = await alarmController.getUsersForAlarm();
    
    for (const user of users) {
      const tasks = await alarmController.getIncompleteTasks(user.user_id);
      
      if (tasks.length > 0) {
        let message = `⏰ *오늘의 미완료 태스크 알림*\n\n`;
        message += `${user.username}님, 아직 완료하지 않은 태스크가 있어요!\n\n`;
        
        tasks.forEach((task, index) => {
          const emoji = task.frequency === 'daily' ? '🟢' : task.frequency === 'weekly' ? '🔵' : '🟣';
          message += `${index + 1}. ${emoji} ${task.title}\n`;
          message += `   📁 ${task.project_name}\n`;
        });
        
        message += `\n총 ${tasks.length}개의 태스크가 남아있습니다.`;
        
        try {
          await bot.sendMessage(user.telegram_id, message, { parse_mode: 'Markdown' });
          console.log(`Alarm sent to user ${user.username} (telegram: ${user.telegram_id})`);
        } catch (err: any) {
          console.error(`Failed to send alarm to ${user.username}:`, err.message);
        }
      }
    }
  } catch (error) {
    console.error('Alarm scheduler error:', error);
  }
};

const startServer = async () => {
  try {
    await initializeDatabase();

    // Initialize Telegram bot if token is provided
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    if (telegramToken) {
      await initTelegramBot(telegramToken);
      
      // Start alarm scheduler (runs every minute)
      setInterval(runAlarmScheduler, 60 * 1000);
      console.log('Alarm scheduler started');
    } else {
      console.log('Telegram bot token not provided, skipping bot initialization');
    }

    // Start daily race job scheduler (UTC 00:00)
    runInitialSetup(); // Run setup at startup
    setInterval(checkAndRunDailyRaceJob, 60 * 1000); // Check every minute for 00:00 UTC
    console.log('Daily race job scheduler started (UTC 00:00)');

    // Start daily task reset scheduler (KST 00:00)
    setInterval(checkAndRunDailyTaskReset, 60 * 1000); // Check every minute for 00:00 KST
    console.log('Daily task reset scheduler started (KST 00:00)');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
