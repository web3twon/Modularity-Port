import React from 'react';

function Header({ networkName, userAddress, connectWallet }) {
  return (
    <header>
      <div className="header-left">
        <h1>Gotchi Banking Services</h1>
        <p>
          Contract:{' '}
          <a
            href="https://polygonscan.com/address/0x86935F11C86623deC8a25696E1C19a8659CbF95d"
            id="contract-address-link"
            className="address-link"
            target="_blank"
            rel="noopener noreferrer"
            title="0x86935F11C86623deC8a25696E1C19a8659CbF95d"
          >
            0x8693...F95d
          </a>
        </p>
        <p>Network: <span id="network-name">{networkName || 'Not Connected'}</span></p>
      </div>
      <button className="button" onClick={connectWallet}>
        {userAddress ? `Connected: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'Connect Wallet'}
      </button>
    </header>
  );
}

export default Header;