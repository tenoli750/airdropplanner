import pool, { initializeDatabase } from './connection';

const seedData = async () => {
  try {
    await initializeDatabase();

    await pool.query('DELETE FROM user_plans');
    await pool.query('DELETE FROM tasks');
    await pool.query('DELETE FROM articles');

    const articles = [
      {
        title: 'LayerZero Airdrop Guide',
        description: 'Complete guide to maximize your LayerZero airdrop eligibility through cross-chain bridging activities.',
        project_name: 'LayerZero',
      },
      {
        title: 'zkSync Era Farming Strategy',
        description: 'Step-by-step tasks to increase your zkSync Era airdrop allocation through DeFi interactions.',
        project_name: 'zkSync',
      },
      {
        title: 'Scroll Network Airdrop',
        description: 'Essential activities for Scroll mainnet to position yourself for the upcoming airdrop.',
        project_name: 'Scroll',
      },
      {
        title: 'Linea Voyage Points',
        description: 'Maximize your Linea Voyage points through various ecosystem activities.',
        project_name: 'Linea',
      },
      {
        title: 'Base Network Tasks',
        description: 'Strategic tasks on Base network for potential airdrop eligibility.',
        project_name: 'Base',
      },
    ];

    const articleIds: string[] = [];
    for (const article of articles) {
      const result = await pool.query(
        `INSERT INTO articles (title, description, project_name)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [article.title, article.description, article.project_name]
      );
      articleIds.push(result.rows[0].id);
    }

    const tasks = [
      // LayerZero tasks
      { article_index: 0, title: 'Bridge ETH via Stargate', description: 'Bridge at least 0.1 ETH using Stargate Finance', frequency: 'weekly', link_url: 'https://stargate.finance/transfer' },
      { article_index: 0, title: 'Use OFT transfers', description: 'Transfer tokens using LayerZero OFT standard', frequency: 'daily', link_url: 'https://layerzero.network/' },
      { article_index: 0, title: 'Bridge to 5+ chains', description: 'Complete bridges to at least 5 different chains', frequency: 'one-time', link_url: 'https://stargate.finance/transfer' },
      { article_index: 0, title: 'Provide liquidity on Stargate', description: 'Add liquidity to Stargate pools', frequency: 'one-time', link_url: 'https://stargate.finance/pool' },

      // zkSync tasks
      { article_index: 1, title: 'Swap on SyncSwap', description: 'Perform daily swaps on SyncSwap DEX', frequency: 'daily', link_url: 'https://syncswap.xyz/' },
      { article_index: 1, title: 'Mint NFT on zkSync', description: 'Mint at least one NFT on zkSync Era', frequency: 'one-time', link_url: 'https://zksync.io/' },
      { article_index: 1, title: 'Provide liquidity', description: 'Add liquidity to any zkSync DEX pool', frequency: 'weekly', link_url: 'https://syncswap.xyz/' },
      { article_index: 1, title: 'Use zkSync Name Service', description: 'Register a .zks domain name', frequency: 'one-time', link_url: 'https://zksync.io/' },
      { article_index: 1, title: 'Bridge from Ethereum', description: 'Bridge ETH from Ethereum mainnet', frequency: 'weekly', link_url: 'https://bridge.zksync.io/' },

      // Scroll tasks
      { article_index: 2, title: 'Swap on Ambient', description: 'Perform swaps on Ambient Finance', frequency: 'daily', link_url: 'https://scroll.io/' },
      { article_index: 2, title: 'Bridge to Scroll', description: 'Bridge assets to Scroll network', frequency: 'weekly', link_url: 'https://scroll.io/bridge' },
      { article_index: 2, title: 'Deploy a contract', description: 'Deploy a simple smart contract on Scroll', frequency: 'one-time', link_url: 'https://scroll.io/' },
      { article_index: 2, title: 'Use lending protocols', description: 'Deposit or borrow on Scroll lending platforms', frequency: 'weekly', link_url: 'https://scroll.io/' },

      // Linea tasks
      { article_index: 3, title: 'Complete Voyage quests', description: 'Finish weekly Linea Voyage quests', frequency: 'weekly', link_url: 'https://linea.build/' },
      { article_index: 3, title: 'Swap on Velocore', description: 'Perform daily swaps on Velocore DEX', frequency: 'daily', link_url: 'https://linea.build/' },
      { article_index: 3, title: 'Bridge via official bridge', description: 'Use the official Linea bridge', frequency: 'one-time', link_url: 'https://bridge.linea.build/' },
      { article_index: 3, title: 'Mint Linea NFT', description: 'Participate in Linea NFT mints', frequency: 'weekly', link_url: 'https://linea.build/' },

      // Base tasks
      { article_index: 4, title: 'Swap on Aerodrome', description: 'Perform swaps on Aerodrome DEX', frequency: 'daily', link_url: 'https://aerodrome.finance/' },
      { article_index: 4, title: 'Bridge to Base', description: 'Bridge ETH to Base network', frequency: 'one-time', link_url: 'https://bridge.base.org/' },
      { article_index: 4, title: 'Use Friend.tech', description: 'Create account and trade on Friend.tech', frequency: 'weekly', link_url: 'https://www.friend.tech/' },
      { article_index: 4, title: 'Mint Base NFTs', description: 'Mint NFTs on Base ecosystem', frequency: 'weekly', link_url: 'https://base.org/' },
      { article_index: 4, title: 'Provide liquidity', description: 'Add liquidity to Base DEX pools', frequency: 'one-time', link_url: 'https://aerodrome.finance/' },
    ];

    for (const task of tasks) {
      await pool.query(
        `INSERT INTO tasks (article_id, title, description, frequency, link_url)
         VALUES ($1, $2, $3, $4, $5)`,
        [articleIds[task.article_index], task.title, task.description, task.frequency, task.link_url]
      );
    }

    console.log('Seed data inserted successfully!');
    console.log(`Created ${articles.length} articles and ${tasks.length} tasks`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
