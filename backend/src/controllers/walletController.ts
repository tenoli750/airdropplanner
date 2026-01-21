import { Request, Response } from 'express';
import { WalletModel } from '../models/Wallet';

export const walletController = {
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

  async createWallet(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const { name } = req.body;

      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'Name is required' });
        return;
      }

      const wallet = await WalletModel.create(userId, name);
      res.status(201).json(wallet);
    } catch (error) {
      console.error('Error creating wallet:', error);
      res.status(500).json({ error: 'Failed to create wallet' });
    }
  },

  async updateWallet(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
      const { name } = req.body;

      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'Name is required' });
        return;
      }

      const wallet = await WalletModel.update(id, userId, name);

      if (!wallet) {
        res.status(404).json({ error: 'Wallet not found' });
        return;
      }

      res.json(wallet);
    } catch (error) {
      console.error('Error updating wallet:', error);
      res.status(500).json({ error: 'Failed to update wallet' });
    }
  },

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
};
