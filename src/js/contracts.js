// contracts.js

// We're assuming ethers is loaded globally via a script tag in the HTML file
// If you're using a bundler like webpack, you would import ethers differently

// Contract Information
const contractAddress = '0x86935F11C86623deC8a25696E1C19a8659CbF95d';
const ghstContractAddress = '0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7';

let contract;
let ghstContract;
let ghstABI;
let combinedABI;

// Predefined ERC20 Tokens
const predefinedTokens = [
  {
    name: 'GHST',
    address: ghstContractAddress,
  },
  // Add more predefined tokens here if needed
];

// Global Variables for Selected ERC20 Token
let selectedERC20Address = ghstContractAddress;
let selectedERC20Symbol = 'GHST';
let selectedERC20Decimals = 18;

// We'll use fetch to load the JSON files
async function loadABI(url) {
  const response = await fetch(url);
  return response.json();
}

// Function to Initialize Contracts
async function initializeContracts() {
  try {
    // Load ABIs
    ghstABI = await loadABI('./src/js/abis/ghstABI.json');
    combinedABI = await loadABI('./src/js/abis/combinedABI.json');

    contract = new ethers.Contract(contractAddress, combinedABI, window.signer);
    ghstContract = new ethers.Contract(ghstContractAddress, ghstABI, window.provider);
    showToast('Contracts initialized successfully.', 'success');
  } catch (error) {
    showToast('Failed to initialize contracts.', 'error');
    console.error('Contract Initialization Error:', error);
    throw error;
  }
}

// Function to Update Selected ERC20 Token
async function updateSelectedERC20Token(address) {
  if (!ethers.isAddress(address)) {
    showToast('Invalid ERC20 contract address.', 'error');
    return;
  }

  try {
    const tokenContract = new ethers.Contract(address, ghstABI, window.provider);
    selectedERC20Symbol = await tokenContract.symbol();
    selectedERC20Decimals = await tokenContract.decimals();
    selectedERC20Address = address;

    updateTableHeader();
    await refreshTableBalances();
  } catch (error) {
    console.error('Error fetching ERC20 token details:', error);
    showToast('Failed to fetch ERC20 token details. Ensure the address is correct and the token follows the ERC20 standard.', 'error');
  }
}

// Function to validate and format ERC20 address input
function validateAndFormatERC20Address(input) {
  const address = input.trim();
  if (ethers.isAddress(address)) {
    return ethers.getAddress(address); // This returns the checksum address
  }
  return null;
}

// Export the functions and variables that need to be used in other files
export {
  initializeContracts,
  contract,
  ghstContract,
  ghstABI,
  combinedABI,
  predefinedTokens,
  selectedERC20Address,
  selectedERC20Symbol,
  selectedERC20Decimals,
  updateSelectedERC20Token,
  validateAndFormatERC20Address
};

console.log('contracts.js loaded');