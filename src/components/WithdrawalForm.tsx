import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import styles from './WithdrawalForm.module.css';
import { CONTRACT_ADDRESS, DIAMOND_ABI } from './constants';

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
}

const GHST_ADDRESS = '0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7';

const WithdrawalForm: React.FC<WithdrawalFormProps> = ({ aavegotchis, onWithdraw, onCustomTokenChange, signer }) => {
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
  };

  const handleCustomTokenAddressChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const address = event.target.value;
    setCustomTokenAddress(address);
    if (ethers.isAddress(address)) {
      await onCustomTokenChange(address);
    }
  };

  const handleMaxAmount = () => {
    if (selectedGotchis.length === 1) {
      const selectedGotchi = ownedAavegotchis.find(gotchi => gotchi.tokenId === selectedGotchis[0]);
      if (selectedGotchi) {
        setAmount(tokenOption === 'GHST' ? selectedGotchi.ghstBalance : selectedGotchi.customTokenBalance || '0');
      }
    } else if (selectedGotchis.length > 1) {
      const totalBalance = ownedAavegotchis
        .filter(gotchi => selectedGotchis.includes(gotchi.tokenId))
        .reduce((sum, gotchi) => {
          const balance = tokenOption === 'GHST' ? gotchi.ghstBalance : gotchi.customTokenBalance || '0';
          return sum + parseFloat(balance);
        }, 0);
      setAmount(totalBalance.toString());
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!signer) {
      console.error('Signer not initialized');
      return;
    }

    setIsWithdrawing(true);
    setErrorMessage(null); // Clear any previous error messages

    try {
      const tokenAddress = tokenOption === 'GHST' ? GHST_ADDRESS : customTokenAddress;
      const contract = new ethers.Contract(CONTRACT_ADDRESS, DIAMOND_ABI, signer);
      const userAddress = await signer.getAddress();
      const totalAmount = ethers.parseUnits(amount, 18); // Assuming 18 decimals, adjust if needed

      if (selectedGotchis.length === 1) {
        // Single withdrawal using Diamond facet
        console.log('Calling transferEscrow with:', {
          tokenId: selectedGotchis[0],
          tokenAddress,
          recipient: userAddress,
          amount: totalAmount.toString()
        });

        await contract.transferEscrow(
          selectedGotchis[0],
          tokenAddress,
          userAddress,
          totalAmount
        );
      } else {
        // Batch withdrawal using Aavegotchi facet
        const tokenIds = selectedGotchis.map(id => BigInt(id));
        const erc20Contracts = Array(selectedGotchis.length).fill(tokenAddress);
        const recipients = Array(selectedGotchis.length).fill(userAddress);
        const amounts = distributeAmount(totalAmount, selectedGotchis.length);

        console.log('Calling batchTransferEscrow with:', {
          tokenIds,
          erc20Contracts,
          recipients,
          amounts: amounts.map(a => a.toString())
        });

        await contract.batchTransferEscrow(
          tokenIds,
          erc20Contracts,
          recipients,
          amounts
        );
      }

      // Reset form and update balances
      setAmount('');
      setSelectedGotchis([]);
      await onWithdraw(tokenAddress, selectedGotchis, amount);
    } catch (error: unknown) {
      console.error('Error during withdrawal:', error);
      
      if (error instanceof Error) {
        console.log('Error message:', error.message);
        setErrorMessage(error.message);
      } else {
        setErrorMessage('An error occurred during withdrawal. Please try again.');
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
