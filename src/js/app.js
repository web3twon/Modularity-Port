// app.js

import { connectWallet } from './wallet.js';
import { showToast } from './utils.js';
import { contract, selectedERC20Address, selectedERC20Symbol, selectedERC20Decimals } from './contracts.js';

// Global Variables
let ownedAavegotchis = [];
let escrowBalances = {};

// DOM Elements
const connectWalletButton = document.getElementById('connect-wallet');
const walletInfo = document.getElementById('wallet-info');
const networkNameDisplay = document.getElementById('network-name');
const methodFormsContainer = document.getElementById('method-forms');
const aavegotchiInfoContainer = document.getElementById('aavegotchi-info');
const toastContainer = document.getElementById('toast-container');

// Event Listeners
connectWalletButton.addEventListener('click', connectWallet);

// Initialize the application
async function init() {
  if (window.ethereum && window.ethereum.selectedAddress) {
    await connectWallet();
  }
}

// Function to Generate Method Forms
async function generateMethodForms() {
  methodFormsContainer.innerHTML = '';
  if (!contract) {
    methodFormsContainer.innerHTML = '<p>Please connect your wallet to interact with the contract.</p>';
    return;
  }

  const selectedFacet = 'EscrowFacet';
  const facetMethods = getFacetMethods(selectedFacet);

  if (!facetMethods) {
    methodFormsContainer.innerHTML = '<p>No methods found for the selected facet.</p>';
    return;
  }

  const mainMethodNames = ['transferEscrow'];
  const extraMethodNames = ['batchTransferEscrow', 'batchDepositERC20', 'batchDepositGHST', 'depositERC20'];

  for (const methodName of mainMethodNames) {
    generateMethodForm(facetMethods[methodName], methodName);
  }

  generateExtraTools(facetMethods, extraMethodNames);
}

// Function to Generate Extra Tools
function generateExtraTools(facetMethods, extraMethodNames) {
  if (extraMethodNames.length > 0) {
    const extraToolsContainer = document.createElement('div');
    extraToolsContainer.className = 'form-container';

    const extraToolsHeader = document.createElement('div');
    extraToolsHeader.className = 'form-header';
    extraToolsHeader.style.cursor = 'pointer';

    extraToolsHeader.innerHTML = `
      <h3>Extra Tools</h3>
      <span class="toggle-icon collapsed">&#9660;</span>
    `;
    extraToolsContainer.appendChild(extraToolsHeader);

    const collapsibleContent = document.createElement('div');
    collapsibleContent.className = 'collapsible-content';

    extraMethodNames.forEach((methodName) => {
      const method = facetMethods[methodName];
      const formContainer = document.createElement('div');
      formContainer.className = 'form-container-inner';

      formContainer.innerHTML = `
        <div class="form-header">
          <h3>${methodName}</h3>
          <span class="toggle-icon collapsed">&#9660;</span>
        </div>
        <div class="collapsible-content">
          <form data-method="${methodName}">
            ${method.inputs.map(input => `
              <div class="form-group">
                <label for="${input.name}">${input.name} (${input.type}):</label>
                ${input.type.endsWith('[]') 
                  ? `<textarea class="textarea" id="${input.name}" name="${input.name}" placeholder="Enter comma-separated values"></textarea>`
                  : `<input type="text" class="input" id="${input.name}" name="${input.name}" ${input.type.startsWith('address') ? 'placeholder="0x..."' : ''}>`
                }
              </div>
            `).join('')}
            <button type="submit" class="button submit-button">Submit</button>
          </form>
        </div>
      `;

      // Attach event listeners
      const formHeader = formContainer.querySelector('.form-header');
      const formToggleIcon = formContainer.querySelector('.toggle-icon');
      const formCollapsibleContent = formContainer.querySelector('.collapsible-content');

      toggleCollapse(formCollapsibleContent, formToggleIcon, false);

      formHeader.addEventListener('click', () => {
        const isExpanded = formCollapsibleContent.classList.contains('expanded');
        toggleCollapse(formCollapsibleContent, formToggleIcon, !isExpanded);
      });

      collapsibleContent.appendChild(formContainer);
    });

    extraToolsContainer.appendChild(collapsibleContent);
    methodFormsContainer.appendChild(extraToolsContainer);
    toggleCollapse(collapsibleContent, extraToolsContainer.querySelector('.toggle-icon'), false);

    extraToolsHeader.addEventListener('click', () => {
      const isExpanded = collapsibleContent.classList.contains('expanded');
      toggleCollapse(collapsibleContent, extraToolsContainer.querySelector('.toggle-icon'), !isExpanded);
    });
  }
}

// Function to Get Methods for a Facet
function getFacetMethods(facet) {
  const facets = {
    EscrowFacet: {
      transferEscrow: {
        inputs: [
          { name: '_tokenId', type: 'uint256' },
          { name: '_erc20Contract', type: 'address' },
          { name: '_transferAmount', type: 'uint256' },
        ],
      },
      batchTransferEscrow: {
        inputs: [
          { name: '_tokenIds', type: 'uint256[]' },
          { name: '_erc20Contracts', type: 'address[]' },
          { name: '_recipients', type: 'address[]' },
          { name: '_transferAmounts', type: 'uint256[]' },
        ],
      },
      batchDepositERC20: {
        inputs: [
          { name: '_tokenIds', type: 'uint256[]' },
          { name: '_erc20Contracts', type: 'address[]' },
          { name: '_values', type: 'uint256[]' },
        ],
      },
      batchDepositGHST: {
        inputs: [
          { name: '_tokenIds', type: 'uint256[]' },
          { name: '_values', type: 'uint256[]' },
        ],
      },
      depositERC20: {
        inputs: [
          { name: '_tokenId', type: 'uint256' },
          { name: '_erc20Contract', type: 'address' },
          { name: '_value', type: 'uint256' },
        ],
      },
    },
  };

  return facets[facet];
}

// Function to Handle Form Submission
async function handleFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  let methodName = form.getAttribute('data-method');
  const selectedFacet = 'EscrowFacet';
  const facetMethods = getFacetMethods(selectedFacet);
  let method = facetMethods[methodName];
  const formData = new FormData(form);

  const args = [];
  const submitButton = form.querySelector('.submit-button');
  submitButton.disabled = true;
  submitButton.innerText = 'Submitting...';

  try {
    const tokenIdValue = formData.get('_tokenId');
    const erc20ContractValue = formData.get('_erc20Contract');
    let erc20ContractAddress = erc20ContractValue;

    if (erc20ContractValue === 'custom') {
      const customAddress = formData.get('custom-erc20-address')?.trim();
      if (!customAddress || !ethers.isAddress(customAddress)) {
        throw new Error('Please provide a valid custom ERC20 contract address.');
      }
      erc20ContractAddress = customAddress;
    }

    let transferAmountValue = formData.get('_transferAmount')?.trim();
    if (transferAmountValue && transferAmountValue.startsWith('.')) {
      transferAmountValue = '0' + transferAmountValue;
    }

    if (methodName === 'transferEscrow' && tokenIdValue === 'all') {
      methodName = 'batchTransferEscrow';
      method = facetMethods[methodName];

      let _tokenIds = ownedAavegotchis.map((gotchi) => ethers.getBigInt(gotchi.tokenId));

      if (_tokenIds.length === 0) {
        throw new Error('You do not own any Aavegotchis.');
      }

      const tokenContract = new ethers.Contract(erc20ContractAddress, ghstABI, provider);
      const balancePromises = _tokenIds.map(async (tokenId) => {
        const gotchi = ownedAavegotchis.find((g) => ethers.getBigInt(g.tokenId) === tokenId);
        const escrowWallet = gotchi.escrow;
        const balance = await tokenContract.balanceOf(escrowWallet);
        const symbol = await tokenContract.symbol();
        const name = gotchi.name && gotchi.name.trim() !== '' ? gotchi.name : '(No Name)';
        return { tokenId, balance, symbol, name };
      });
      const balancesResult = await Promise.all(balancePromises);
      const filteredData = balancesResult.filter(({ balance }) => balance > 0n);

      if (filteredData.length === 0) {
        throw new Error('None of your Aavegotchis hold the selected token.');
      }

      _tokenIds = filteredData.map(({ tokenId }) => tokenId);
      const individualBalances = filteredData.map(({ balance }) => balance);
      const totalAvailableBalance = individualBalances.reduce((acc, balance) => acc + balance, 0n);

      if (transferAmountValue === '') {
        throw new Error('Please enter an amount or click Max.');
      }

      if (!/^\d+(\.\d+)?$/.test(transferAmountValue)) {
        throw new Error('Invalid number for amount');
      }

      const decimals = await tokenContract.decimals();
      const totalTransferAmount = ethers.parseUnits(transferAmountValue, decimals);

      if (totalTransferAmount > totalAvailableBalance) {
        throw new Error('The total amount exceeds the total available balance across your Aavegotchis.');
      }

      let _transferAmounts = [];

      if (totalTransferAmount === totalAvailableBalance) {
        _transferAmounts = individualBalances;
      } else {
        _transferAmounts = await getUserSpecifiedAmounts(
          filteredData.map((data) => data.tokenId),
          filteredData.map((data) => data.balance),
          totalTransferAmount,
          decimals,
          tokenContract,
          filteredData.map((data) => data.name),
          await tokenContract.symbol()
        );
      }

      args.push(_tokenIds);
      const _erc20Contracts = _tokenIds.map(() => erc20ContractAddress);
      args.push(_erc20Contracts);
      const _recipients = _tokenIds.map(() => userAddress);
      args.push(_recipients);
      args.push(_transferAmounts);
    } else {
      const _tokenId = ethers.getBigInt(tokenIdValue);
      args.push(_tokenId);

      const ownedTokenIds = ownedAavegotchis.map((gotchi) => gotchi.tokenId.toString());
      if (!ownedTokenIds.includes(_tokenId.toString())) {
        throw new Error('You do not own the selected Aavegotchi.');
      }

      args.push(erc20ContractAddress);
      args.push(userAddress);

      if (transferAmountValue === '') {
        throw new Error('Please enter an amount or click Max.');
      }

      if (!/^\d+(\.\d+)?$/.test(transferAmountValue)) {
        throw new Error('Invalid number for amount');
      }

      const tokenContract = new ethers.Contract(erc20ContractAddress, ghstABI, provider);
      const decimals = await tokenContract.decimals();
      const transferAmount = ethers.parseUnits(transferAmountValue, decimals);

      args.push(transferAmount);
    }

    const tx = await contract[methodName](...args);
    showToast(`Transaction submitted. Hash: ${tx.hash}`, 'success');
    await tx.wait();
    showToast('Transaction confirmed!', 'success');

    await fetchAndDisplayAavegotchis(userAddress);
    await generateMethodForms();
  } catch (error) {
    console.error(error);
    showToast(`Error: ${error.info?.error?.message || error.message}`, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.innerText = 'Submit';
  }
}

// Function to Get User-Specified Amounts via Popup
async function getUserSpecifiedAmounts(_tokenIds, individualBalances, totalTransferAmount, decimals, tokenContract, aavegotchiNames, tokenSymbol) {
  return new Promise((resolve, reject) => {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    const instruction = document.createElement('p');
    instruction.className = 'instruction';
    instruction.innerText = `Specify Withdrawal Amounts Per Aavegotchi ensuring the total amount equals ${ethers.formatUnits(totalTransferAmount, decimals)} ${tokenSymbol}`;
    modalContent.appendChild(instruction);

    const totalDisplay = document.createElement('div');
    totalDisplay.className = 'total-display incorrect';
    totalDisplay.innerText = `Total Entered: 0.0 ${tokenSymbol}`;
    modalContent.appendChild(totalDisplay);

    const form = document.createElement('form');
    form.className = 'modal-form';

    const amountInputs = [];

    _tokenIds.forEach((tokenId, index) => {
      const balance = individualBalances[index];
      const balanceFormatted = ethers.formatUnits(balance, decimals);
      const name = aavegotchiNames[index] && aavegotchiNames[index].trim() !== '' ? aavegotchiNames[index] : '(No Name)';

      const formGroup = document.createElement('div');
      formGroup.className = 'form-group';

      const label = document.createElement('label');
      label.innerText = `Aavegotchi ID ${tokenId} (${name}) (Balance: ${balanceFormatted} ${tokenSymbol}):`;

      const input = document.createElement('input');
      input.type = 'number';
      input.step = 'any';
      input.min = '0';
      input.max = balanceFormatted;
      input.value = '0';
      input.className = 'input';
      input.dataset.index = index;

      amountInputs.push(input);

      formGroup.appendChild(label);
      formGroup.appendChild(input);
      form.appendChild(formGroup);
    });

    const errorMessage = document.createElement('p');
    errorMessage.className = 'error-message';
    errorMessage.style.color = 'red';
    modalContent.appendChild(errorMessage);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.submitButton.className = 'button submit-button';
    submitButton.innerText = 'Confirm';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'button';
    cancelButton.innerText = 'Cancel';

    buttonContainer.appendChild(submitButton);
    buttonContainer.appendChild(cancelButton);
    form.appendChild(buttonContainer);
    modalContent.appendChild(form);

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    const updateTotal = () => {
      let totalEntered = 0n;
      for (const input of amountInputs) {
        const value = input.value.trim();
        if (/^\d+(\.\d+)?$/.test(value)) {
          const amount = ethers.parseUnits(value, decimals);
          totalEntered += amount;
        }
      }

      const formattedTotal = ethers.formatUnits(totalEntered, decimals);
      totalDisplay.innerText = `Total Entered: ${formattedTotal} ${tokenSymbol}`;

      if (totalEntered === totalTransferAmount) {
        totalDisplay.classList.remove('incorrect');
        totalDisplay.classList.add('correct');
      } else {
        totalDisplay.classList.remove('correct');
        totalDisplay.classList.add('incorrect');
      }
    };

    updateTotal();

    amountInputs.forEach(input => {
      input.addEventListener('input', updateTotal);
      input.addEventListener('blur', () => {
        if (input.value.startsWith('.')) {
          input.value = '0' + input.value;
          updateTotal();
        }
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      let totalEntered = 0n;
      const enteredAmounts = [];

      try {
        _tokenIds.forEach((tokenId, index) => {
          const input = amountInputs[index];
          let value = input.value.trim();
          if (value.startsWith('.')) {
            value = '0' + value;
            input.value = value;
          }

          if (!/^\d+(\.\d+)?$/.test(value)) {
            throw new Error(`Invalid amount entered for Aavegotchi ID ${tokenId}`);
          }

          const amount = ethers.parseUnits(value, decimals);

          if (amount < 0n || amount > individualBalances[index]) {
            throw new Error(`Amount for Aavegotchi ID ${tokenId} exceeds available balance.`);
          }

          enteredAmounts.push(amount);
          totalEntered += amount;
        });

        if (totalEntered !== totalTransferAmount) {
          throw new Error('The total of entered amounts does not equal the total amount to withdraw.');
        }

        document.body.removeChild(modalOverlay);
        resolve(enteredAmounts);
      } catch (error) {
        errorMessage.innerText = error.message;
      }
    });

    cancelButton.addEventListener('click', () => {
      document.body.removeChild(modalOverlay);
      reject(new Error('User cancelled the operation.'));
    });
  });
}

// Function to Toggle Collapse
function toggleCollapse(contentElement, iconElement, expand) {
  if (expand) {
    contentElement.classList.add('expanded');
    iconElement.classList.remove('collapsed');
    iconElement.classList.add('expanded');
    iconElement.innerHTML = '&#9650;';
  } else {
    contentElement.classList.remove('expanded');
    iconElement.classList.remove('expanded');
    iconElement.classList.add('collapsed');
    iconElement.innerHTML = '&#9660;';
  }
}

// Error handling function
function handleError(error) {
  console.error('An error occurred:', error);
  showToast(`Error: ${error.message || 'Unknown error occurred'}`, 'error');
}

// Initial call to generate method forms if the wallet is already connected
window.onload = init;

// Export functions that need to be used in other files
export {
  generateMethodForms,
  handleFormSubmit,
  getUserSpecifiedAmounts,
  toggleCollapse,
  handleError
};

console.log('app.js loaded');