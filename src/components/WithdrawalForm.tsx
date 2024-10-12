import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import styles from './WithdrawalForm.module.css';
import { CONTRACT_ADDRESS, DIAMOND_ABI, ERC20_ABI } from './constants';

export interface Aavegotchi {
  tokenId: string;
  name: string;
  isLent: boolean;
  ghstBalance: string;
  customTokenBalance?: string;
  escrowWallet: string;
}


export interface WithdrawalFormProps {
  aavegotchis: Aavegotchi[];
  onWithdraw: (tokenAddress: string, selectedGotchis: string[], amount: string) => Promise<void>;
  onCustomTokenChange: (tokenAddress: string) => Promise<void>;
  signer: ethers.Signer | null;
  onTokenSelection: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

const GHST_ADDRESS = '0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7';

const WithdrawalForm: React.FC<WithdrawalFormProps> = ({ aavegotchis, onWithdraw, onCustomTokenChange, signer, onTokenSelection }) => {
  const [selectedGotchis, setSelectedGotchis] = useState<string[]>([]);
  const [tokenOption, setTokenOption] = useState('GHST');
  const [customTokenAddress, setCustomTokenAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [currentTokenSymbol, setCurrentTokenSymbol] = useState('GHST');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ownedAavegotchis = aavegotchis.filter(gotchi => !gotchi.isLent);

  useEffect(() => {
    if (tokenOption === 'GHST') {
      setCurrentTokenSymbol('GHST');
    }
  }, [tokenOption]);


  const handleGotchiSelection = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === 'all') {
      setSelectedGotchis(ownedAavegotchis.map(gotchi => gotchi.tokenId));
    } else {
      setSelectedGotchis([value]);
    }
  };

  const handleTokenSelection = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setTokenOption(event.target.value);
    if (event.target.value === 'GHST') {
      setCustomTokenAddress('');
      setCurrentTokenSymbol('GHST');
    }
    onTokenSelection(event);
  };

  const handleCustomTokenAddressChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const address = event.target.value;
    setCustomTokenAddress(address);
    if (ethers.isAddress(address) && signer) {
      try {
        const tokenContract = new ethers.Contract(address, ERC20_ABI, signer);
        const symbol = await tokenContract.symbol();
        setCurrentTokenSymbol(symbol);
        await onCustomTokenChange(address);
      } catch (error) {
        console.error('Error fetching token symbol:', error);
        setCurrentTokenSymbol('???');
      }
    }
  };

  const handleMaxAmount = () => {
    const eligibleGotchis = ownedAavegotchis.filter(gotchi => !gotchi.isLent);
    if (eligibleGotchis.length === 0) return;

    const totalBalance = eligibleGotchis.reduce((sum, gotchi) => {
      const balance = tokenOption === 'GHST' ? gotchi.ghstBalance : gotchi.customTokenBalance || '0';
      return sum + BigInt(ethers.parseUnits(balance, 18));
    }, BigInt(0));
    
    const formattedBalance = ethers.formatUnits(totalBalance, 18);
    setAmount(formattedBalance);
    console.log(`Max amount set for multiple Aavegotchis: ${formattedBalance}`);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!signer) {
      console.error('Signer not initialized');
      return;
    }

    setIsWithdrawing(true);
    setErrorMessage(null);

    try {
      const tokenAddress = tokenOption === 'GHST' ? GHST_ADDRESS : customTokenAddress;
      const contract = new ethers.Contract(CONTRACT_ADDRESS, DIAMOND_ABI, signer);
      const userAddress = await signer.getAddress();

      const eligibleGotchis = ownedAavegotchis.filter(gotchi => !gotchi.isLent);
      const totalAmount = BigInt(ethers.parseUnits(amount, 18));

      const withdrawals = await Promise.all(eligibleGotchis.map(async (gotchi) => {
        const balance = tokenOption === 'GHST' ? gotchi.ghstBalance : gotchi.customTokenBalance || '0';
        const balanceBigInt = BigInt(ethers.parseUnits(balance, 18));
        const withdrawAmount = totalAmount * BigInt(ethers.parseUnits(balance, 18)) / BigInt(ethers.parseUnits(amount, 18));
        const actualWithdrawAmount = withdrawAmount > balanceBigInt ? balanceBigInt : withdrawAmount;
        return {
          tokenId: BigInt(gotchi.tokenId),
          amount: actualWithdrawAmount
        };
      }));

      console.log('Attempting batch withdrawal:');
      withdrawals.forEach(w => console.log(`Aavegotchi ${w.tokenId}: ${ethers.formatUnits(w.amount, 18)}`));

      await contract.batchTransferEscrow(
        withdrawals.map(w => w.tokenId),
        withdrawals.map(() => tokenAddress),
        withdrawals.map(() => userAddress),
        withdrawals.map(w => w.amount)
      );

      // Reset form and update balances
      setAmount('');
      setSelectedGotchis([]);
      await onWithdraw(tokenAddress, eligibleGotchis.map(g => g.tokenId), amount);
    } catch (error) {
      console.error('Error during withdrawal:', error);
      if (error instanceof Error) {
        console.log('Error message:', error.message);
        setErrorMessage(error.message);
      } else {
        setErrorMessage('An unknown error occurred during withdrawal');
      }
      
      if (typeof error === 'object' && error !== null) {
        if ('transaction' in error) {
          console.log('Transaction details:', (error as { transaction: unknown }).transaction);
        }
        if ('error' in error) {
          console.log('Error details:', (error as { error: unknown }).error);
        }
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Helper function to distribute the total amount among multiple Aavegotchis
  const distributeAmount = (totalAmount: bigint, count: number): bigint[] => {
    const baseAmount = totalAmount / BigInt(count);
    const remainder = totalAmount % BigInt(count);
    return Array(count).fill(null).map((_, index) => 
      index < Number(remainder) ? baseAmount + BigInt(1) : baseAmount
    );
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2>Withdraw</h2>
      <label>
        Select Aavegotchi(s):
        <select
          value={selectedGotchis.length > 1 ? 'all' : selectedGotchis[0] || ''}
          onChange={handleGotchiSelection}
          className={styles.select}
        >
          <option value="">Select an Aavegotchi</option>
          <option value="all">All Owned Aavegotchi</option>
          {ownedAavegotchis.map((gotchi) => (
            <option key={gotchi.tokenId} value={gotchi.tokenId}>
              {gotchi.name || `Aavegotchi #${gotchi.tokenId}`} (Balance: {tokenOption === 'GHST' ? gotchi.ghstBalance : gotchi.customTokenBalance || '0'} {currentTokenSymbol})
            </option>
          ))}
        </select>
      </label>
      <label>
        Token Address:
        <select
          value={tokenOption}
          onChange={handleTokenSelection}
          className={styles.select}
        >
          <option value="GHST">GHST</option>
          <option value="custom">Add Your Own Token</option>
        </select>
        {tokenOption === 'custom' && (
          <input
            type="text"
            value={customTokenAddress}
            onChange={handleCustomTokenAddressChange}
            placeholder="Enter ERC20 token address"
            required
            className={styles.input}
          />
        )}
      </label>
      <label>
        Amount:
        <div className={styles.amountContainer}>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.01"
            required
            className={styles.input}
          />
          <button type="button" onClick={handleMaxAmount} className={styles.maxButton}>
            Max
          </button>
        </div>
      </label>
      <button type="submit" className={styles.submitButton} disabled={isWithdrawing}>
        {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
      </button>
    </form>
  );
};


export default WithdrawalForm;
