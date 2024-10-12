import React, { useState, useEffect } from 'react';
import styles from './TopSection.module.css';

interface TopSectionProps {
  contractAddress: string;
  network: string;
  walletAddress: string | null;
  onConnectWallet: () => void;
  aavegotchis: Aavegotchi[];
}

interface Aavegotchi {
  tokenId: string;
  name: string;
  escrowWallet: string;
  ghstBalance: string;
  isLent: boolean;
}

const TopSection: React.FC<TopSectionProps> = ({ contractAddress, network, walletAddress, onConnectWallet, aavegotchis }) => {
  const [toast, setToast] = useState({ show: false, message: '' });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setToast({ show: true, message: 'Address copied to clipboard!' });
    }, (err) => {
      console.error('Could not copy text: ', err);
      setToast({ show: true, message: 'Failed to copy address' });
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
      {toast.show && <div className={styles.toast}>{toast.message}</div>}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.info}>
            <h1 className={styles.title}>Gotchi Banking Services69</h1>
            <p className={styles.contractInfo}>Contract: {contractAddress}</p>
            <p className={styles.networkInfo}>Network: {network}</p>
          </div>
          <div className={styles.walletInfo}>
            {walletAddress ? (
              <p>Connected: {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}</p>
            ) : (
              <button onClick={onConnectWallet} className={styles.connectButton}>Connect Wallet</button>
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
              <th className={styles.rightAlign}>GHST BALANCE</th>
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
                <td className={styles.rightAlign}>{parseFloat(gotchi.ghstBalance).toFixed(4)}</td>
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
    </div>
  );
};

export default TopSection;
