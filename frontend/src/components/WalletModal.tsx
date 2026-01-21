import { useState, useEffect } from 'react';
import type { Wallet, TaskWallet } from '../types';
import { walletsApi } from '../services/api';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  existingWallets: Wallet[];
  assignedWalletIds: string[];
  onWalletsAssigned: (taskWallets: TaskWallet[]) => void;
  onWalletCreated: (wallet: Wallet) => void;
  onWalletRemoved?: (walletId: string) => void;
}

type TabType = 'select' | 'create';

// Simple address validation - last 4 digits only
const isValidAddress = (address: string): boolean => {
  const trimmed = address.trim();
  return trimmed.length === 4 && /^[a-zA-Z0-9]+$/.test(trimmed);
};

const WalletModal = ({
  isOpen,
  onClose,
  taskId,
  existingWallets,
  assignedWalletIds,
  onWalletsAssigned,
  onWalletCreated,
  onWalletRemoved,
}: WalletModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('select');

  // Select tab state
  const [selectedWalletIds, setSelectedWalletIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Create tab state
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [addressError, setAddressError] = useState('');

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedWalletIds([]);
      setSearchQuery('');
      setNewAddress('');
      setNewLabel('');
      setAddressError('');
      setActiveTab('select');
    }
  }, [isOpen]);

  // Filter wallets based on search and exclude already assigned
  const availableWallets = existingWallets.filter(wallet => {
    const isNotAssigned = !assignedWalletIds.includes(wallet.id);
    const walletName = wallet.name || wallet.address || '';
    const matchesSearch = searchQuery === '' ||
      walletName.toLowerCase().includes(searchQuery.toLowerCase());
    return isNotAssigned && matchesSearch;
  });

  const alreadyAssignedWallets = existingWallets.filter(wallet =>
    assignedWalletIds.includes(wallet.id)
  );

  // Handle wallet selection toggle
  const toggleWalletSelection = (walletId: string) => {
    setSelectedWalletIds(prev =>
      prev.includes(walletId)
        ? prev.filter(id => id !== walletId)
        : [...prev, walletId]
    );
  };

  // Handle adding selected wallets to task
  const handleAddSelectedWallets = async () => {
    if (selectedWalletIds.length === 0) return;

    setIsSubmitting(true);
    try {
      const taskWallets = await walletsApi.addWalletsToTask(taskId, selectedWalletIds);
      onWalletsAssigned(taskWallets);
      onClose();
    } catch (error) {
      console.error('Failed to add wallets to task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validate address on change - last 4 digits
  const handleAddressChange = (value: string) => {
    const trimmed = value.slice(0, 4);
    setNewAddress(trimmed);
    if (trimmed && !isValidAddress(trimmed)) {
      setAddressError('4자리 영문/숫자만 입력 가능합니다');
    } else {
      setAddressError('');
    }
  };

  // Handle creating new wallet and adding to task
  const handleCreateAndAdd = async () => {
    if (!newAddress.trim() || !isValidAddress(newAddress)) {
      setAddressError('유효한 주소를 입력해주세요');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await walletsApi.createAndAddToTask(
        taskId,
        newAddress.trim(),
        newLabel.trim() || undefined
      );

      // If wallet was newly created, notify parent
      if (result.walletCreated) {
        onWalletCreated(result.wallet);
      }

      onWalletsAssigned([result.taskWallet]);
      onClose();
    } catch (error: any) {
      if (error.response?.status === 409) {
        setAddressError('이미 존재하는 주소입니다');
      } else if (error.response?.data?.error) {
        setAddressError(error.response.data.error);
      } else {
        setAddressError('지갑 추가에 실패했습니다');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-lg w-full mx-4 shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">지갑 추가</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('select')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'select'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            내 지갑에서 선택
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'create'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            새 지갑 추가
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'select' ? (
            <div className="space-y-4">
              {/* Search */}
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="주소 또는 라벨로 검색..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Already assigned wallets */}
              {alreadyAssignedWallets.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">이미 추가된 지갑</p>
                  <div className="flex flex-wrap gap-2">
                    {alreadyAssignedWallets.map(wallet => (
                      <div
                        key={wallet.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-gray-500 text-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-medium">{wallet.name || wallet.address || 'N/A'}</span>
                        {onWalletRemoved && (
                          <button
                            onClick={() => onWalletRemoved(wallet.id)}
                            className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="지갑 제거"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available wallets */}
              <div>
                {availableWallets.length > 0 ? (
                  <>
                    <p className="text-xs text-gray-500 mb-2">선택 가능한 지갑</p>
                    <div className="flex flex-wrap gap-2">
                      {availableWallets.map(wallet => (
                        <button
                          key={wallet.id}
                          onClick={() => toggleWalletSelection(wallet.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            selectedWalletIds.includes(wallet.id)
                              ? 'bg-indigo-500 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {selectedWalletIds.includes(wallet.id) && (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          <span>{wallet.name || wallet.address || 'N/A'}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>선택 가능한 지갑이 없습니다</p>
                    <p className="text-sm mt-1">"새 지갑 추가" 탭에서 지갑을 생성해주세요</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Address input - last 4 digits */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  지갑 뒷자리 4자리 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="예: A1B2"
                  maxLength={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm ${
                    addressError ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {addressError && (
                  <p className="text-xs text-red-500 mt-1">{addressError}</p>
                )}
              </div>

              {/* Info box */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-700">
                  이미 등록된 주소는 새로 생성하지 않고 기존 지갑을 사용합니다.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            취소
          </button>
          {activeTab === 'select' ? (
            <button
              onClick={handleAddSelectedWallets}
              disabled={selectedWalletIds.length === 0 || isSubmitting}
              className="flex-1 px-4 py-2.5 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '추가 중...' : `선택한 지갑 추가 (${selectedWalletIds.length})`}
            </button>
          ) : (
            <button
              onClick={handleCreateAndAdd}
              disabled={!newAddress.trim() || !!addressError || isSubmitting}
              className="flex-1 px-4 py-2.5 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '저장 중...' : '저장하고 이 태스크에 추가'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletModal;
