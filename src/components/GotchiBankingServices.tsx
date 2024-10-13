import React, { useState, useEffect, useCallback, ChangeEvent, useMemo } from 'react';
import { ethers } from 'ethers';
import TopSection from './TopSection';
import WithdrawalForm, { Aavegotchi, WithdrawalFormProps } from './WithdrawalForm';
import { CONTRACT_ADDRESS, GHST_CONTRACT_ADDRESS, DIAMOND_ABI, ERC20_ABI } from './constants';
import styles from './GotchiBankingServices.module.css';

const POLYGON_CHAIN_ID = 137; // Polygon Mainnet

type TokenImageMap = {
  [key: string]: string;
};

const GotchiBankingServices: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [aavegotchis, setAavegotchis] = useState<Aavegotchi[]>([]);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [customTokenSymbol, setCustomTokenSymbol] = useState<string>('GHST');
  const [isCustomToken, setIsCustomToken] = useState(false);
  const [customTokenAddress, setCustomTokenAddress] = useState('');
  const [tokenImage, setTokenImage] = useState('/images/default-token.png');
  const [currentTokenSymbol, setCurrentTokenSymbol] = useState('GHST');
  const [customTokenBalances, setCustomTokenBalances] = useState<{[key: string]: string}>({});

  const tokenImageMap: TokenImageMap = useMemo(() => ({
    'GHST': 'https://coin-images.coingecko.com/coins/images/12467/small/GHST.png',
    'GLTR': 'https://coin-images.coingecko.com/coins/images/25790/small/gltr-token.png'
    // Add more token mappings as needed
  }), []);

  const fetchTokenImage = useCallback((tokenSymbol: string) => {
    const upperCaseSymbol = tokenSymbol.toUpperCase();
    if (upperCaseSymbol in tokenImageMap) {
      setTokenImage(tokenImageMap[upperCaseSymbol]);
    } else {
      setTokenImage('/images/default-token.png');
    }
    setCurrentTokenSymbol(upperCaseSymbol);
  }, [tokenImageMap]);

  // Call fetchTokenImage when the component mounts to set the initial GHST image
  useEffect(() => {
    fetchTokenImage('GHST');
  }, [fetchTokenImage]);

  const checkConnection = useCallback(async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        setIsCorrectNetwork(network.chainId === BigInt(POLYGON_CHAIN_ID));

        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setAccount(address);
          setSigner(signer);
          const contract = new ethers.Contract(CONTRACT_ADDRESS, DIAMOND_ABI, signer);
          setContract(contract);
          fetchAavegotchis(address, contract);
        } else {
          setAccount(null);
          setSigner(null);
          setContract(null);
          setAavegotchis([]);
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  }, []);

  useEffect(() => {
    checkConnection();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', checkConnection);
      window.ethereum.on('chainChanged', checkConnection);
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', checkConnection);
        window.ethereum.removeListener('chainChanged', checkConnection);
      }
    };
  }, [checkConnection]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        checkConnection();
      } catch (error) {
        console.error('Error connecting wallet:', error);
      }
    } else {
      alert('Please install MetaMask or another Ethereum wallet to use this dApp.');
    }
  };

  const switchToPolygon = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${POLYGON_CHAIN_ID.toString(16)}` }],
        });
      } catch (error: any) {
        if (error.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${POLYGON_CHAIN_ID.toString(16)}`,
                chainName: 'Polygon Mainnet',
                nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                rpcUrls: ['https://polygon-rpc.com/'],
                blockExplorerUrls: ['https://polygonscan.com/'],
              }],
            });
          } catch (addError) {
            console.error('Error adding Polygon network:', addError);
          }
        } else {
          console.error('Error switching to Polygon network:', error);
        }
      }
    }
  };

  const fetchAavegotchis = async (address: string, contract: ethers.Contract) => {
    try {
      console.log('Fetching Aavegotchis for address:', address);
      
      const balance = await contract.balanceOf(address);
      console.log('Balance:', balance.toString());

      const tokenIds = [];
      for (let i = 0; i < balance; i++) {
        const tokenId = await contract.tokenOfOwnerByIndex(address, i);
        console.log(`Token ID ${i}:`, tokenId.toString());
        tokenIds.push(tokenId.toString());
      }

      const provider = contract.runner as ethers.Provider;
      const ghstContract = new ethers.Contract(GHST_CONTRACT_ADDRESS, ERC20_ABI, provider);
      const decimals = await ghstContract.decimals();

      const aavegotchisData = await Promise.all(tokenIds.map(async (tokenId) => {
        const aavegotchiInfo = await contract.getAavegotchi(tokenId);
        const escrowAddress = aavegotchiInfo.escrow;
        const escrowBalance = await ghstContract.balanceOf(escrowAddress);
        const isLent = await contract.isAavegotchiLent(tokenId);
        
        return {
          tokenId: tokenId,
          name: aavegotchiInfo.name,
          escrowWallet: escrowAddress,
          ghstBalance: ethers.formatUnits(escrowBalance, decimals),
          isLent: isLent
        };
      }));


      console.log('Processed Aavegotchi Data:', aavegotchisData);
      setAavegotchis(aavegotchisData);
    } catch (error) {
      console.error('Error fetching Aavegotchis:', error);
      console.error('Contract:', contract);
      console.error('Address:', address);
    }
  };

  const handleCustomTokenChange = useCallback(async (tokenAddress: string) => {
    if (!contract || !signer || !tokenAddress) {
      return;
    }

    try {
      console.log('Creating token contract instance for address:', tokenAddress);
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      
      console.log('Fetching token symbol...');
      let symbol: string;
      try {
        symbol = await tokenContract.symbol();
      } catch (error) {
        console.warn('Failed to fetch symbol, using address as symbol', error);
        symbol = tokenAddress.slice(0, 6) + '...';
      }
      setCustomTokenSymbol(symbol);
      fetchTokenImage(symbol);

      console.log('Fetching token decimals...');
      let decimals: number;
      try {
        decimals = await tokenContract.decimals();
      } catch (error) {
        console.warn('Failed to fetch decimals, using 18 as default', error);
        decimals = 18;
      }

      console.log('Updating Aavegotchi balances...');
      const newCustomTokenBalances: {[key: string]: string} = {};
      await Promise.all(aavegotchis.map(async (gotchi) => {
        let balance: ethers.BigNumberish;
        try {
          balance = await tokenContract.balanceOf(gotchi.escrowWallet);
          newCustomTokenBalances[gotchi.tokenId] = ethers.formatUnits(balance, decimals);
        } catch (error) {
          console.warn(`Failed to fetch balance for Aavegotchi ${gotchi.tokenId}`, error);
          newCustomTokenBalances[gotchi.tokenId] = '0';
        }
      }));

      setCustomTokenBalances(newCustomTokenBalances);
      setIsCustomToken(true);

    } catch (error) {
      console.error('Error fetching custom token balances:', error);
      setCustomTokenSymbol('');
      setTokenImage('/images/default-token.png');
      setIsCustomToken(false);
    }
  }, [contract, signer, aavegotchis, fetchTokenImage]);

  const handleWithdraw = useCallback(async (tokenAddress: string, selectedGotchis: string[], amount: string) => {
    if (!contract || !signer) {
      console.error('Contract or signer not initialized');
      return;
    }

    try {
      // Refresh Aavegotchi data after withdrawal
      await fetchAavegotchis(await signer.getAddress(), contract);
      console.log(`Withdrawn ${amount} of token ${tokenAddress} from Aavegotchis:`, selectedGotchis);
    } catch (error) {
      console.error('Error during withdrawal:', error);
    }
  }, [contract, signer]);

  const handleTokenSelection = useCallback((tokenOption: string) => {
    if (tokenOption === 'GHST') {
      setIsCustomToken(false);
      fetchTokenImage('GHST');
      setCustomTokenSymbol('GHST');
    } else if (tokenOption === 'custom') {
      setIsCustomToken(true);
      // Don't change the image or symbol yet
      // Just reset the custom token address if needed
      setCustomTokenAddress('');
    }
  }, [fetchTokenImage]);

  const withdrawalFormProps: WithdrawalFormProps = {
    aavegotchis,
    onWithdraw: handleWithdraw,
    onCustomTokenChange: handleCustomTokenChange,
    signer,
    onTokenSelection: handleTokenSelection
  };

  // Update this useEffect to handle both GHST and custom token balances
  useEffect(() => {
    if (contract && signer) {
      const fetchBalances = async () => {
        const updatedAavegotchis = await Promise.all(aavegotchis.map(async (gotchi) => {
          let ghstBalance: string;
          try {
            const balance = await contract.balanceOf(gotchi.escrowWallet);
            ghstBalance = ethers.formatEther(balance);
          } catch (error) {
            console.warn(`Failed to fetch GHST balance for Aavegotchi ${gotchi.tokenId}`, error);
            ghstBalance = '0';
          }
          return {
            ...gotchi,
            ghstBalance,
            customTokenBalance: customTokenBalances[gotchi.tokenId] || '0'
          };
        }));
        setAavegotchis(updatedAavegotchis);
      };

      fetchBalances();
    }
  }, [contract, signer, customTokenBalances]);

  if (!account) {
    return (
      <div className={styles.container}>
        <h1>Gotchi Banking Services</h1>
        <p>Contract: {CONTRACT_ADDRESS}</p>
        <button onClick={connectWallet}>Connect Wallet</button>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className={styles.container}>
        <h1>Gotchi Banking Services</h1>
        <p>Please switch to the Polygon network to use this dApp.</p>
        <button onClick={switchToPolygon}>Switch to Polygon</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <TopSection
        contractAddress={CONTRACT_ADDRESS}
        network="Polygon"
        walletAddress={account}
        onConnectWallet={connectWallet}
        aavegotchis={aavegotchis}
        customTokenSymbol={isCustomToken ? customTokenSymbol : 'GHST'}
        isCustomToken={isCustomToken}
        tokenImage={tokenImage}
      />
      <WithdrawalForm 
        {...withdrawalFormProps} 
        onTokenSelection={handleTokenSelection}
        onCustomTokenChange={handleCustomTokenChange}
      />
    </div>
  );
};

export default GotchiBankingServices;
