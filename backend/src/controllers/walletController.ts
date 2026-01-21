import { Request, Response } from 'express';
import { WalletModel, TaskWalletModel } from '../models/Wallet';

// Simple address validation - 4 characters alphanumeric (matching database schema)
const isValidAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();
  // Exactly 4 characters, alphanumeric
  return trimmed.length === 4 && /^[a-zA-Z0-9]+$/.test(trimmed);
};

export const walletController = {
  // Get all wallets for the user
  async getWallets(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const wallets = await WalletModel.findByUserId(userId);
      res.json(wallets);
    } catch (error) {
      console.error('Error fetching wallets:', error);
      res.status(500).json({ error: 'Failed to fetch wallets' });
    }
  },

  // Create a new wallet
  async createWallet(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const { address, label } = req.body;
      const name = address || label; // Use address or label as name

      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'Address is required' });
        return;
      }

      if (!isValidAddress(name)) {
        res.status(400).json({ error: 'Invalid address format. Must be exactly 4 alphanumeric characters.' });
        return;
      }

      const wallet = await WalletModel.create(userId, name);
      res.status(201).json(wallet);
    } catch (error: any) {
      console.error('Error creating wallet:', error);
      // Handle unique constraint violation
      if (error.code === '23505') {
        res.status(409).json({ error: 'Wallet with this address already exists' });
        return;
      }
      res.status(500).json({ error: 'Failed to create wallet' });
    }
  },

  // Upsert wallet by name (find existing or create new)
  async upsertWallet(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const { address, label } = req.body;
      const name = address || label; // Use address or label as name

      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'Address is required' });
        return;
      }

      if (!isValidAddress(name)) {
        res.status(400).json({ error: 'Invalid address format. Must be exactly 4 alphanumeric characters.' });
        return;
      }

      const result = await WalletModel.upsertByName(userId, name);
      res.status(result.created ? 201 : 200).json({ wallet: result.wallet, created: result.created });
    } catch (error) {
      console.error('Error upserting wallet:', error);
      res.status(500).json({ error: 'Failed to upsert wallet' });
    }
  },

  // Update wallet
  async updateWallet(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
      const { address, label } = req.body;
      const name = address || label; // Use address or label as name

      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'Address is required' });
        return;
      }

      if (!isValidAddress(name)) {
        res.status(400).json({ error: 'Invalid address format. Must be exactly 4 alphanumeric characters.' });
        return;
      }

      const wallet = await WalletModel.update(id, userId, name);

      if (!wallet) {
        res.status(404).json({ error: 'Wallet not found' });
        return;
      }

      res.json(wallet);
    } catch (error: any) {
      console.error('Error updating wallet:', error);
      if (error.code === '23505') {
        res.status(409).json({ error: 'Wallet with this address already exists' });
        return;
      }
      res.status(500).json({ error: 'Failed to update wallet' });
    }
  },

  // Delete wallet
  async deleteWallet(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];

      const deleted = await WalletModel.delete(id, userId);

      if (!deleted) {
        res.status(404).json({ error: 'Wallet not found' });
        return;
      }

      res.json({ message: 'Wallet deleted successfully' });
    } catch (error) {
      console.error('Error deleting wallet:', error);
      res.status(500).json({ error: 'Failed to delete wallet' });
    }
  },

  // Get all task-wallet assignments for the user
  async getTaskWallets(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const taskWallets = await TaskWalletModel.findByUserId(userId);
      res.json(taskWallets);
    } catch (error) {
      console.error('Error fetching task wallets:', error);
      res.status(500).json({ error: 'Failed to fetch task wallets' });
    }
  },

  // Get wallets for a specific task
  async getWalletsForTask(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const taskId = req.params.taskId as string;

      const taskWallets = await TaskWalletModel.findByTaskId(taskId, userId);
      res.json(taskWallets);
    } catch (error) {
      console.error('Error fetching wallets for task:', error);
      res.status(500).json({ error: 'Failed to fetch wallets for task' });
    }
  },

  // Add wallet(s) to a task
  async addWalletsToTask(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const taskId = req.params.taskId as string;
      const { walletIds } = req.body;

      if (!walletIds || !Array.isArray(walletIds) || walletIds.length === 0) {
        res.status(400).json({ error: 'walletIds array is required' });
        return;
      }

      const taskWallets = await TaskWalletModel.addWalletsToTask(taskId, walletIds, userId);
      res.status(201).json(taskWallets);
    } catch (error) {
      console.error('Error adding wallets to task:', error);
      res.status(500).json({ error: 'Failed to add wallets to task' });
    }
  },

  // Create wallet and add to task in one operation
  async createAndAddToTask(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const taskId = req.params.taskId as string;
      const { address, label } = req.body;
      const name = address || label; // Use address or label as name

      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'Address is required' });
        return;
      }

      if (!isValidAddress(name)) {
        res.status(400).json({ error: 'Invalid address format. Must be exactly 4 alphanumeric characters.' });
        return;
      }

      // Upsert wallet (reuse if exists)
      const { wallet, created } = await WalletModel.upsertByName(userId, name);

      // Add to task
      const taskWallet = await TaskWalletModel.addWalletToTask(taskId, wallet.id, userId);

      // Include wallet details in taskWallet for frontend
      const taskWalletWithDetails = {
        ...taskWallet,
        wallet: wallet,
      };

      res.status(201).json({
        wallet,
        taskWallet: taskWalletWithDetails,
        walletCreated: created,
      });
    } catch (error) {
      console.error('Error creating and adding wallet to task:', error);
      res.status(500).json({ error: 'Failed to create and add wallet to task' });
    }
  },

  // Remove wallet from a task
  async removeWalletFromTask(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const taskId = req.params.taskId as string;
      const walletId = req.params.walletId as string;

      const removed = await TaskWalletModel.removeWalletFromTask(taskId, walletId, userId);

      if (!removed) {
        res.status(404).json({ error: 'Wallet not assigned to this task' });
        return;
      }

      res.json({ message: 'Wallet removed from task successfully' });
    } catch (error) {
      console.error('Error removing wallet from task:', error);
      res.status(500).json({ error: 'Failed to remove wallet from task' });
    }
  },
};
