import React, { useState, useEffect, ChangeEvent } from 'react';
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
  onTokenSelection: (tokenOption: string) => void;
  tokenSymbol: string;
  onCustomTokenInvalid: () => void;
}

const GHST_ADDRESS = '0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7';

const WithdrawalForm: React.FC<WithdrawalFormProps> = ({
  aavegotchis,
  onWithdraw,
  onCustomTokenChange,
  signer,
  onTokenSelection,
  tokenSymbol,
  onCustomTokenInvalid,
}) => {
  const [selectedGotchis, setSelectedGotchis] = useState<string[]>([]);
  const [tokenOption, setTokenOption] = useState('GHST');
  const [customTokenAddress, setCustomTokenAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ownedAavegotchis = aavegotchis.filter((gotchi) => !gotchi.isLent);

  useEffect(() => {
    if (selectedGotchis.length === 0 && ownedAavegotchis.length > 0) {
      setSelectedGotchis(ownedAavegotchis.map((gotchi) => gotchi.tokenId));
    }
  }, [ownedAavegotchis, selectedGotchis]);

  const handleGotchiSelection = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === 'all') {
      setSelectedGotchis(ownedAavegotchis.map((gotchi) => gotchi.tokenId));
    } else {
      setSelectedGotchis([value]);
    }
    // Reset the amount when selection changes
    setAmount('');
  };

  const handleTokenOptionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newTokenOption = event.target.value;
    setTokenOption(newTokenOption);
    onTokenSelection(newTokenOption);
    if (newTokenOption === 'GHST') {
      setCustomTokenAddress(GHST_ADDRESS);
    } else if (newTokenOption === 'custom') {
      setCustomTokenAddress('');
      // Clear token symbol if custom token is selected
    }
  };

  const handleCustomTokenAddressChange = (event: ChangeEvent<HTMLInputElement>) => {
    const address = event.target.value;
    setCustomTokenAddress(address);
    if (ethers.isAddress(address)) {
      onCustomTokenChange(address);
    } else {
      // If the address is invalid, call onCustomTokenInvalid
      onCustomTokenInvalid();
    }
  };

  const handleMaxAmount = () => {
    let totalBalance = BigInt(0);

    const selectedGotchiData = ownedAavegotchis.filter((gotchi) => selectedGotchis.includes(gotchi.tokenId));

    totalBalance = selectedGotchiData.reduce((sum, gotchi) => {
      const balance = tokenOption === 'GHST' ? gotchi.ghstBalance : gotchi.customTokenBalance || '0';
      return sum + BigInt(ethers.parseUnits(balance, 18));
    }, BigInt(0));

    const formattedBalance = ethers.formatUnits(totalBalance, 18);
    setAmount(formattedBalance);
    console.log(`Max amount set: ${formattedBalance} for ${selectedGotchis.length} Aavegotchi(s)`);
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

      const selectedGotchiData = ownedAavegotchis.filter((gotchi) => selectedGotchis.includes(gotchi.tokenId));
      const totalAmount = ethers.parseUnits(amount, 18);
      const count = selectedGotchiData.length;
      if (count === 0) {
        throw new Error('No Aavegotchis selected');
      }

      // Distribute the total amount among selected gotchis
      const amountPerGotchi = totalAmount / BigInt(count);

      const withdrawals = selectedGotchiData.map((gotchi) => {
        const balanceStr = tokenOption === 'GHST' ? gotchi.ghstBalance : gotchi.customTokenBalance || '0';
        const gotchiBalance = ethers.parseUnits(balanceStr, 18);
        const withdrawAmount = amountPerGotchi < gotchiBalance ? amountPerGotchi : gotchiBalance;
        return {
          tokenId: BigInt(gotchi.tokenId),
          amount: withdrawAmount,
        };
      });

      const totalWithdrawAmount = withdrawals.reduce((sum, w) => sum + w.amount, BigInt(0));

      if (totalWithdrawAmount < totalAmount) {
        alert('Not enough balance in selected Aavegotchis to withdraw the total amount requested.');
        // You can choose to throw an error or proceed with the available amount
        return;
      }

      console.log('Attempting batch withdrawal:');
      withdrawals.forEach((w) => console.log(`Aavegotchi ${w.tokenId}: ${ethers.formatUnits(w.amount, 18)}`));

      await contract.batchTransferEscrow(
        withdrawals.map((w) => w.tokenId),
        withdrawals.map(() => tokenAddress),
        withdrawals.map(() => userAddress),
        withdrawals.map((w) => w.amount)
      );

      // Reset form and update balances
      setAmount('');
      await onWithdraw(tokenAddress, selectedGotchis, amount);
    } catch (error) {
      console.error('Error during withdrawal:', error);
      if (error instanceof Error) {
        console.log('Error message:', error.message);
        setErrorMessage(error.message);
      } else {
        setErrorMessage('An unknown error occurred during withdrawal');
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2>Withdraw</h2>
      <div className={styles.formGroup}>
        <label>
          Select Aavegotchi(s):
          <select
            value={selectedGotchis.length > 1 ? 'all' : selectedGotchis[0] || 'all'}
            onChange={handleGotchiSelection}
            className={styles.select}
          >
            <option value="all">All Owned Aavegotchi</option>
            {ownedAavegotchis.map((gotchi) => (
              <option key={gotchi.tokenId} value={gotchi.tokenId}>
                {gotchi.name || `Aavegotchi #${gotchi.tokenId}`}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.formGroup}>
        <label>
          Token:
          <select value={tokenOption} onChange={handleTokenOptionChange} className={styles.select}>
            <option value="GHST">GHST</option>
            <option value="custom">Add your own token</option>
          </select>
        </label>
      </div>
      {tokenOption === 'custom' && (
        <div className={styles.formGroup}>
          <label>
            Custom Token Address:
            <input
              type="text"
              value={customTokenAddress}
              onChange={handleCustomTokenAddressChange}
              placeholder="Enter token address"
              className={styles.input}
            />
          </label>
        </div>
      )}
      <div className={styles.formGroup}>
        <label>
          Amount:
          <div className={styles.amountContainer}>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.0001"
              required
              className={styles.input}
            />
            <button type="button" onClick={handleMaxAmount} className={styles.maxButton}>
              Max
            </button>
          </div>
        </label>
      </div>
      <button type="submit" className={styles.submitButton} disabled={isWithdrawing}>
        {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
      </button>
      {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}
    </form>
  );
};

export default WithdrawalForm;
