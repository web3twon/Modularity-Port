import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getTokenImageUrl } from '../utils/helpers';

function AavegotchiInfo({ ownedAavegotchis, selectedERC20Symbol, selectedERC20Address, updateSelectedERC20Token }) {
  const [tokenImageUrl, setTokenImageUrl] = useState('https://via.placeholder.com/24');

  useEffect(() => {
    async function fetchTokenImage() {
      if (selectedERC20Address) {
        try {
          const imageUrl = await getTokenImageUrl(selectedERC20Address);
          setTokenImageUrl(imageUrl);
        } catch (error) {
          console.error('Error fetching token image:', error);
          setTokenImageUrl('https://via.placeholder.com/24');
        }
      }
    }
    fetchTokenImage();
  }, [selectedERC20Address]);

  const handleCopyAddress = (address) => {
    navigator.clipboard.writeText(address);
    // You might want to show a toast message here
  };

  const handleRarityFarmingClick = (escrowWallet, tokenId, name) => {
    // Implement the rarity farming deposits view logic here
    console.log(`Viewing rarity farming deposits for Aavegotchi #${tokenId} (${name})`);
  };

  if (!ownedAavegotchis || ownedAavegotchis.length === 0) {
    return <div className="aavegotchi-info"><p>No Aavegotchis found for this wallet.</p></div>;
  }

  return (
    <div className="aavegotchi-info">
      <h2>Your Aavegotchis:</h2>
      <table className="aavegotchi-table">
        <thead>
          <tr>
            <th>Token ID</th>
            <th>Name</th>
            <th>Escrow Wallet</th>
            <th>{`${selectedERC20Symbol} Balance`}</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {ownedAavegotchis.map((aavegotchi, index) => (
            <tr key={aavegotchi.tokenId ? aavegotchi.tokenId.toString() : `unknown-${index}`}>
              <td data-label="Token ID">{aavegotchi.tokenId ? aavegotchi.tokenId.toString() : 'N/A'}</td>
              <td data-label="Name">{aavegotchi.name || '(No Name)'}</td>
              <td data-label="Escrow Wallet">
                {aavegotchi.escrow ? (
                  <>
                    <a
                      href={`https://polygonscan.com/address/${aavegotchi.escrow}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="address-link"
                      title={aavegotchi.escrow}
                    >
                      {`${aavegotchi.escrow.slice(0, 6)}...${aavegotchi.escrow.slice(-4)}`}
                    </a>
                    <span className="button-wrapper">
                      <button
                        className="copy-button"
                        data-copy-target={aavegotchi.escrow}
                        data-tooltip="Copy Escrow Wallet Address"
                        onClick={() => handleCopyAddress(aavegotchi.escrow)}
                      >
                        📄
                      </button>
                      <button
                        className="rarity-farming-button"
                        data-escrow-address={aavegotchi.escrow}
                        data-token-id={aavegotchi.tokenId ? aavegotchi.tokenId.toString() : 'unknown'}
                        data-gotchi-name={aavegotchi.name}
                        data-tooltip="View Rarity Farming Deposits"
                        onClick={() => handleRarityFarmingClick(aavegotchi.escrow, aavegotchi.tokenId ? aavegotchi.tokenId.toString() : 'unknown', aavegotchi.name)}
                      >
                        💰
                      </button>
                    </span>
                  </>
                ) : 'N/A'}
              </td>
              <td data-label={`${selectedERC20Symbol} Balance`}>
                <div className="token-balance">
                  <img src={tokenImageUrl} alt={selectedERC20Symbol} width="24" height="24" />
                  {aavegotchi.balance ? ethers.formatUnits(aavegotchi.balance, 18) : '0'} {/* Assuming 18 decimals, adjust if needed */}
                </div>
              </td>
              <td data-label="Status" className={aavegotchi.lending ? 'status-rented' : 'status-owned'}>
                {aavegotchi.lending ? 'Rented' : 'Owned'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AavegotchiInfo;