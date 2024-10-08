import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { contractAddress, ghstContractAddress, combinedABI, ghstABI } from '../utils/helpers';

function useEthers() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [ghstContract, setGhstContract] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [networkName, setNetworkName] = useState(null);
  const [ownedAavegotchis, setOwnedAavegotchis] = useState([]);
  const [selectedERC20Address, setSelectedERC20Address] = useState(ghstContractAddress);
  const [selectedERC20Symbol, setSelectedERC20Symbol] = useState('GHST');
  const [selectedERC20Decimals, setSelectedERC20Decimals] = useState(18);

  const connectWallet = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask is not installed. Please install MetaMask to use this DApp.');
      return;
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      const newSigner = await newProvider.getSigner();
      const address = await newSigner.getAddress();
      setUserAddress(address);

      const newContract = new ethers.Contract(contractAddress, combinedABI, newSigner);
      const newGhstContract = new ethers.Contract(ghstContractAddress, ghstABI, newProvider);

      const network = await newProvider.getNetwork();
      let networkName = 'Unknown';
      if (network.chainId === 137n) {
        networkName = 'Polygon';
      } else if (network.chainId === 1n) {
        networkName = 'Ethereum';
      } else if (network.chainId === 80001n) {
        networkName = 'Mumbai';
      } else {
        networkName = network.name.charAt(0).toUpperCase() + network.name.slice(1);
      }
      setNetworkName(networkName);

      if (network.chainId !== 137n) {
        alert('Please switch to the Polygon network in MetaMask.');
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x89' }],
          });
          window.location.reload();
          return;
        } catch (switchError) {
          if (switchError.code === 4902) {
            alert('The Polygon network is not available in your MetaMask. Please add it manually.');
          } else {
            alert('Failed to switch to the Polygon network. Please switch manually in MetaMask.');
          }
          return;
        }
      }

      setProvider(newProvider);
      setSigner(newSigner);
      setContract(newContract);
      setGhstContract(newGhstContract);

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Fetch Aavegotchis after successful connection
      await fetchAndDisplayAavegotchis(address);

    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. See console for details.');
    }
  }, []);

  const handleAccountsChanged = useCallback((accounts) => {
    if (accounts.length === 0) {
      setUserAddress(null);
      setNetworkName('Not Connected');
      setContract(null);
      setGhstContract(null);
      setOwnedAavegotchis([]);
    } else {
      window.location.reload();
    }
  }, []);

  const handleChainChanged = useCallback(() => {
    window.location.reload();
  }, []);

  const fetchAndDisplayAavegotchis = useCallback(async (address) => {
    if (!contract || !provider) return;

    try {
      const aavegotchis = await contract.allAavegotchisOfOwner(address);
      const tokenContract = new ethers.Contract(selectedERC20Address, ghstABI, provider);

      const gotchisWithBalances = await Promise.all(aavegotchis.map(async (gotchi) => {
        const balance = await tokenContract.balanceOf(gotchi.escrow);
        const isLent = await contract.isAavegotchiLent(gotchi.tokenId);
        return { ...gotchi, balance, lending: isLent };
      }));

      setOwnedAavegotchis(gotchisWithBalances);
    } catch (error) {
      console.error('Error fetching Aavegotchis:', error);
    }
  }, [contract, provider, selectedERC20Address]);

  const updateSelectedERC20Token = useCallback(async (address) => {
    if (!ethers.isAddress(address)) {
      alert('Invalid ERC20 contract address.');
      return;
    }

    try {
      const tokenContract = new ethers.Contract(address, ghstABI, provider);
      const symbol = await tokenContract.symbol();
      const decimals = await tokenContract.decimals();

      setSelectedERC20Address(address);
      setSelectedERC20Symbol(symbol);
      setSelectedERC20Decimals(decimals);

      if (userAddress) {
        await fetchAndDisplayAavegotchis(userAddress);
      }
    } catch (error) {
      console.error('Error fetching ERC20 token details:', error);
      alert('Failed to fetch ERC20 token details. Ensure the address is correct and the token follows the ERC20 standard.');
    }
  }, [provider, fetchAndDisplayAavegotchis, userAddress]);

  useEffect(() => {
    if (window.ethereum && window.ethereum.selectedAddress) {
      connectWallet();
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [connectWallet, handleAccountsChanged, handleChainChanged]);

  return {
    userAddress,
    networkName,
    contract,
    ghstContract,
    connectWallet,
    ownedAavegotchis,
    fetchAndDisplayAavegotchis,
    selectedERC20Address,
    selectedERC20Symbol,
    selectedERC20Decimals,
    updateSelectedERC20Token,
  };
}

export default useEthers;