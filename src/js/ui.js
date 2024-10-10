// ui.js

import { showToast, memoizedGetTokenImageUrl } from './utils.js';
import { contract, ghstABI, predefinedTokens, selectedERC20Address, selectedERC20Symbol, selectedERC20Decimals } from './contracts.js';
import { fetchRarityFarmingDeposits } from './apis.js';

// We're assuming ethers is loaded globally via a script tag in the HTML file

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

    const tokenContract = new ethers.Contract(selectedERC20Address, ghstABI, window.provider);
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

// Function to Update Max Button
export async function updateMaxButton(form) {
  const tokenIdSelect = form.querySelector('select[name="_tokenId"]');
  const erc20ContractSelect = form.querySelector('select[name="_erc20Contract"]');
  const customErc20Input = form.querySelector('input[name="custom-erc20-address"]');

  const tokenIdValue = tokenIdSelect ? tokenIdSelect.value : null;
  let erc20Address = erc20ContractSelect ? erc20ContractSelect.value : null;

  if (erc20Address === 'custom') {
    erc20Address = customErc20Input ? customErc20Input.value : null;
  }

  if (!erc20Address || !ethers.isAddress(erc20Address)) {
    return;
  }

  const amountInput = form.querySelector('input[name="_transferAmount"]');
  const maxButton = form.querySelector('.max-button');

  if (!tokenIdValue || !amountInput || !maxButton) return;

  maxButton.disabled = true;
  maxButton.innerText = 'Loading...';

  try {
    let totalBalance = 0n;
    const tokenContract = new ethers.Contract(erc20Address, ghstABI, window.provider);

if (tokenIdValue === 'all') {
      const balancePromises = ownedAavegotchis.map(gotchi => tokenContract.balanceOf(gotchi.escrow));
      const balances = await Promise.all(balancePromises);
      const filteredBalances = balances.filter(balance => balance > 0n);

      if (filteredBalances.length === 0) {
        maxButton.disabled = true;
        maxButton.innerText = 'Max';
        showToast('None of your Aavegotchis hold the selected token.', 'error');
        return;
      }

      totalBalance = filteredBalances.reduce((acc, balance) => acc + balance, 0n);
      maxButton.dataset.maxValue = totalBalance.toString();
    } else {
      const gotchi = ownedAavegotchis.find(g => g.tokenId.toString() === tokenIdValue);
      if (!gotchi) throw new Error('Selected Aavegotchi not found.');
      const escrowWallet = gotchi.escrow;
      totalBalance = await tokenContract.balanceOf(escrowWallet);
      maxButton.dataset.maxValue = totalBalance.toString();
    }

    maxButton.disabled = false;
    maxButton.innerText = 'Max';
  } catch (error) {
    console.error('Error fetching token balance:', error);
    showToast('Error fetching token balance.', 'error');
    maxButton.disabled = true;
    maxButton.innerText = 'Max';
  }
}

// Function to Handle Max Button Click
export async function handleMaxButtonClick(form) {
  const amountInput = form.querySelector('input[name="_transferAmount"]');
  const maxButton = form.querySelector('.max-button');
  const maxValue = maxButton.dataset.maxValue;

  if (maxValue) {
    const erc20ContractSelect = form.querySelector('select[name="_erc20Contract"]');
    const customErc20Input = form.querySelector('input[name="custom-erc20-address"]');
    let erc20Address = erc20ContractSelect ? erc20ContractSelect.value : null;

    if (erc20Address === 'custom') {
      erc20Address = customErc20Input ? customErc20Input.value : null;
    }

    const tokenContract = new ethers.Contract(erc20Address, ghstABI, window.provider);
    const decimals = await tokenContract.decimals();

    const formattedValue = ethers.formatUnits(maxValue, decimals);
    amountInput.value = formattedValue;
  }
}

// Function to generate method form
export function generateMethodForm(method, methodName) {
  const formContainer = document.createElement('div');
  formContainer.className = 'form-container';

  const formHeader = document.createElement('div');
  formHeader.className = 'form-header';

  const formTitle = document.createElement('h3');
  formTitle.innerText = methodName === 'transferEscrow' ? 'Withdraw (TransferEscrow)' : methodName;
  formHeader.appendChild(formTitle);
  formContainer.appendChild(formHeader);

  const form = document.createElement('form');
  form.setAttribute('data-method', methodName);
  form.addEventListener('submit', handleFormSubmit);

  method.inputs.forEach(input => {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';

    const label = document.createElement('label');
    label.setAttribute('for', input.name);

    if (methodName === 'transferEscrow') {
      if (input.name === '_tokenId') {
        label.innerText = 'Select Aavegotchi:';
      } else if (input.name === '_erc20Contract') {
        label.innerText = 'ERC20 Contract Address:';
      } else if (input.name === '_transferAmount') {
        label.innerText = 'Withdraw Amount:';

        const maxButton = document.createElement('button');
        maxButton.type = 'button';
        maxButton.className = 'max-button';
        maxButton.innerText = 'Max';
        maxButton.addEventListener('click', () => handleMaxButtonClick(form));
        label.appendChild(maxButton);
      } else {
        label.innerText = `${input.name} (${input.type}):`;
      }
    } else {
      label.innerText = `${input.name} (${input.type}):`;
    }

    formGroup.appendChild(label);

    let inputElement;
    if (input.name === '_tokenId') {
      inputElement = document.createElement('select');
      inputElement.className = 'select';
      inputElement.id = input.name;
      inputElement.name = input.name;

      if (ownedAavegotchis.length > 1) {
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.innerText = 'All Owned Aavegotchis';
        inputElement.appendChild(allOption);
      }

      for (const aavegotchi of ownedAavegotchis) {
        const option = document.createElement('option');
        option.value = aavegotchi.tokenId.toString();
        const name = aavegotchi.name && aavegotchi.name.trim() !== '' ? aavegotchi.name : '(No Name)';
        option.innerText = `Aavegotchi ID ${aavegotchi.tokenId} (${name})`;
        inputElement.appendChild(option);
      }

      if (ownedAavegotchis.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.innerText = 'No owned Aavegotchis available';
        inputElement.appendChild(option);
        inputElement.disabled = true;
      }

      formGroup.appendChild(inputElement);
      inputElement.addEventListener('change', () => updateMaxButton(form));
    } else if (methodName === 'transferEscrow' && input.name === '_erc20Contract') {
      inputElement = document.createElement('select');
      inputElement.className = 'select';
      inputElement.id = input.name;
      inputElement.name = input.name;

      for (const token of predefinedTokens) {
        const option = document.createElement('option');
        option.value = token.address;
        option.innerText = token.name;
        inputElement.appendChild(option);
      }

      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.innerText = 'Add Your Own Token';
      inputElement.appendChild(customOption);

      formGroup.appendChild(inputElement);

      const customInput = document.createElement('input');
      customInput.type = 'text';
      customInput.className = 'input';
      customInput.id = 'custom-erc20-address';
      customInput.name = 'custom-erc20-address';
      customInput.placeholder = '0x...';
      customInput.style.display = 'none';
      formGroup.appendChild(customInput);

      inputElement.addEventListener('change', async (e) => {
        const isCustom = e.target.value === 'custom';
        customInput.style.display = isCustom ? 'block' : 'none';
        
        if (!isCustom) {
          customInput.value = ''; // Clear the custom input field
        }

        await updateMaxButton(form);

        if (!isCustom) {
          await updateSelectedERC20Token(e.target.value);
        }
      });

      customInput.addEventListener('input', debounce(async (e) => {
        const address = e.target.value.trim();
        if (address === '' || address.length < 42) {
          // Reset to default GHST token
          selectedERC20Address = ghstContractAddress;
          selectedERC20Symbol = 'GHST';
          selectedERC20Decimals = 18;
        } else {
          const formattedAddress = validateAndFormatERC20Address(address);
          if (formattedAddress) {
            try {
              await updateSelectedERC20Token(formattedAddress);
            } catch (error) {
              console.error('Error updating ERC20 token:', error);
              showToast('Invalid ERC20 token address.', 'error');
            }
          } else {
            showToast('Invalid ERC20 address format.', 'error');
          }
        }

        // Update table header
        const tableHeader = document.querySelector('.aavegotchi-table th:nth-child(4)');
        if (tableHeader) {
          tableHeader.innerText = `${selectedERC20Symbol} Balance`;
        }

        // Refresh table balances
        await refreshTableBalances();
      }, 500));

      await updateSelectedERC20Token(inputElement.value);
    } else if (input.name === '_transferAmount') {
      inputElement = document.createElement('input');
      inputElement.type = 'text';
      inputElement.className = 'input';
      inputElement.id = input.name;
      inputElement.name = input.name;
      formGroup.appendChild(inputElement);
    } else {
      if (input.type.endsWith('[]')) {
        inputElement = document.createElement('textarea');
        inputElement.className = 'textarea';
        inputElement.placeholder = 'Enter comma-separated values';
      } else {
        inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.className = 'input';
        if (input.type.startsWith('address')) {
          inputElement.placeholder = '0x...';
        }
      }

      inputElement.id = input.name;
      inputElement.name = input.name;
      formGroup.appendChild(inputElement);
    }

    form.appendChild(formGroup);
  });

  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'button submit-button';
  submitButton.innerText = 'Submit';
  form.appendChild(submitButton);

  formContainer.appendChild(form);
  methodFormsContainer.appendChild(formContainer);

  form.addEventListener('change', () => updateMaxButton(form));
  updateMaxButton(form);
}

console.log('ui.js loaded');