// wallet.js

let provider;
let signer;
let userAddress;

// Function to Connect Wallet
async function connectWallet() {
  if (typeof window.ethereum === 'undefined') {
    showToast('MetaMask is not installed. Please install MetaMask to use this DApp.', 'error');
    return;
  }

  try {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    const shortAddress = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;

    walletInfo.innerHTML = `
      <p>Connected Wallet Address: 
        <a href="https://polygonscan.com/address/${userAddress}" target="_blank" rel="noopener noreferrer" class="address-link" title="${userAddress}">
          ${shortAddress}
        </a>
      </p>
    `;

    const network = await provider.getNetwork();
    let networkName = getNetworkName(network.chainId);
    networkNameDisplay.innerText = networkName;

    if (network.chainId !== 137n) {
      await switchToPolygonNetwork();
      return;
    }

    await initializeContracts();
    await fetchAndDisplayAavegotchis(userAddress);
    await generateMethodForms();

    connectWalletButton.innerText = `Connected: ${shortAddress}`;

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    initializeCopyButtons();
  } catch (error) {
    console.error('Error connecting wallet:', error);
    showToast('Failed to connect wallet. See console for details.', 'error');
  }
}

// Function to get network name
function getNetworkName(chainId) {
  switch (chainId) {
    case 137n: return 'Polygon';
    case 1n: return 'Ethereum';
    case 80001n: return 'Mumbai';
    default: return capitalizeFirstLetter(network.name);
  }
}

// Function to switch to Polygon network
async function switchToPolygonNetwork() {
  showToast('Please switch to the Polygon network in MetaMask.', 'error');
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x89' }], // '0x89' is 137 in hexadecimal
    });
    window.location.reload();
  } catch (switchError) {
    if (switchError.code === 4902) {
      showToast('The Polygon network is not available in your MetaMask. Please add it manually.', 'error');
    } else {
      showToast('Failed to switch to the Polygon network. Please switch manually in MetaMask.', 'error');
    }
  }
}

// Handle Account Changes
function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    resetWalletConnection();
  } else {
    window.location.reload();
  }
}

// Handle Network Changes
function handleChainChanged(_chainId) {
  window.location.reload();
}

// Reset wallet connection
function resetWalletConnection() {
  walletInfo.innerHTML = '<p>Connected Wallet Address: Not connected</p>';
  networkNameDisplay.innerText = 'Not Connected';
  connectWalletButton.innerText = 'Connect Wallet';
  contract = null;
  ghstContract = null;
  methodFormsContainer.innerHTML = '';
  aavegotchiInfoContainer.innerHTML = '';
  cleanupEventListeners();
}

// Clean up event listeners
function cleanupEventListeners() {
  if (window.ethereum) {
    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    window.ethereum.removeListener('chainChanged', handleChainChanged);
  }
}

// Function to Capitalize First Letter
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

console.log('wallet.js loaded');