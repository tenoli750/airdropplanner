import type { RaceCoin } from '../../services/api';

interface CoinCardProps {
  coin: RaceCoin;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  isWinner?: boolean;
}

export default function CoinCard({ coin, selected, onClick, disabled, isWinner }: CoinCardProps) {
  const change = coin.live_change ?? coin.percent_change ?? 0;
  const isPositive = change >= 0;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative p-4 rounded-xl border-2 transition-all duration-200
        ${selected
          ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
          : 'border-gray-200 bg-white hover:border-gray-300'
        }
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        ${isWinner ? 'ring-4 ring-yellow-400 border-yellow-400' : ''}
      `}
    >
      {/* Winner badge */}
      {isWinner && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
          🏆 WINNER
        </div>
      )}

      {/* Coin image and symbol */}
      <div className="flex items-center justify-center mb-3">
        {coin.coin_image ? (
          <img
            src={coin.coin_image}
            alt={coin.coin_name}
            className="w-12 h-12 rounded-full"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-500">
              {coin.coin_symbol.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Symbol */}
      <div className="text-center mb-2">
        <span className="font-bold text-lg text-gray-800">
          {coin.coin_symbol}
        </span>
      </div>

      {/* Coin name */}
      <div className="text-center mb-3">
        <span className="text-xs text-gray-500 truncate block">
          {coin.coin_name}
        </span>
      </div>

      {/* Percent change */}
      <div className={`
        text-center text-2xl font-bold py-2 px-3 rounded-lg
        ${isPositive 
          ? 'bg-green-100 text-green-600' 
          : 'bg-red-100 text-red-600'
        }
      `}>
        {isPositive ? '+' : ''}{change.toFixed(2)}%
      </div>

      {/* Current price */}
      {coin.current_price && (
        <div className="text-center mt-2 text-xs text-gray-400">
          ${coin.current_price.toLocaleString(undefined, { 
            minimumFractionDigits: 2,
            maximumFractionDigits: coin.current_price < 1 ? 6 : 2 
          })}
        </div>
      )}

      {/* Selection indicator */}
      {selected && !disabled && (
        <div className="absolute top-2 left-2">
          <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}
    </button>
  );
}

