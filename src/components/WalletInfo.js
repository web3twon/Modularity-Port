import React from 'react';

function WalletInfo({ userAddress }) {
  if (!userAddress) return null;

  return (
    <div className="wallet-info">
      <p>
        Connected Wallet Address:{' '}
        <a
          href={`https://polygonscan.com/address/${userAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="address-link"
          title={userAddress}
        >
          {`${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`}
        </a>
      </p>
    </div>
  );
}

export default WalletInfo;