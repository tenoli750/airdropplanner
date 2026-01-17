import TelegramBot from 'node-telegram-bot-api';
import pool from '../db/connection';
import { verifyLinkCode, getUserByTelegramId } from '../controllers/authController';

let bot: TelegramBot | null = null;

// Web3 topic configuration for forwarding messages
const WEB3_TOPIC_CHAT_ID = process.env.WEB3_TOPIC_CHAT_ID ? parseInt(process.env.WEB3_TOPIC_CHAT_ID) : null;
const WEB3_TOPIC_THREAD_ID = process.env.WEB3_TOPIC_THREAD_ID ? parseInt(process.env.WEB3_TOPIC_THREAD_ID) : null;

interface Article {
  id: string;
  title: string;
  project_name: string;
}

interface UserState {
  action: 'new_article' | 'new_task' | 'link_account';
  step: string;
  data: Record<string, string>;
  messageIds?: number[]; // Track messages to delete after completion (optional, only for groups)
}

const userStates = new Map<number, UserState>();
const processedMessages = new Set<number>();

// Helper to delete multiple messages
const deleteMessages = (bot: TelegramBot, chatId: number, messageIds: number[]) => {
  messageIds.forEach((messageId) => {
    bot.deleteMessage(chatId, messageId).catch((err) => {
      // Ignore errors (message may already be deleted or bot lacks permission)
      console.log('Could not delete message:', err.message);
    });
  });
};

// Helper to track message for later deletion
const trackMessage = (chatId: number, messageId: number) => {
  const state = userStates.get(chatId);
  if (state) {
    state.messageIds = state.messageIds || [];
    state.messageIds.push(messageId);
  }
};

// Helper to delete success message only (immediate deletion after task is done)
const deleteSuccessMessage = (bot: TelegramBot, chatId: number, messageId: number, delay: number = 3000) => {
  setTimeout(() => {
    bot.deleteMessage(chatId, messageId).catch((err) => {
      console.log('Could not delete success message:', err.message);
    });
  }, delay);
};

export const initTelegramBot = (token: string): TelegramBot => {
  // Prevent multiple bot instances
  if (bot) {
    console.log('Bot already initialized, stopping previous instance');
    bot.stopPolling();
  }
  bot = new TelegramBot(token, {
    polling: {
      interval: 300,
      autoStart: true,
      params: {
        timeout: 10,
      },
    },
  });

  bot.on('polling_error', (error) => {
    console.error('Telegram polling error:', error.message);
  });

  // Helper to prevent duplicate message processing
  const isProcessed = (messageId: number): boolean => {
    if (processedMessages.has(messageId)) {
      return true;
    }
    processedMessages.add(messageId);
    // Clean up old messages (keep last 1000)
    if (processedMessages.size > 1000) {
      const arr = Array.from(processedMessages);
      arr.slice(0, 500).forEach(id => processedMessages.delete(id));
    }
    return false;
  };

  // Helper function to check if user is authenticated
  const checkAuth = async (chatId: number, telegramId: number): Promise<boolean> => {
    const user = await getUserByTelegramId(telegramId);
    if (!user) {
      bot?.sendMessage(
        chatId,
        `🔒 *인증이 필요합니다*\n\n` +
        `이 봇을 사용하려면 먼저 웹사이트에서 회원가입 후 텔레그램 계정을 연동해야 합니다.\n\n` +
        `1. 웹사이트에서 회원가입/로그인\n` +
        `2. 프로필에서 "텔레그램 연동" 클릭\n` +
        `3. *봇에게 1:1 메시지*로 /link 명령어 입력\n\n` +
        `예: /link 123456\n\n` +
        `⚠️ 보안을 위해 연동은 그룹이 아닌 봇과의 개인 대화에서만 가능합니다.`,
        { parse_mode: 'Markdown' }
      );
      return false;
    }
    return true;
  };

  // Helper: Show main menu
  const showMainMenu = (chatId: number, username: string) => {
    bot?.sendMessage(
      chatId,
      `🚀 *에어드랍 플래너*\n\n안녕하세요, *${username}*님!`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📋 내 플랜', callback_data: 'menu:plan' },
              { text: '📁 태스크 보기', callback_data: 'menu:tasks' }
            ],
            [
              { text: '➕ 아티클 추가', callback_data: 'menu:newarticle' },
              { text: '➕ 태스크 추가', callback_data: 'menu:newtask' }
            ]
          ]
        }
      }
    );
  };

  // /start - 시작 메시지
  bot.onText(/\/start/, async (msg) => {
    if (isProcessed(msg.message_id)) return;

    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;
    const isPrivate = msg.chat.type === 'private';

    if (!telegramId) return;

    const user = await getUserByTelegramId(telegramId);

    if (user && isPrivate) {
      // DM: Show interactive menu
      showMainMenu(chatId, user.username);
    } else if (user) {
      // Group: Show text commands
      bot?.sendMessage(
        chatId,
        `🚀 *에어드랍 플래너 봇*\n\n` +
        `*${user.username}*님, 그룹에서 사용 가능한 명령어:\n\n` +
        `/t - 태스크 추가 (메시지에 답장)\n` +
        `/list - 아티클 목록\n\n` +
        `📋 플랜 관리는 봇 DM에서 이용하세요.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      bot?.sendMessage(
        chatId,
        `🚀 *에어드랍 플래너 봇*에 오신 것을 환영합니다!\n\n` +
        `🔒 *계정 연동이 필요합니다*\n\n` +
        `이 봇을 사용하려면 웹사이트에서 회원가입 후 텔레그램을 연동해야 합니다.\n\n` +
        `*연동 방법:*\n` +
        `1. 웹사이트에서 회원가입/로그인\n` +
        `2. 프로필 페이지에서 "텔레그램 연동" 클릭\n` +
        `3. *봇에게 1:1 메시지*로 코드 입력:\n` +
        `   /link 123456\n\n` +
        `⚠️ 보안을 위해 연동은 봇과의 개인 대화에서만 가능합니다.`,
        { parse_mode: 'Markdown' }
      );
    }
  });

  // /link - 텔레그램 계정 연동 (DM only)
  bot.onText(/\/link(?:\s+(\d{6}))?/, async (msg, match) => {
    if (isProcessed(msg.message_id)) return;

    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;
    const telegramUsername = msg.from?.username;
    const code = match?.[1];

    if (!telegramId) return;

    // Only allow in direct messages
    if (msg.chat.type !== 'private') {
      bot?.sendMessage(
        chatId,
        `🔒 보안을 위해 /link 명령어는 봇과의 *1:1 대화*에서만 사용할 수 있습니다.\n\n` +
        `봇에게 직접 메시지를 보내주세요.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Check if already linked
    const existingUser = await getUserByTelegramId(telegramId);
    if (existingUser) {
      bot?.sendMessage(
        chatId,
        `✅ 이미 *${existingUser.username}* 계정에 연동되어 있습니다.\n\n` +
        `다른 계정으로 연동하려면 먼저 웹사이트에서 연동을 해제하세요.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    if (!code) {
      userStates.set(chatId, {
        action: 'link_account',
        step: 'code',
        data: {},
      });
      bot?.sendMessage(
        chatId,
        `🔗 *텔레그램 연동*\n\n` +
        `웹사이트에서 발급받은 6자리 코드를 입력하세요:`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Verify the code
    const result = await verifyLinkCode(code, telegramId, telegramUsername);

    if (result.success) {
      bot?.sendMessage(
        chatId,
        `✅ *연동 완료!*\n\n` +
        `*${result.username}* 계정에 텔레그램이 연동되었습니다.\n\n` +
        `이제 /n, /t 명령어로 아티클과 태스크를 추가할 수 있습니다.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      bot?.sendMessage(chatId, `❌ ${result.error}`);
    }
  });

  // /help - 도움말
  bot.onText(/\/help/, async (msg) => {
    if (isProcessed(msg.message_id)) return;

    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;

    if (!telegramId) return;

    const user = await getUserByTelegramId(telegramId);

    if (user) {
      bot?.sendMessage(
        chatId,
        `📖 *도움말*\n\n` +
        `*${user.username}*님, 사용 가능한 명령어:\n\n` +
        `/n - 새 아티클(프로젝트) 추가\n` +
        `/t - 새 태스크 추가\n` +
        `   (메시지에 답장하면 해당 내용이 설명으로 자동 입력)\n` +
        `/web3 - Web3 토픽에만 전달 (DB 저장 없음)\n` +
        `   (메시지에 답장으로 사용)\n` +
        `/list - 전체 아티클 목록\n` +
        `/plan - 내 플랜 보기 (DM 전용)\n` +
        `/cancel - 현재 작업 취소\n\n` +
        `웹사이트에서 상세 편집이 가능합니다.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      bot?.sendMessage(
        chatId,
        `📖 *도움말*\n\n` +
        `🔒 먼저 계정을 연동해야 합니다.\n\n` +
        `/link <코드> - 웹사이트 계정과 연동\n\n` +
        `웹사이트에서 회원가입 후 프로필 페이지에서 연동 코드를 발급받으세요.\n\n` +
        `⚠️ /link 명령어는 봇과의 1:1 대화에서만 사용 가능합니다.`,
        { parse_mode: 'Markdown' }
      );
    }
  });

  // /cancel - 작업 취소
  bot.onText(/\/cancel/, (msg) => {
    if (isProcessed(msg.message_id)) return;

    const chatId = msg.chat.id;
    if (userStates.has(chatId)) {
      userStates.delete(chatId);
      bot?.sendMessage(chatId, '❌ 작업이 취소되었습니다.');
    } else {
      bot?.sendMessage(chatId, '진행 중인 작업이 없습니다.');
    }
  });

  // /list - 아티클 목록
  bot.onText(/\/list/, async (msg) => {
    if (isProcessed(msg.message_id)) return;

    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;

    if (!telegramId || !(await checkAuth(chatId, telegramId))) return;

    try {
      const result = await pool.query(
        'SELECT id, title, project_name FROM articles ORDER BY created_at DESC'
      );

      if (result.rows.length === 0) {
        bot?.sendMessage(chatId, '📭 아티클이 없습니다.\n\n/n 명령어로 새 아티클을 추가하세요.');
        return;
      }

      let message = '📋 *아티클 목록*\n\n';
      result.rows.forEach((article: Article, index: number) => {
        message += `${index + 1}. *${article.project_name}*\n`;
        message += `   ${article.title}\n\n`;
      });

      bot?.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error fetching articles:', error);
      bot?.sendMessage(chatId, '❌ 오류가 발생했습니다. 다시 시도해주세요.');
    }
  });

  // /plan - 내 플랜 보기 (DM only)
  bot.onText(/\/plan/, async (msg) => {
    if (isProcessed(msg.message_id)) return;

    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;

    if (!telegramId || !(await checkAuth(chatId, telegramId))) return;

    // Only allow in DM
    if (msg.chat.type !== 'private') {
      bot?.sendMessage(chatId, '📋 플랜 확인은 봇과의 1:1 대화에서 /plan 명령어를 사용하세요.');
      return;
    }

    const user = await getUserByTelegramId(telegramId);
    if (!user) return;

    try {
      const result = await pool.query(
        `SELECT t.id, t.title, t.frequency, t.link_url, a.project_name, up.completed
         FROM user_plans up
         JOIN tasks t ON up.task_id = t.id
         JOIN articles a ON t.article_id = a.id
         WHERE up.user_id = $1
         ORDER BY up.completed ASC, a.project_name ASC`,
        [user.userId]
      );

      if (result.rows.length === 0) {
        bot?.sendMessage(
          chatId,
          '📭 *내 플랜이 비어있습니다*\n\n' +
          '그룹에서 메시지에 /t로 답장하여 태스크를 추가하거나,\n' +
          '웹사이트에서 태스크를 추가해보세요.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const frequencyEmoji: Record<string, string> = {
        daily: '🟢',
        weekly: '🔵',
        'one-time': '🟣',
      };

      let message = '📋 *내 플랜*\n\n';
      let currentProject = '';

      result.rows.forEach((task: any) => {
        if (task.project_name !== currentProject) {
          currentProject = task.project_name;
          message += `\n📁 *${currentProject}*\n`;
        }
        const emoji = frequencyEmoji[task.frequency] || '⚪';
        const check = task.completed ? '✅' : '⬜';
        message += `${check} ${emoji} ${task.title}\n`;
      });

      const completed = result.rows.filter((t: any) => t.completed).length;
      message += `\n───────────\n`;
      message += `완료: ${completed}/${result.rows.length}`;

      bot?.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error fetching plan:', error);
      bot?.sendMessage(chatId, '❌ 오류가 발생했습니다. 다시 시도해주세요.');
    }
  });

  // /n - 새 아티클 추가 (interactive)
  bot.onText(/\/n$/, async (msg) => {
    if (isProcessed(msg.message_id)) return;

    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;
    const isGroup = msg.chat.type !== 'private';

    if (!telegramId || !(await checkAuth(chatId, telegramId))) return;

    const messageIds: number[] = isGroup ? [msg.message_id] : []; // Track /n command message
    
    userStates.set(chatId, {
      action: 'new_article',
      step: 'project_name',
      data: {},
      messageIds,
    });
    
    const sentMessage = await bot?.sendMessage(chatId, '📝 *새 아티클 추가*\n\n프로젝트 이름을 입력하세요:', { parse_mode: 'Markdown' });
    if (sentMessage && isGroup) {
      trackMessage(chatId, sentMessage.message_id);
    }
  });

  // /web3 - Forward message to web3 topic only (no database save)
  bot.onText(/\/web3$/, async (msg) => {
    if (isProcessed(msg.message_id)) return;

    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;
    const replyToMessage = msg.reply_to_message;
    const isGroup = msg.chat.type !== 'private';

    if (!telegramId || !(await checkAuth(chatId, telegramId))) return;

    // Must be a reply to a message
    if (!replyToMessage) {
      const sentMessage = await bot?.sendMessage(chatId, '❌ 메시지에 답장으로 /web3를 사용해주세요.');
      if (sentMessage && isGroup) {
        deleteSuccessMessage(bot!, chatId, sentMessage.message_id, 3000);
      }
      return;
    }

    // Check if web3 topic is configured
    if (!WEB3_TOPIC_CHAT_ID || !WEB3_TOPIC_THREAD_ID) {
      const sentMessage = await bot?.sendMessage(chatId, '❌ Web3 토픽이 설정되지 않았습니다.');
      if (sentMessage && isGroup) {
        deleteSuccessMessage(bot!, chatId, sentMessage.message_id, 3000);
      }
      return;
    }

    try {
      // Copy the original message to web3 topic
      await (bot as any)?.copyMessage(
        WEB3_TOPIC_CHAT_ID,
        chatId,
        replyToMessage.message_id,
        { message_thread_id: WEB3_TOPIC_THREAD_ID }
      );

      const sentMessage = await bot?.sendMessage(chatId, '✅ Web3 토픽에 전달되었습니다.', { parse_mode: 'Markdown' });

      // Delete command and success message in groups
      if (isGroup) {
        bot?.deleteMessage(chatId, msg.message_id).catch(() => {});
        if (sentMessage) {
          deleteSuccessMessage(bot!, chatId, sentMessage.message_id, 3000);
        }
      }
    } catch (error: any) {
      console.error('Error forwarding to web3 topic:', error.message || error);
      const sentMessage = await bot?.sendMessage(chatId, '❌ 전달 중 오류가 발생했습니다.');
      if (sentMessage && isGroup) {
        deleteSuccessMessage(bot!, chatId, sentMessage.message_id, 3000);
      }
    }
  });

  // /t - 새 태스크 추가 (interactive)
  bot.onText(/\/t$/, async (msg) => {
    if (isProcessed(msg.message_id)) return;

    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;
    const replyToMessage = msg.reply_to_message;
    const isPrivate = msg.chat.type === 'private';
    const isGroup = !isPrivate;

    if (!telegramId || !(await checkAuth(chatId, telegramId))) return;

    // 텍스트, 캡션 추출
    const repliedText = replyToMessage?.text || replyToMessage?.caption || '';

    try {
      const result = await pool.query(
        'SELECT id, title, project_name FROM articles ORDER BY created_at DESC'
      );

      if (result.rows.length === 0) {
        bot?.sendMessage(chatId, '📭 먼저 아티클을 추가해주세요.\n\n/n 명령어로 새 아티클을 추가하세요.');
        return;
      }

      // Store state with reply info for forwarding later
      const stateData: Record<string, string> = {};
      if (repliedText) {
        stateData.description = repliedText;
      }
      // Store original message info for forwarding (only in group with reply)
      if (isGroup && replyToMessage) {
        stateData.forward_chat_id = chatId.toString();
        stateData.forward_message_id = replyToMessage.message_id.toString();
        console.log('Storing forward info:', { forward_chat_id: stateData.forward_chat_id, forward_message_id: stateData.forward_message_id });
      }

      // Track messages for deletion after task is created (only in groups)
      const messageIds: number[] = isGroup ? [msg.message_id] : [];

      userStates.set(chatId, {
        action: 'new_task',
        step: 'select_article',
        data: stateData,
        messageIds,
      });
      console.log('State set with data:', stateData);

      const keyboard = result.rows.map((article: Article) => [{
        text: `${article.project_name}`,
        callback_data: `article:${article.id}`,
      }]);

      let promptMessage = '📝 *새 태스크 추가*\n\n';
      if (repliedText) {
        const previewText = repliedText.length > 50 ? repliedText.substring(0, 50) + '...' : repliedText;
        promptMessage += `📋 설명: "${previewText}"\n\n`;
      }
      promptMessage += '아티클을 선택하세요:';

      const sentMessage = await bot?.sendMessage(chatId, promptMessage, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard },
      });
      
      // Track prompt message for later deletion (only in groups)
      if (sentMessage && isGroup) {
        trackMessage(chatId, sentMessage.message_id);
      }
    } catch (error) {
      console.error('Error:', error);
      bot?.sendMessage(chatId, '❌ 오류가 발생했습니다. 다시 시도해주세요.');
    }
  });

  // Callback query handler
  bot.on('callback_query', async (query) => {
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;
    const data = query.data;
    const telegramId = query.from?.id;

    if (!chatId || !data) return;

    // Menu: Main menu
    if (data === 'menu:main') {
      if (!telegramId) return;
      const user = await getUserByTelegramId(telegramId);
      if (user) {
        await bot?.editMessageText(
          `🚀 *에어드랍 플래너*\n\n안녕하세요, *${user.username}*님!`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '📋 내 플랜', callback_data: 'menu:plan' },
                  { text: '📁 태스크 보기', callback_data: 'menu:tasks' }
                ],
                [
                  { text: '➕ 아티클 추가', callback_data: 'menu:newarticle' },
                  { text: '➕ 태스크 추가', callback_data: 'menu:newtask' }
                ]
              ]
            }
          }
        );
      }
      bot?.answerCallbackQuery(query.id);
      return;
    }

    // Menu: Plan - show frequency filter
    if (data === 'menu:plan') {
      await bot?.editMessageText(
        `📋 *내 플랜*\n\n빈도별로 태스크를 확인하세요:`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🟢 매일', callback_data: 'plan:daily' },
                { text: '🔵 매주', callback_data: 'plan:weekly' },
                { text: '🟣 1회성', callback_data: 'plan:one-time' }
              ],
              [{ text: '📋 전체 보기', callback_data: 'plan:all' }],
              [{ text: '◀️ 뒤로', callback_data: 'menu:main' }]
            ]
          }
        }
      );
      bot?.answerCallbackQuery(query.id);
      return;
    }

    // Menu: Plan tasks by frequency
    if (data.startsWith('plan:')) {
      const frequency = data.replace('plan:', '');
      if (!telegramId) return;
      const user = await getUserByTelegramId(telegramId);
      if (!user) return;

      try {
        let queryStr = `
          SELECT t.id, t.title, t.frequency, t.link_url, a.project_name, up.completed
          FROM user_plans up
          JOIN tasks t ON up.task_id = t.id
          JOIN articles a ON t.article_id = a.id
          WHERE up.user_id = $1
        `;
        const params: any[] = [user.userId];

        if (frequency !== 'all') {
          queryStr += ' AND t.frequency = $2';
          params.push(frequency);
        }
        queryStr += ' ORDER BY up.completed ASC, a.project_name ASC LIMIT 10';

        const result = await pool.query(queryStr, params);

        const freqLabels: Record<string, string> = {
          daily: '🟢 매일',
          weekly: '🔵 매주',
          'one-time': '🟣 1회성',
          all: '📋 전체'
        };

        if (result.rows.length === 0) {
          await bot?.editMessageText(
            `${freqLabels[frequency]} *태스크*\n\n태스크가 없습니다.`,
            {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[{ text: '◀️ 뒤로', callback_data: 'menu:plan' }]]
              }
            }
          );
        } else {
          const buttons = result.rows.map((task: any) => {
            const check = task.completed ? '✅' : '⬜';
            return [{ text: `${check} ${task.title}`, callback_data: `taskview:${task.id}` }];
          });
          buttons.push([{ text: '◀️ 뒤로', callback_data: 'menu:plan' }]);

          await bot?.editMessageText(
            `${freqLabels[frequency]} *태스크*\n\n태스크를 선택하세요:`,
            {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: buttons }
            }
          );
        }
      } catch (error) {
        console.error('Error fetching plan:', error);
      }
      bot?.answerCallbackQuery(query.id);
      return;
    }

    // View single task details
    if (data.startsWith('taskview:')) {
      const taskId = data.replace('taskview:', '');
      if (!telegramId) return;
      const user = await getUserByTelegramId(telegramId);
      if (!user) return;

      try {
        const result = await pool.query(
          `SELECT t.id, t.title, t.description, t.frequency, t.link_url, a.project_name, up.completed
           FROM user_plans up
           JOIN tasks t ON up.task_id = t.id
           JOIN articles a ON t.article_id = a.id
           WHERE up.user_id = $1 AND t.id = $2`,
          [user.userId, taskId]
        );

        if (result.rows.length === 0) {
          bot?.answerCallbackQuery(query.id, { text: '태스크를 찾을 수 없습니다.' });
          return;
        }

        const task = result.rows[0];
        const freqEmoji: Record<string, string> = { daily: '🟢', weekly: '🔵', 'one-time': '🟣' };
        const freqLabel: Record<string, string> = { daily: '매일', weekly: '매주', 'one-time': '1회성' };
        const check = task.completed ? '✅ 완료' : '⬜ 미완료';

        let text = `📌 *${task.title}*\n\n`;
        text += `📁 ${task.project_name}\n`;
        text += `${freqEmoji[task.frequency]} ${freqLabel[task.frequency]}\n`;
        text += `상태: ${check}\n`;
        if (task.description) {
          text += `\n📝 ${task.description}\n`;
        }

        const buttons: any[][] = [];

        // Website button (if link exists)
        if (task.link_url) {
          buttons.push([{ text: '🌐 웹사이트 열기', url: task.link_url }]);
        }

        // Complete/Uncomplete toggle
        const toggleText = task.completed ? '↩️ 미완료로 변경' : '✅ 완료 처리';
        buttons.push([{ text: toggleText, callback_data: `toggle:${taskId}` }]);

        // Back button
        buttons.push([{ text: '◀️ 뒤로', callback_data: `plan:${task.frequency}` }]);

        await bot?.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        });
      } catch (error) {
        console.error('Error viewing task:', error);
      }
      bot?.answerCallbackQuery(query.id);
      return;
    }

    // Toggle task completion
    if (data.startsWith('toggle:')) {
      const taskId = data.replace('toggle:', '');
      if (!telegramId) return;
      const user = await getUserByTelegramId(telegramId);
      if (!user) return;

      try {
        await pool.query(
          'UPDATE user_plans SET completed = NOT completed WHERE user_id = $1 AND task_id = $2',
          [user.userId, taskId]
        );
        bot?.answerCallbackQuery(query.id, { text: '상태가 변경되었습니다!' });

        // Refresh the task view
        const result = await pool.query(
          `SELECT t.id, t.title, t.description, t.frequency, t.link_url, a.project_name, up.completed
           FROM user_plans up
           JOIN tasks t ON up.task_id = t.id
           JOIN articles a ON t.article_id = a.id
           WHERE up.user_id = $1 AND t.id = $2`,
          [user.userId, taskId]
        );

        if (result.rows.length > 0) {
          const task = result.rows[0];
          const freqEmoji: Record<string, string> = { daily: '🟢', weekly: '🔵', 'one-time': '🟣' };
          const freqLabel: Record<string, string> = { daily: '매일', weekly: '매주', 'one-time': '1회성' };
          const check = task.completed ? '✅ 완료' : '⬜ 미완료';

          let text = `📌 *${task.title}*\n\n`;
          text += `📁 ${task.project_name}\n`;
          text += `${freqEmoji[task.frequency]} ${freqLabel[task.frequency]}\n`;
          text += `상태: ${check}\n`;
          if (task.description) {
            text += `\n📝 ${task.description}\n`;
          }

          const buttons: any[][] = [];
          if (task.link_url) {
            buttons.push([{ text: '🌐 웹사이트 열기', url: task.link_url }]);
          }
          const toggleText = task.completed ? '↩️ 미완료로 변경' : '✅ 완료 처리';
          buttons.push([{ text: toggleText, callback_data: `toggle:${taskId}` }]);
          buttons.push([{ text: '◀️ 뒤로', callback_data: `plan:${task.frequency}` }]);

          await bot?.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: buttons }
          });
        }
      } catch (error) {
        console.error('Error toggling task:', error);
        bot?.answerCallbackQuery(query.id, { text: '오류가 발생했습니다.' });
      }
      return;
    }

    // Menu: View tasks (browse all tasks)
    if (data === 'menu:tasks') {
      try {
        const result = await pool.query(
          'SELECT id, title, project_name FROM articles ORDER BY created_at DESC LIMIT 10'
        );

        if (result.rows.length === 0) {
          await bot?.editMessageText(
            `📁 *태스크 보기*\n\n아티클이 없습니다.`,
            {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[{ text: '◀️ 뒤로', callback_data: 'menu:main' }]]
              }
            }
          );
        } else {
          const buttons = result.rows.map((article: Article) => [
            { text: `📁 ${article.project_name}`, callback_data: `browse:${article.id}` }
          ]);
          buttons.push([{ text: '◀️ 뒤로', callback_data: 'menu:main' }]);

          await bot?.editMessageText(
            `📁 *태스크 보기*\n\n아티클을 선택하세요:`,
            {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: buttons }
            }
          );
        }
      } catch (error) {
        console.error('Error fetching articles:', error);
      }
      bot?.answerCallbackQuery(query.id);
      return;
    }

    // Browse tasks in an article
    if (data.startsWith('browse:')) {
      const articleId = data.replace('browse:', '');
      if (!telegramId) return;
      const user = await getUserByTelegramId(telegramId);
      if (!user) return;

      try {
        const articleResult = await pool.query('SELECT project_name FROM articles WHERE id = $1', [articleId]);
        const tasksResult = await pool.query(
          `SELECT t.id, t.title, t.frequency,
            EXISTS(SELECT 1 FROM user_plans up WHERE up.task_id = t.id AND up.user_id = $1) as in_plan
           FROM tasks t WHERE t.article_id = $2 ORDER BY t.created_at DESC LIMIT 10`,
          [user.userId, articleId]
        );

        const projectName = articleResult.rows[0]?.project_name || '알 수 없음';

        if (tasksResult.rows.length === 0) {
          await bot?.editMessageText(
            `📁 *${projectName}*\n\n태스크가 없습니다.`,
            {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[{ text: '◀️ 뒤로', callback_data: 'menu:tasks' }]]
              }
            }
          );
        } else {
          const freqEmoji: Record<string, string> = { daily: '🟢', weekly: '🔵', 'one-time': '🟣' };
          const buttons = tasksResult.rows.map((task: any) => {
            const inPlan = task.in_plan ? '✓ ' : '';
            return [{ text: `${inPlan}${freqEmoji[task.frequency]} ${task.title}`, callback_data: `taskadd:${task.id}:${articleId}` }];
          });
          buttons.push([{ text: '◀️ 뒤로', callback_data: 'menu:tasks' }]);

          await bot?.editMessageText(
            `📁 *${projectName}*\n\n태스크를 선택하여 플랜에 추가하세요:`,
            {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: buttons }
            }
          );
        }
      } catch (error) {
        console.error('Error browsing tasks:', error);
      }
      bot?.answerCallbackQuery(query.id);
      return;
    }

    // Add task to plan from browse
    if (data.startsWith('taskadd:')) {
      const parts = data.replace('taskadd:', '').split(':');
      const taskId = parts[0];
      const articleId = parts[1];
      if (!telegramId) return;
      const user = await getUserByTelegramId(telegramId);
      if (!user) return;

      try {
        const existing = await pool.query(
          'SELECT id FROM user_plans WHERE user_id = $1 AND task_id = $2',
          [user.userId, taskId]
        );

        if (existing.rows.length > 0) {
          // Remove from plan
          await pool.query('DELETE FROM user_plans WHERE user_id = $1 AND task_id = $2', [user.userId, taskId]);
          bot?.answerCallbackQuery(query.id, { text: '플랜에서 제거되었습니다.' });
        } else {
          // Add to plan
          await pool.query('INSERT INTO user_plans (user_id, task_id) VALUES ($1, $2)', [user.userId, taskId]);
          bot?.answerCallbackQuery(query.id, { text: '✅ 플랜에 추가되었습니다!' });
        }

        // Refresh the task list
        const articleResult = await pool.query('SELECT project_name FROM articles WHERE id = $1', [articleId]);
        const tasksResult = await pool.query(
          `SELECT t.id, t.title, t.frequency,
            EXISTS(SELECT 1 FROM user_plans up WHERE up.task_id = t.id AND up.user_id = $1) as in_plan
           FROM tasks t WHERE t.article_id = $2 ORDER BY t.created_at DESC LIMIT 10`,
          [user.userId, articleId]
        );

        const projectName = articleResult.rows[0]?.project_name || '알 수 없음';
        const freqEmoji: Record<string, string> = { daily: '🟢', weekly: '🔵', 'one-time': '🟣' };
        const buttons = tasksResult.rows.map((task: any) => {
          const inPlan = task.in_plan ? '✓ ' : '';
          return [{ text: `${inPlan}${freqEmoji[task.frequency]} ${task.title}`, callback_data: `taskadd:${task.id}:${articleId}` }];
        });
        buttons.push([{ text: '◀️ 뒤로', callback_data: 'menu:tasks' }]);

        await bot?.editMessageText(
          `📁 *${projectName}*\n\n태스크를 선택하여 플랜에 추가하세요:`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: buttons }
          }
        );
      } catch (error) {
        console.error('Error adding task:', error);
        bot?.answerCallbackQuery(query.id, { text: '오류가 발생했습니다.' });
      }
      return;
    }

    // Menu: New article
    if (data === 'menu:newarticle') {
      userStates.set(chatId, {
        action: 'new_article',
        step: 'project_name',
        data: {},
      });
      await bot?.editMessageText(
        `📝 *새 아티클 추가*\n\n프로젝트 이름을 입력하세요:`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '❌ 취소', callback_data: 'menu:main' }]]
          }
        }
      );
      bot?.answerCallbackQuery(query.id);
      return;
    }

    // Menu: New task
    if (data === 'menu:newtask') {
      try {
        const result = await pool.query(
          'SELECT id, title, project_name FROM articles ORDER BY created_at DESC'
        );

        if (result.rows.length === 0) {
          await bot?.editMessageText(
            `📝 *새 태스크 추가*\n\n먼저 아티클을 추가해주세요.`,
            {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '➕ 아티클 추가', callback_data: 'menu:newarticle' }],
                  [{ text: '◀️ 뒤로', callback_data: 'menu:main' }]
                ]
              }
            }
          );
        } else {
          userStates.set(chatId, {
            action: 'new_task',
            step: 'select_article',
            data: {},
          });

          const buttons = result.rows.map((article: Article) => [
            { text: article.project_name, callback_data: `article:${article.id}` }
          ]);
          buttons.push([{ text: '❌ 취소', callback_data: 'menu:main' }]);

          await bot?.editMessageText(
            `📝 *새 태스크 추가*\n\n아티클을 선택하세요:`,
            {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: buttons }
            }
          );
        }
      } catch (error) {
        console.error('Error:', error);
      }
      bot?.answerCallbackQuery(query.id);
      return;
    }

    // 아티클 선택 (태스크 추가 시)
    if (data.startsWith('article:')) {
      const articleId = data.replace('article:', '');
      const existingState = userStates.get(chatId);
      const existingData = existingState?.data || {};
      const existingMessageIds = existingState?.messageIds || [];
      const isGroup = query.message?.chat.type !== 'private';

      userStates.set(chatId, {
        action: 'new_task',
        step: 'title',
        data: { ...existingData, article_id: articleId },
        messageIds: existingMessageIds,
      });
      console.log('Article selected, state data:', userStates.get(chatId)?.data);
      
      const promptText = '태스크 제목을 입력하세요:';
      const sentMessage = await bot?.sendMessage(chatId, promptText);
      if (sentMessage && isGroup) {
        trackMessage(chatId, sentMessage.message_id);
      }
      bot?.answerCallbackQuery(query.id);
    }

    // 빈도 선택
    if (data.startsWith('freq:')) {
      const frequency = data.replace('freq:', '');
      const state = userStates.get(chatId);
      const isGroup = query.message?.chat.type !== 'private';

      if (state && state.action === 'new_task') {
        state.data.frequency = frequency;
        console.log('Frequency selected, state data:', state.data);

        // 이미 설명이 있으면 (답장으로 추가한 경우) 링크 단계로 이동
        const hasDescription = state.data.description && state.data.description.trim().length > 0;

        if (hasDescription) {
          state.step = 'link';
          userStates.set(chatId, state);
          const promptText = '링크 URL을 입력하세요 (생략하려면 /skip):';
          const sentMessage = await bot?.sendMessage(chatId, promptText);
          if (sentMessage && isGroup) {
            trackMessage(chatId, sentMessage.message_id);
          }
        } else {
          state.step = 'description';
          userStates.set(chatId, state);
          const promptText = '설명을 입력하세요 (생략하려면 /skip):';
          const sentMessage = await bot?.sendMessage(chatId, promptText);
          if (sentMessage && isGroup) {
            trackMessage(chatId, sentMessage.message_id);
          }
        }
      }
      bot?.answerCallbackQuery(query.id);
    }

    // 플랜에 태스크 추가
    if (data.startsWith('addplan:')) {
      const taskId = data.replace('addplan:', '');
      const telegramId = query.from?.id;

      if (!telegramId) {
        bot?.answerCallbackQuery(query.id, { text: '오류가 발생했습니다.' });
        return;
      }

      const user = await getUserByTelegramId(telegramId);
      if (!user) {
        bot?.answerCallbackQuery(query.id, { text: '먼저 계정을 연동해주세요.' });
        return;
      }

      try {
        // Check if already in plan
        const existing = await pool.query(
          'SELECT id FROM user_plans WHERE user_id = $1 AND task_id = $2',
          [user.userId, taskId]
        );

        if (existing.rows.length > 0) {
          bot?.answerCallbackQuery(query.id, { text: '이미 플랜에 추가되어 있습니다.' });
          return;
        }

        // Add to plan
        await pool.query(
          'INSERT INTO user_plans (user_id, task_id) VALUES ($1, $2)',
          [user.userId, taskId]
        );

        bot?.answerCallbackQuery(query.id, { text: '✅ 플랜에 추가되었습니다!' });
      } catch (error) {
        console.error('Error adding to plan:', error);
        bot?.answerCallbackQuery(query.id, { text: '오류가 발생했습니다.' });
      }
    }
  });

  // Message handler for interactive flows
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const isGroup = msg.chat.type !== 'private';

    if (!text) return;

    // Skip 처리
    if (text === '/skip') {
      const state = userStates.get(chatId);
      if (!state) return;

      // Track skip message in groups
      if (isGroup) {
        trackMessage(chatId, msg.message_id);
      }

      if (state.action === 'new_article' && state.step === 'description') {
        await createArticle(chatId, state.data, isGroup, state.messageIds || []);
        userStates.delete(chatId);
      } else if (state.action === 'new_task') {
        if (state.step === 'description') {
          state.step = 'link';
          userStates.set(chatId, state);
          const promptText = '링크 URL을 입력하세요 (생략하려면 /skip):';
          const sentMessage = await bot?.sendMessage(chatId, promptText);
          if (sentMessage && isGroup) {
            trackMessage(chatId, sentMessage.message_id);
          }
        } else if (state.step === 'link') {
          await createTask(chatId, state.data, isGroup, state.messageIds || []);
          userStates.delete(chatId);
        }
      }
      return;
    }

    // 명령어는 무시 (다른 핸들러에서 처리)
    if (text.startsWith('/')) {
      // Handle link code input
      const state = userStates.get(chatId);
      if (state?.action === 'link_account' && state.step === 'code') {
        // This is handled by the /link command
      }
      return;
    }

    const state = userStates.get(chatId);
    if (!state) return;

    // 계정 연동 코드 입력
    if (state.action === 'link_account' && state.step === 'code') {
      const telegramId = msg.from?.id;
      const telegramUsername = msg.from?.username;

      if (!telegramId) return;

      if (!/^\d{6}$/.test(text)) {
        bot?.sendMessage(chatId, '❌ 6자리 숫자 코드를 입력해주세요.');
        return;
      }

      const result = await verifyLinkCode(text, telegramId, telegramUsername);

      if (result.success) {
        bot?.sendMessage(
          chatId,
          `✅ *연동 완료!*\n\n` +
          `*${result.username}* 계정에 텔레그램이 연동되었습니다.\n\n` +
          `이제 /n, /t 명령어로 아티클과 태스크를 추가할 수 있습니다.`,
          { parse_mode: 'Markdown' }
        );
      } else {
        bot?.sendMessage(chatId, `❌ ${result.error}`);
      }
      userStates.delete(chatId);
      return;
    }

    // 새 아티클 추가 플로우
    if (state.action === 'new_article') {
      // Track user input message in groups
      if (isGroup) {
        trackMessage(chatId, msg.message_id);
      }

      switch (state.step) {
        case 'project_name': {
          state.data.project_name = text;
          state.step = 'title';
          userStates.set(chatId, state);
          const promptText = '아티클 제목을 입력하세요:';
          const sentMessage = await bot?.sendMessage(chatId, promptText);
          if (sentMessage && isGroup) {
            trackMessage(chatId, sentMessage.message_id);
          }
          break;
        }

        case 'title': {
          state.data.title = text;
          state.step = 'description';
          userStates.set(chatId, state);
          const promptText = '설명을 입력하세요 (생략하려면 /skip):';
          const sentMessage = await bot?.sendMessage(chatId, promptText);
          if (sentMessage && isGroup) {
            trackMessage(chatId, sentMessage.message_id);
          }
          break;
        }

        case 'description':
          state.data.description = text;
          await createArticle(chatId, state.data, isGroup, state.messageIds || []);
          userStates.delete(chatId);
          break;
      }
    }

    // 새 태스크 추가 플로우
    if (state.action === 'new_task') {
      // Track user input message in groups
      if (isGroup) {
        trackMessage(chatId, msg.message_id);
      }

      switch (state.step) {
        case 'title': {
          state.data.title = text;
          state.step = 'frequency';
          userStates.set(chatId, state);
          const promptText = '빈도를 선택하세요:';
          const sentMessage = await bot?.sendMessage(chatId, promptText, {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🟢 매일', callback_data: 'freq:daily' },
                  { text: '🔵 매주', callback_data: 'freq:weekly' },
                  { text: '🟣 1회성', callback_data: 'freq:one-time' },
                ],
              ],
            },
          });
          if (sentMessage && isGroup) {
            trackMessage(chatId, sentMessage.message_id);
          }
          break;
        }

        case 'description': {
          state.data.description = text;
          state.step = 'link';
          userStates.set(chatId, state);
          const promptText = '링크 URL을 입력하세요 (생략하려면 /skip):';
          const sentMessage = await bot?.sendMessage(chatId, promptText);
          if (sentMessage && isGroup) {
            trackMessage(chatId, sentMessage.message_id);
          }
          break;
        }

        case 'link':
          state.data.link_url = text;
          await createTask(chatId, state.data, isGroup, state.messageIds || []);
          userStates.delete(chatId);
          break;
      }
    }
  });

  // 아티클 생성 함수
  async function createArticle(chatId: number, data: Record<string, string>, isGroup: boolean = false, messagesToDelete: number[] = []) {
    try {
      const result = await pool.query(
        `INSERT INTO articles (title, description, project_name)
         VALUES ($1, $2, $3)
         RETURNING id, title, project_name`,
        [data.title, data.description || null, data.project_name]
      );

      const article = result.rows[0];
      const messageText = `✅ *아티클이 추가되었습니다!*\n\n` +
        `📁 *${article.project_name}*\n` +
        `${article.title}\n\n` +
        `웹사이트 Admin 페이지에서 편집할 수 있습니다.`;
      
      const sentMessage = await bot?.sendMessage(chatId, messageText, { parse_mode: 'Markdown' });
      
      // Delete all tracked messages and success message in groups
      if (isGroup) {
        // Delete all the conversation messages
        deleteMessages(bot!, chatId, messagesToDelete);
        
        // Delete success message after 3 seconds
        if (sentMessage) {
          deleteSuccessMessage(bot!, chatId, sentMessage.message_id, 3000);
        }
      }
    } catch (error) {
      console.error('Error creating article:', error);
      bot?.sendMessage(chatId, '❌ 오류가 발생했습니다. 다시 시도해주세요.');
    }
  }

  // 태스크 생성 함수
  async function createTask(chatId: number, data: Record<string, string>, isGroup: boolean = false, messagesToDelete: number[] = []) {
    try {
      const frequencyKorean: Record<string, string> = {
        daily: '매일',
        weekly: '매주',
        'one-time': '1회성',
      };

      const result = await pool.query(
        `INSERT INTO tasks (article_id, title, description, frequency, link_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, title, frequency`,
        [data.article_id, data.title, data.description || null, data.frequency, data.link_url || null]
      );

      const task = result.rows[0];
      const emoji = task.frequency === 'daily' ? '🟢' : task.frequency === 'weekly' ? '🔵' : '🟣';

      // Forward to web3 topic if configured and message info exists
      console.log('Forward check:', { WEB3_TOPIC_CHAT_ID, WEB3_TOPIC_THREAD_ID, forward_chat_id: data.forward_chat_id, forward_message_id: data.forward_message_id });
      if (WEB3_TOPIC_CHAT_ID && WEB3_TOPIC_THREAD_ID && data.forward_chat_id && data.forward_message_id) {
        try {
          console.log('Forwarding message to web3 topic...');
          // Copy the original message to web3 topic (supports topics)
          await (bot as any)?.copyMessage(
            WEB3_TOPIC_CHAT_ID,
            parseInt(data.forward_chat_id),
            parseInt(data.forward_message_id),
            { message_thread_id: WEB3_TOPIC_THREAD_ID }
          );

          // Send notification with buttons below the copied message
          const websiteUrl = process.env.FRONTEND_URL || process.env.WEBSITE_URL || 'https://phplanner.vercel.app';
          const buttons: any[][] = [
            [{ text: '📋 플랜에 추가', callback_data: `addplan:${task.id}` }],
            [{ text: '🌐 웹사이트', url: websiteUrl }]
          ];
          await bot?.sendMessage(
            WEB3_TOPIC_CHAT_ID,
            `✅ *태스크로 추가됨*\n\n${emoji} ${task.title}`,
            {
              parse_mode: 'Markdown',
              message_thread_id: WEB3_TOPIC_THREAD_ID,
              reply_markup: {
                inline_keyboard: buttons
              }
            } as any
          );
          console.log('Successfully forwarded to web3 topic');
        } catch (forwardError: any) {
          console.error('Error forwarding to web3 topic:', forwardError.message || forwardError);
        }
      }

      const messageText = `✅ *태스크가 추가되었습니다!*\n\n` +
        `${emoji} *${task.title}*\n` +
        `빈도: ${frequencyKorean[task.frequency]}\n\n` +
        `웹사이트에서 편집할 수 있습니다.`;
      
      const sentMessage = await bot?.sendMessage(chatId, messageText, { parse_mode: 'Markdown' });
      
      // Delete all tracked messages and success message in groups
      if (isGroup) {
        // Delete all the conversation messages
        deleteMessages(bot!, chatId, messagesToDelete);
        
        // Delete success message after 3 seconds
        if (sentMessage) {
          deleteSuccessMessage(bot!, chatId, sentMessage.message_id, 3000);
        }
      }
    } catch (error) {
      console.error('Error creating task:', error);
      bot?.sendMessage(chatId, '❌ 오류가 발생했습니다. 다시 시도해주세요.');
    }
  }

  console.log('Telegram bot started');
  return bot;
};

export const getBot = (): TelegramBot | null => bot;
