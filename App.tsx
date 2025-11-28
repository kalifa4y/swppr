import React, { useState, useEffect } from 'react';
import { ArrowDown, RefreshCw, Copy, CheckCircle, AlertCircle, TrendingUp, Clock, ChevronDown, History, Flame, Coins, Settings, Trash2, Wallet, Check, AlertTriangle } from 'lucide-react';
import Navigation from './components/Navigation';
import CoinSelect from './components/CoinSelect';
import { Screen, Coin, Rate, ExchangeRecord } from './types';
import * as api from './services/api';

const LoadingScreen = () => (
  <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center z-50">
    <div className="relative mb-6">
      <div className="absolute inset-0 bg-orange-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
      <Flame size={64} className="text-orange-500 relative z-10 animate-bounce" />
    </div>
    <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-4"></div>
    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-400 tracking-tighter">swppr.</h1>
  </div>
);

function App() {
  const [screen, setScreen] = useState<Screen>(Screen.HOME);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Swap State
  const [fromCoin, setFromCoin] = useState<Coin | null>(null);
  const [toCoin, setToCoin] = useState<Coin | null>(null);
  const [amount, setAmount] = useState<string>('0.1');
  
  // Estimation State
  const [estimate, setEstimate] = useState<string>('');
  const [rateText, setRateText] = useState<string>('');
  const [feeText, setFeeText] = useState<string>('');
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string>('');
  
  const [rates, setRates] = useState<Rate[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [selectedRate, setSelectedRate] = useState<Rate | null>(null);
  
  // Address State
  const [address, setAddress] = useState('');
  const [refundAddress, setRefundAddress] = useState('');
  const [isAddressValid, setIsAddressValid] = useState(true);
  
  // Exchange State
  const [currentExchange, setCurrentExchange] = useState<ExchangeRecord | null>(null);
  const [exchangeHistory, setExchangeHistory] = useState<ExchangeRecord[]>([]);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // UI State
  const [isCoinSelectOpen, setIsCoinSelectOpen] = useState(false);
  const [coinSelectType, setCoinSelectType] = useState<'from' | 'to'>('from');

  // Initialization
  useEffect(() => {
    const init = async () => {
      const storedHistory = localStorage.getItem('exchangeHistory');
      if (storedHistory) setExchangeHistory(JSON.parse(storedHistory));

      const fetchedCoins = await api.fetchCoins();
      setCoins(fetchedCoins);
      
      // Defaults
      if (fetchedCoins.length > 0) {
        setFromCoin(fetchedCoins.find(c => c.ticker === 'BTC') || fetchedCoins[0]);
        setToCoin(fetchedCoins.find(c => c.ticker === 'ETH') || fetchedCoins[1]);
      }
      setLoading(false);
    };
    init();
  }, []);

  // Auto-estimate effect
  useEffect(() => {
    const getEstimate = async () => {
      setEstimateError('');
      if (!fromCoin || !toCoin || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        setEstimate('');
        setRateText('');
        setFeeText('');
        return;
      }

      setIsEstimating(true);
      try {
        // Fetch rates to find the best one for estimation
        const ratesList = await api.getRates(fromCoin.ticker, toCoin.ticker, parseFloat(amount));
        
        if (Array.isArray(ratesList) && ratesList.length > 0) {
          // Find the rate with the highest return value
          const best = ratesList.reduce((prev, current) => (prev.rate > current.rate) ? prev : current);
          const estimatedValue = (best.rate * parseFloat(amount));
          setEstimate(estimatedValue.toFixed(6));
          setRateText(`1 ${fromCoin.ticker.toUpperCase()} ≈ ${best.rate.toFixed(6)} ${toCoin.ticker.toUpperCase()}`);
          
          // Calculate dynamic fee (Simulating Network fee)
          const fee = estimatedValue * 0.005; // ~0.5% agg fee estimate
          setFeeText(`${fee.toFixed(6)} ${toCoin.ticker.toUpperCase()}`);
        } else {
          setEstimate('');
          setRateText('');
          setFeeText('');
        }
      } catch (error: any) {
        console.warn('Estimate failed', error);
        // Do not set error text if we want to degrade gracefully, just show nothing or partial
        setEstimateError(error.message || 'Unavailable');
        setEstimate('');
        setRateText('');
        setFeeText('');
      } finally {
        setIsEstimating(false);
      }
    };

    const timer = setTimeout(getEstimate, 600); // Debounce 600ms
    return () => clearTimeout(timer);
  }, [fromCoin, toCoin, amount]);

  // Address Validation
  useEffect(() => {
    if (!address) {
      setIsAddressValid(true); // Don't show error if empty
      return;
    }
    
    let valid = true;
    
    // Simple regex check based on ticker (Generic fallback)
    const ticker = toCoin?.ticker.toUpperCase();
    if (ticker === 'ETH' || ticker === 'USDC' || ticker === 'USDT' || ticker === 'MATIC') {
        valid = /^0x[a-fA-F0-9]{40}$/.test(address);
    } else if (ticker === 'BTC') {
        valid = /^(1|3|bc1)[a-zA-Z0-9]{25,39}$/.test(address);
    }
    
    setIsAddressValid(valid);
  }, [address, toCoin]);

  const handleGetRates = async () => {
    if (!fromCoin || !toCoin || !amount) return;
    setLoadingRates(true);
    setRates([]); // Clear previous rates
    try {
      // Re-fetch to ensure fresh rates when user actually clicks
      const fetchedRates = await api.getRates(fromCoin.ticker, toCoin.ticker, parseFloat(amount));
      
      if (Array.isArray(fetchedRates) && fetchedRates.length > 0) {
        setRates(fetchedRates);
        setScreen(Screen.RATES);
      } else {
        // Fallback or empty state handled in UI
        setRates([]); 
      }
    } catch (e: any) {
      console.warn("Error fetching rates", e);
    } finally {
      setLoadingRates(false);
    }
  };

  const handleCreateExchange = async () => {
    if (!fromCoin || !toCoin || !selectedRate || !address || !isAddressValid) return;
    setLoading(true);
    try {
      const res = await api.createExchange(fromCoin.ticker, toCoin.ticker, parseFloat(amount), address, refundAddress);
      
      const newRecord: ExchangeRecord = {
        id: res.id,
        fromCoin: fromCoin.ticker,
        toCoin: toCoin.ticker,
        amount: parseFloat(amount),
        receiveAmountEstimate: selectedRate.rate * parseFloat(amount), // Estimation
        date: new Date().toISOString(),
        status: 'waiting',
        addressDeposit: res.addressDeposit
      };

      const newHistory = [newRecord, ...exchangeHistory];
      setExchangeHistory(newHistory);
      localStorage.setItem('exchangeHistory', JSON.stringify(newHistory));
      
      setCurrentExchange(newRecord);
      setScreen(Screen.EXCHANGE);
    } catch (e: any) {
      alert(`Failed to create exchange: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!currentExchange) return;
    try {
      const statusRes = await api.getExchangeStatus(currentExchange.id);
      const updatedRecord = { ...currentExchange, status: statusRes.status };
      setCurrentExchange(updatedRecord);
      
      // Update history
      const updatedHistory = exchangeHistory.map(item => item.id === updatedRecord.id ? updatedRecord : item);
      setExchangeHistory(updatedHistory);
      localStorage.setItem('exchangeHistory', JSON.stringify(updatedHistory));
    } catch (e) {
      console.error("Status check failed");
    }
  };

  const handleCopyAddress = () => {
    if (currentExchange?.addressDeposit) {
      navigator.clipboard.writeText(currentExchange.addressDeposit);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const handleMaxBalance = () => {
    // Placeholder max balance
    setAmount('1.5');
  };

  const clearHistory = () => {
    if (confirm("Burn all history?")) {
      setExchangeHistory([]);
      localStorage.removeItem('exchangeHistory');
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, ticker: string = 'COIN') => {
    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${ticker}&background=random&color=fff&size=128`;
  };

  if (loading && screen === Screen.HOME) return <LoadingScreen />;

  // --- Screens ---

  const renderHome = () => (
    <div className="flex flex-col h-full px-4 pt-6 pb-24 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
            <div className="bg-orange-500/20 p-2 rounded-lg">
                <Flame className="text-orange-500" fill="currentColor" size={24} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tighter text-white">swppr<span className="text-orange-500">.</span></h1>
        </div>
        <div className="bg-gray-800 border border-gray-700 px-3 py-1 rounded-full text-xs font-bold text-orange-400 uppercase tracking-wide flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
          SwapSpace API
        </div>
      </div>

      {/* Main Swap Interface */}
      <div className="relative flex flex-col gap-2">
        
        {/* FROM Card */}
        <div className="bg-gray-900 rounded-3xl p-5 border border-gray-800 shadow-xl z-0">
          <div className="flex justify-between mb-1">
            <span className="text-gray-400 text-sm font-medium">You send</span>
            <span className="text-gray-500 text-xs font-medium">Aggregator</span>
          </div>
          
          <div className="mb-4 relative flex items-center">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent text-5xl font-bold w-full focus:outline-none placeholder-gray-700 text-white tracking-tight pr-16"
              placeholder="0.0"
            />
            <button 
                onClick={handleMaxBalance}
                className="absolute right-0 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 text-xs font-bold px-2 py-1 rounded-lg border border-orange-500/30 transition-colors uppercase"
            >
                Max
            </button>
          </div>

          <button 
            onClick={() => { setCoinSelectType('from'); setIsCoinSelectOpen(true); }}
            className="w-full flex items-center justify-between bg-gray-950 hover:bg-gray-800 p-3 rounded-2xl transition-all border border-gray-800 hover:border-orange-500/50 group shadow-inner"
          >
            <div className="flex items-center gap-3">
              <img 
                src={fromCoin?.image} 
                alt="" 
                className="w-10 h-10 rounded-full bg-gray-800 object-contain"
                onError={(e) => handleImageError(e, fromCoin?.ticker)}
              />
              <div className="flex flex-col items-start text-left">
                <span className="font-bold text-lg text-white group-hover:text-orange-400 transition-colors leading-tight">
                  {fromCoin?.ticker.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500 font-medium">{fromCoin?.name}</span>
              </div>
            </div>
            <ChevronDown size={20} className="text-gray-500 group-hover:text-orange-400 transition-colors" />
          </button>
        </div>

        {/* SWAP ICON - Absolute Centered */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <button 
            onClick={() => {
              const temp = fromCoin;
              setFromCoin(toCoin);
              setToCoin(temp);
            }}
            className="bg-gray-900 border-4 border-gray-950 rounded-full p-3 hover:bg-gray-800 transition-colors shadow-[0_0_20px_rgba(249,115,22,0.3)] group"
          >
            <ArrowDown size={24} className="text-orange-500 group-hover:text-yellow-400 transition-colors" />
          </button>
        </div>

        {/* TO Card */}
        <div className="bg-gray-900 rounded-3xl p-5 border border-gray-800 shadow-xl z-0">
          <div className="flex justify-between mb-1">
            <span className="text-gray-400 text-sm font-medium">You get</span>
            <span className={`text-xs font-medium transition-colors ${isEstimating ? 'text-orange-400 animate-pulse' : 'text-yellow-500'}`}>
              {isEstimating ? 'Checking Rates...' : 'Best Offer'}
            </span>
          </div>
          
          <div className="mb-4">
             {isEstimating ? (
               <div className="h-[48px] flex items-center">
                 <div className="w-48 h-10 bg-gray-800 rounded animate-pulse" />
               </div>
             ) : (
               <div className="h-[48px] flex items-center">
                 {estimateError ? (
                   <span className="text-red-400 font-bold text-lg flex items-center gap-2">
                     <AlertTriangle size={20} />
                     {estimateError}
                   </span>
                 ) : (
                   <input
                      type="text"
                      readOnly
                      value={estimate || '≈ 0.0'}
                      className={`bg-transparent text-5xl font-bold w-full focus:outline-none tracking-tight ${estimate ? 'text-yellow-400' : 'text-gray-700'}`}
                    />
                 )}
               </div>
             )}
             
             {/* Rate & Fee Display */}
             <div className="mt-2 min-h-[24px]">
               {!isEstimating && !estimateError && rateText && (
                 <div className="flex flex-col items-start gap-1">
                    <span className="text-xs text-gray-400 font-bold flex items-center gap-1">
                     <TrendingUp size={12} className="text-orange-400" />
                     {rateText}
                   </span>
                   {feeText && (
                     <span className="text-xs text-gray-400 font-bold flex items-center gap-1">
                       <Coins size={12} className="text-yellow-500" />
                       Network Fee (Est): <span className="text-gray-300">{feeText}</span>
                     </span>
                   )}
                 </div>
               )}
             </div>
          </div>

          <button 
            onClick={() => { setCoinSelectType('to'); setIsCoinSelectOpen(true); }}
            className="w-full flex items-center justify-between bg-gray-950 hover:bg-gray-800 p-3 rounded-2xl transition-all border border-gray-800 hover:border-orange-500/50 group shadow-inner"
          >
            <div className="flex items-center gap-3">
              <img 
                src={toCoin?.image} 
                alt="" 
                className="w-10 h-10 rounded-full bg-gray-800 object-contain"
                onError={(e) => handleImageError(e, toCoin?.ticker)}
              />
              <div className="flex flex-col items-start text-left">
                <span className="font-bold text-lg text-white group-hover:text-orange-400 transition-colors leading-tight">
                  {toCoin?.ticker.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500 font-medium">{toCoin?.name}</span>
              </div>
            </div>
            <ChevronDown size={20} className="text-gray-500 group-hover:text-orange-400 transition-colors" />
          </button>
        </div>

      </div>

      <button
        onClick={handleGetRates}
        disabled={loadingRates || !amount || parseFloat(amount) <= 0 || !!estimateError}
        className="mt-6 w-full bg-gradient-to-r from-orange-600 to-red-500 hover:from-orange-500 hover:to-red-400 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-900/20 transition-all flex items-center justify-center text-lg"
      >
        {loadingRates ? (
          <RefreshCw className="animate-spin mr-2" />
        ) : (
          <Flame className="mr-2" fill="currentColor" />
        )}
        {loadingRates ? 'Scanning Exchanges...' : 'Find Best Rates'}
      </button>

      {/* Info Section */}
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Coins size={20} className="text-yellow-500" /> 
            Powered by SwapSpace
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800">
            <CheckCircle className="text-orange-500 mb-2" size={24} />
            <h4 className="font-bold text-sm">Aggregator</h4>
            <p className="text-xs text-gray-400 mt-1">We scan 20+ exchanges for you.</p>
          </div>
          <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800">
            <Clock className="text-orange-500 mb-2" size={24} />
            <h4 className="font-bold text-sm">Best Rates</h4>
            <p className="text-xs text-gray-400 mt-1">Automatically picks the best price.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRates = () => (
    <div className="flex flex-col h-full px-4 pt-6 pb-24 overflow-y-auto">
      <div className="flex items-center mb-6">
        <button onClick={() => setScreen(Screen.HOME)} className="p-2 -ml-2 text-gray-400 hover:text-white">
          <ArrowDown className="transform rotate-90" />
        </button>
        <h1 className="text-2xl font-bold ml-2">Offers</h1>
      </div>

      <p className="text-gray-400 text-sm mb-4">
        Found {rates.length} offers for {amount} {fromCoin?.ticker}
      </p>

      <div className={`space-y-3 ${selectedRate ? 'mb-[340px]' : ''}`}>
        {rates.length === 0 ? (
          <div className="text-center p-8 bg-gray-900 rounded-xl border border-gray-800">
             <AlertCircle className="mx-auto mb-4 text-orange-500 w-12 h-12" />
             <p className="font-bold text-white mb-2">No offers found</p>
             <p className="text-sm text-gray-400">
               Could not find a valid exchange pair or amount limits were not met.
             </p>
             <button onClick={() => setScreen(Screen.HOME)} className="mt-4 text-orange-400 font-bold hover:text-orange-300">
                Go Back
             </button>
          </div>
        ) : (
          rates.map((rate, idx) => (
            <div 
              key={idx}
              onClick={() => { setSelectedRate(rate); }}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                selectedRate === rate 
                  ? 'bg-orange-900/20 border-orange-500 ring-1 ring-orange-500' 
                  : 'bg-gray-900 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg text-white flex items-center gap-2 capitalize">
                    {rate.adapter}
                </span>
                {idx === 0 && (
                  <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-1 rounded font-bold">BEST RATE</span>
                )}
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-3xl font-bold text-white tracking-tight">{(rate.rate * parseFloat(amount)).toFixed(6)}</div>
                  <div className="text-xs text-gray-400 mt-1">Limits: {rate.min} - {rate.max}</div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                        <Clock size={10} /> ~{rate.time_limit} mins
                    </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedRate && rates.length > 0 && (
        <div className="fixed bottom-[80px] left-0 right-0 p-5 bg-gray-950 border-t border-gray-900 animate-in slide-in-from-bottom duration-300 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-40 max-h-[60vh] overflow-y-auto">
          {/* Selected Rate Summary */}
          <div className="bg-gray-900 rounded-xl p-3 mb-4 border border-gray-800 grid grid-cols-2 gap-y-2 text-sm">
             <div><span className="text-gray-500 block text-xs">Provider</span><span className="font-bold capitalize">{selectedRate.adapter}</span></div>
             <div className="text-right"><span className="text-gray-500 block text-xs">ETA</span><span className="font-bold text-orange-400">~{selectedRate.time_limit} mins</span></div>
             <div className="col-span-2 border-t border-gray-800 pt-2 mt-1 flex justify-between items-center">
                 <span className="text-gray-500 text-xs">You receive</span>
                 <span className="font-bold text-green-400">{(selectedRate.rate * parseFloat(amount)).toFixed(6)} {toCoin?.ticker}</span>
             </div>
          </div>

          <div className="space-y-4">
            <div>
                <label className="text-sm text-gray-400 block mb-2">Recipient {toCoin?.name} Address</label>
                <div className="relative">
                    <input 
                    type="text" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={`Your ${toCoin?.ticker} wallet address`}
                    className={`w-full bg-gray-900 border text-white px-4 py-3 rounded-xl focus:ring-2 focus:outline-none transition-all ${
                        !isAddressValid && address 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-800 focus:ring-orange-500'
                    }`}
                    />
                    {!isAddressValid && address && (
                        <AlertCircle size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500" />
                    )}
                </div>
                {!isAddressValid && address && (
                    <p className="text-red-500 text-xs mt-1 ml-1">Invalid address format for {toCoin?.ticker}</p>
                )}
            </div>
            
            <div>
                <label className="text-sm text-gray-400 block mb-2">Refund Address (Optional)</label>
                <input 
                  type="text" 
                  value={refundAddress}
                  onChange={(e) => setRefundAddress(e.target.value)}
                  placeholder={`Your ${fromCoin?.ticker} refund address`}
                  className="w-full bg-gray-900 border border-gray-800 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all"
                />
            </div>

            <button
                onClick={handleCreateExchange}
                disabled={!address || !isAddressValid}
                className="w-full bg-orange-600 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3 rounded-xl hover:bg-orange-500 shadow-lg shadow-orange-900/20 transition-all flex items-center justify-center gap-2"
            >
                {!address ? 'Enter Address' : (!isAddressValid ? 'Fix Address' : 'Create Exchange')}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderExchange = () => {
    if (!currentExchange) return null;
    return (
      <div className="flex flex-col h-full px-4 pt-6 pb-24 overflow-y-auto">
        <div className="flex items-center mb-6">
           <button onClick={() => setScreen(Screen.HISTORY)} className="p-2 -ml-2 text-gray-400 hover:text-white">
            <ArrowDown className="transform rotate-90" />
           </button>
          <h1 className="text-2xl font-bold ml-2">Swap Status</h1>
        </div>

        <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800 text-center mb-6 relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl"></div>

          <p className="text-gray-400 mb-2 font-medium">Send exact amount</p>
          <div className="text-3xl font-bold text-white mb-2 tracking-tight">
            {currentExchange.amount} <span className="text-orange-500">{currentExchange.fromCoin.toUpperCase()}</span>
          </div>
          <p className="text-gray-500 text-sm mb-6">to the address below</p>

          <div className="bg-white p-2 rounded-xl w-48 h-48 mx-auto mb-6 shadow-lg shadow-orange-500/10">
             <img 
               src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${currentExchange.addressDeposit}`} 
               alt="Deposit QR"
               className="w-full h-full"
             />
          </div>

          <div className="bg-gray-800 rounded-xl p-3 flex items-center justify-between mb-4 border border-gray-700">
            <div className="text-xs text-gray-400 truncate mr-2 font-mono w-full text-left">
              {currentExchange.addressDeposit}
            </div>
            <button 
              onClick={handleCopyAddress}
              className={`p-2 transition-colors flex items-center gap-1 ${copyFeedback ? 'text-green-400' : 'text-orange-400 hover:text-white'}`}
            >
              {copyFeedback ? <Check size={20} /> : <Copy size={20} />}
              {copyFeedback && <span className="text-xs font-bold">Copied!</span>}
            </button>
          </div>

          <div className="flex justify-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${['waiting', 'confirming', 'exchanging', 'sending', 'finished'].includes(currentExchange.status) ? 'bg-orange-500' : 'bg-gray-700'}`} />
            <div className={`h-2 w-2 rounded-full ${['confirming', 'exchanging', 'sending', 'finished'].includes(currentExchange.status) ? 'bg-orange-500' : 'bg-gray-700'}`} />
            <div className={`h-2 w-2 rounded-full ${['exchanging', 'sending', 'finished'].includes(currentExchange.status) ? 'bg-orange-500' : 'bg-gray-700'}`} />
            <div className={`h-2 w-2 rounded-full ${['sending', 'finished'].includes(currentExchange.status) ? 'bg-orange-500' : 'bg-gray-700'}`} />
            <div className={`h-2 w-2 rounded-full ${['finished'].includes(currentExchange.status) ? 'bg-green-500' : 'bg-gray-700'}`} />
          </div>
          <p className="mt-4 text-lg font-bold capitalize text-orange-300 animate-pulse">
            {currentExchange.status}...
          </p>
        </div>

        <button
          onClick={handleRefreshStatus}
          className="bg-gray-800 text-white py-3 rounded-xl flex items-center justify-center mb-4 border border-gray-700 hover:bg-gray-700 transition-all font-bold"
        >
          <RefreshCw size={20} className="mr-2" />
          Refresh Status
        </button>
        
        <div className="p-4 bg-orange-900/20 border border-orange-500/20 rounded-xl flex gap-3">
            <AlertCircle className="text-orange-500 flex-shrink-0" />
            <p className="text-sm text-orange-200">
               Do not close this app until you have sent the funds.
            </p>
        </div>
      </div>
    );
  };

  const renderHistory = () => (
    <div className="flex flex-col h-full px-4 pt-6 pb-24 overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <History className="text-orange-500" />
          Swap History
      </h1>
      
      {exchangeHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 opacity-50 mt-10">
              <History size={48} className="mb-4 text-gray-600" />
              <p className="text-gray-500">No swaps yet. Fire one up!</p>
          </div>
      ) : (
          <div className="space-y-4">
              {exchangeHistory.map(tx => (
                  <button 
                    key={tx.id}
                    onClick={() => { setCurrentExchange(tx); setScreen(Screen.EXCHANGE); }}
                    className="w-full bg-gray-900 p-4 rounded-xl border border-gray-800 flex justify-between items-center text-left hover:border-orange-500/30 transition-all"
                  >
                      <div>
                          <div className="font-bold text-white text-lg flex items-center gap-2">
                            {tx.fromCoin.toUpperCase()} <ArrowDown size={14} className="rotate-[-90deg] text-gray-500"/> {tx.toCoin.toUpperCase()}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{new Date(tx.date).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                          <div className="text-sm font-medium text-white">{tx.amount}</div>
                          <span className={`text-xs px-2 py-0.5 rounded capitalize ${tx.status === 'finished' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                              {tx.status}
                          </span>
                      </div>
                  </button>
              ))}
          </div>
      )}
    </div>
  );
  
  const renderSettings = () => (
      <div className="flex flex-col h-full px-4 pt-6 pb-24 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Settings className="text-orange-500" />
            Settings
        </h1>
        
        <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
            <h3 className="text-white font-bold mb-4">Data Management</h3>
            <button 
                onClick={clearHistory}
                className="w-full bg-red-900/20 text-red-400 p-3 rounded-xl flex items-center justify-center gap-2 hover:bg-red-900/40 transition-colors"
            >
                <Trash2 size={18} />
                Clear Local History
            </button>
        </div>
        
        <div className="mt-6 text-center text-gray-600 text-xs">
            <p>swppr. v1.2.0</p>
            <p>Powered by SwapSpace API</p>
        </div>
      </div>
  );

  return (
    <div className="h-screen w-screen bg-gray-950 font-['League_Spartan'] text-white overflow-hidden flex flex-col">
      <main className="flex-1 relative overflow-hidden">
        {screen === Screen.HOME && renderHome()}
        {screen === Screen.RATES && renderRates()}
        {screen === Screen.EXCHANGE && renderExchange()}
        {screen === Screen.HISTORY && renderHistory()}
        {screen === Screen.SETTINGS && renderSettings()}
      </main>

      <Navigation currentScreen={screen} onNavigate={setScreen} />

      <CoinSelect
        isOpen={isCoinSelectOpen}
        onClose={() => setIsCoinSelectOpen(false)}
        onSelect={(coin) => {
          if (coinSelectType === 'from') setFromCoin(coin);
          else setToCoin(coin);
        }}
        coins={coins}
        title={coinSelectType === 'from' ? 'Send' : 'Receive'}
        selectedTicker={coinSelectType === 'from' ? fromCoin?.ticker : toCoin?.ticker}
      />
    </div>
  );
}

export default App;