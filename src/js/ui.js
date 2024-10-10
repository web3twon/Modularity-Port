// ui.js

import { showToast, memoizedGetTokenImageUrl } from './utils.js';
import { contract, ghstABI, provider, selectedERC20Address, selectedERC20Symbol, selectedERC20Decimals } from './contracts.js';
import { ethers } from './ethers';

let ownedAavegotchis = [];
let escrowBalances = {};

// Function to Fetch and Display Aavegotchis
export async function fetchAndDisplayAavegotchis(ownerAddress) {
  try {
    ownedAavegotchis = [];
    const aavegotchis = await contract.allAavegotchisOfOwner(ownerAddress);

    if (aavegotchis.length === 0) {
      aavegotchiInfoContainer.innerHTML = '<p>No Aavegotchis found for this wallet.</p>';
      return;
    }

    const tokenContract = new ethers.Contract(selectedERC20Address, ghstABI, provider);
    const tokenDecimals = selectedERC20Decimals;
    const tokenSymbol = selectedERC20Symbol;

    const table = document.createElement('table');
    table.className = 'aavegotchi-table';

    table.innerHTML = `
      <thead>
        <tr>
          <th>Token ID</th>
          <th>Name</th>
          <th>Escrow Wallet</th>
          <th>${tokenSymbol} Balance</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    `;
    
    const tbody = table.querySelector('tbody');

    const balancePromises = aavegotchis.map(aavegotchi => tokenContract.balanceOf(aavegotchi.escrow));
    const lendingStatusPromises = aavegotchis.map(aavegotchi => contract.isAavegotchiLent(aavegotchi.tokenId));

    const balances = await Promise.all(balancePromises);
    const lendingStatuses = await Promise.all(lendingStatusPromises);

    const ownedGotchis = [];
    const rentedGotchis = [];

    for (let index = 0; index < aavegotchis.length; index++) {
      const aavegotchi = aavegotchis[index];
      const isLent = lendingStatuses[index];
      const isOwned = !isLent;

      if (isOwned) {
        ownedAavegotchis.push(aavegotchi);
        ownedGotchis.push({ 
          aavegotchi, 
          balance: balances[index], 
          isLent
        });
      } else {
        rentedGotchis.push({ 
          aavegotchi, 
          balance: balances[index], 
          isLent
        });
      }
    }

    // Sort owned Gotchis by balance in descending order
    ownedGotchis.sort((a, b) => (b.balance > a.balance ? 1 : -1));

    // Combine sorted owned Gotchis with rented Gotchis
    const sortedGotchis = [...ownedGotchis, ...rentedGotchis];

    // Fetch token image once
    const imageUrl = await memoizedGetTokenImageUrl(selectedERC20Address);

    const fragment = document.createDocumentFragment();

    sortedGotchis.forEach(({ aavegotchi, balance, isLent }) => {
      const row = document.createElement('tr');

      const tokenId = aavegotchi.tokenId.toString();
      const name = aavegotchi.name && aavegotchi.name.trim() !== '' ? aavegotchi.name : '(No Name)';
      const escrowWallet = aavegotchi.escrow;
      const shortEscrowWallet = `${escrowWallet.slice(0, 6)}...${escrowWallet.slice(-4)}`;

      escrowBalances[escrowWallet] = {
        tokenBalance: balance,
        tokenSymbol: tokenSymbol,
      };

      row.innerHTML = `
        <td data-label="Token ID">${tokenId}</td>
        <td data-label="Name">${name}</td>
        <td data-label="Escrow Wallet">
          <a href="https://polygonscan.com/address/${escrowWallet}" target="_blank" rel="noopener noreferrer" class="address-link" title="${escrowWallet}">
            ${shortEscrowWallet}
          </a>
          <span class="button-wrapper">
            <button class="copy-button" data-copy-target="${escrowWallet}" data-tooltip="Copy Escrow Wallet Address">📄</button>
            <button class="rarity-farming-button" data-escrow-address="${escrowWallet}" data-token-id="${tokenId}" data-gotchi-name="${name}" data-tooltip="View Rarity Farming Deposits">💰</button>
          </span>
        </td>
        <td data-label="${tokenSymbol} Balance">
          <div class="token-balance">
            <img src="${imageUrl}" alt="${tokenSymbol}" width="24" height="24" onerror="this.src='path/to/default/token/image.png';">
            ${ethers.formatUnits(balance, tokenDecimals)}
          </div>
        </td>
        <td data-label="Status" class="${isLent ? 'status-rented' : 'status-owned'}">
          ${isLent ? 'Rented' : 'Owned'}
        </td>
      `;

      fragment.appendChild(row);
    });

    tbody.appendChild(fragment);

    aavegotchiInfoContainer.innerHTML = '<h2>Your Aavegotchis:</h2>';
    aavegotchiInfoContainer.appendChild(table);

    initializeCopyButtons();
    attachRarityFarmingButtons();
  } catch (error) {
    console.error('Error fetching Aavegotchis:', error);
    aavegotchiInfoContainer.innerHTML = '<p>Error fetching Aavegotchis. See console for details.</p>';
  }
}

// Function to Initialize Copy Button Event Listeners
export function initializeCopyButtons() {
  const copyButtons = document.querySelectorAll('.copy-button');
  copyButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const addressToCopy = button.getAttribute('data-copy-target');
      if (!addressToCopy) return;

      navigator.clipboard
        .writeText(addressToCopy)
        .then(() => {
          button.innerText = '✅';
          setTimeout(() => {
            button.innerText = '📄';
          }, 2000);
        })
        .catch((err) => {
          console.error('Failed to copy!', err);
          showToast('Failed to copy the address. Please try again.', 'error');
        });
    });
  });
}

// Function to Attach Rarity Farming Buttons
export function attachRarityFarmingButtons() {
  const rarityFarmingButtons = document.querySelectorAll('.rarity-farming-button');
  rarityFarmingButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const escrowAddress = button.getAttribute('data-escrow-address');
      const tokenId = button.getAttribute('data-token-id');
      const name = button.getAttribute('data-gotchi-name');

      const deposits = await fetchRarityFarmingDeposits(escrowAddress);
      showDeposits(deposits, tokenId, name);
    });
  });
}

// Function to Show Deposits Modal
export function showDeposits(deposits, tokenId, name) {
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';

  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content centered-content';

  const fragment = document.createDocumentFragment();
  fragment.appendChild(document.createElement('h2')).innerText = `Rarity Farming Deposits for Aavegotchi #${tokenId} (${name})`;

  if (deposits.length === 0) {
    fragment.appendChild(document.createElement('p')).innerText = 'No rarity farming deposits found in the past year.';
  } else {
    const table = document.createElement('table');
    table.className = 'deposit-table centered-table';

    table.innerHTML = `
      <thead>
        <tr>
          <th>Date</th>
          <th>Amount (GHST)</th>
          <th>Transaction Hash</th>
        </tr>
      </thead>
      <tbody>
        ${deposits.map(deposit => `
          <tr>
            <td>${deposit.timestamp}</td>
            <td>${deposit.value}</td>
            <td><a href="https://polygonscan.com/tx/${deposit.hash}" target="_blank" rel="noopener noreferrer">${deposit.hash.slice(0, 6)}...${deposit.hash.slice(-4)}</a></td>
          </tr>
        `).join('')}
      </tbody>
    `;
    
    fragment.appendChild(table);

    const totalDeposits = deposits.reduce((total, deposit) => total + parseFloat(deposit.value), 0);
    const totalElement = document.createElement('p');
    totalElement.className = 'total-deposits';
    totalElement.innerText = `Total Rarity Farming Deposits: ${totalDeposits.toFixed(2)} GHST`;
    fragment.appendChild(totalElement);
  }

  const closeButton = document.createElement('button');
  closeButton.className = 'button centered-button';
  closeButton.innerText = 'Close';
  closeButton.addEventListener('click', () => {
    document.body.removeChild(modalOverlay);
  });
  fragment.appendChild(closeButton);

  modalContent.appendChild(fragment);
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
}

console.log('ui.js loaded');