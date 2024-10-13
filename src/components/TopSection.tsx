import React, { useState, useEffect } from 'react';
import styles from './TopSection.module.css';
import { formatNumberWithCommas } from '../utils/formatters';

interface TopSectionProps {
  contractAddress: string;
  network: string;
  walletAddress: string | null;
  onConnectWallet: () => void;
  aavegotchis: Aavegotchi[];
  customTokenSymbol: string;
  isCustomToken: boolean;
  tokenImage: string;
}

interface Aavegotchi {
  tokenId: string;
  name: string;
  escrowWallet: string;
  ghstBalance: string;
  customTokenBalance?: string;
  isLent: boolean;
}

const TopSection: React.FC<TopSectionProps> = ({ 
  contractAddress, 
  network, 
  walletAddress, 
  onConnectWallet,
  aavegotchis, 
  customTokenSymbol,
  isCustomToken,
  tokenImage
}) => {
  const [toast, setToast] = useState({ show: false, message: '' });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setToast({ show: true, message: 'Copied to clipboard!' });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      setToast({ show: true, message: 'Failed to copy' });
    });
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  return (
    <div className={styles.topSection}>
      <header className={styles.header}>
        <h1 className={styles.title}>Aavegotchi Banking Services</h1>
        <div className={styles.headerContent}>
          <div className={styles.info}>
            <p className={styles.networkInfo}>Network: {network}</p>
            <p className={styles.contractInfo}>Contract: {contractAddress}</p>
          </div>
          <div className={styles.walletInfo}>
            {walletAddress ? (
              <p>Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
            ) : (
              <button className={styles.connectButton} onClick={onConnectWallet}>Connect Wallet</button>
            )}
          </div>
        </div>
      </header>
      <div className={styles.tableContainer}>
        <h2 className={styles.tableTitle}>Aavegotchi Tokens</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.rightAlign}>TOKEN ID</th>
              <th>NAME</th>
              <th>ESCROW WALLET</th>
              <th className={styles.rightAlign}>
                <div className={styles.balanceHeader}>
                  <span>{isCustomToken ? customTokenSymbol : 'GHST'} BALANCE</span>
                  <div className={styles.tokenImageWrapper}>
                    <img 
                      key={tokenImage}
                      src={tokenImage} 
                      alt={isCustomToken ? customTokenSymbol : 'GHST'} 
                      className={styles.tokenImage} 
                      onError={(e) => {
                        e.currentTarget.onerror = null; 
                        e.currentTarget.src = '/images/default-token.png';
                      }}
                    />
                  </div>
                </div>
              </th>
              <th>OWNERSHIP</th>
            </tr>
          </thead>
          <tbody>
            {aavegotchis.map((gotchi, index) => (
              <tr key={gotchi.tokenId} className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                <td className={styles.rightAlign}>{gotchi.tokenId}</td>
                <td>{gotchi.name || '--'}</td>
                <td>
                  {gotchi.escrowWallet.slice(0, 6) + '...' + gotchi.escrowWallet.slice(-4)}
                  <span 
                    className={styles.copyIcon} 
                    onClick={() => copyToClipboard(gotchi.escrowWallet)}
                  >
                    📝
                  </span>
                </td>
                <td className={styles.rightAlign}>
                  {formatNumberWithCommas(
                    parseFloat(isCustomToken ? (gotchi.customTokenBalance || '0') : gotchi.ghstBalance).toFixed(4)
                  )}
                </td>
                <td>
                  {gotchi.isLent ? 
                    <span className={styles.rented}>🔑 Rented</span> : 
                    <span className={styles.owned}>🏠 Owned</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast.show && (
        <div className={styles.toast}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default TopSection;
