import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import WalletInfo from './components/WalletInfo';
import AavegotchiInfo from './components/AavegotchiInfo';
import MethodForms from './components/MethodForms';
import Toast from './components/Toast';
import useEthers from './hooks/useEthers';
import { ghstContractAddress } from './utils/helpers';

function App() {
  const {
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
  } = useEthers();

  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    setTimeout(() => {
      setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, 3000);
  };

  useEffect(() => {
    if (userAddress) {
      fetchAndDisplayAavegotchis(userAddress);
    }
  }, [userAddress, fetchAndDisplayAavegotchis]);

  return (
    <div className="App">
      <Header
        networkName={networkName}
        userAddress={userAddress}
        connectWallet={connectWallet}
      />
      <main>
        <WalletInfo userAddress={userAddress} />
        <AavegotchiInfo
          ownedAavegotchis={ownedAavegotchis}
          selectedERC20Symbol={selectedERC20Symbol}
          selectedERC20Address={selectedERC20Address || ghstContractAddress}
          updateSelectedERC20Token={updateSelectedERC20Token}
        />
        <MethodForms
          contract={contract}
          ghstContract={ghstContract}
          userAddress={userAddress}
          ownedAavegotchis={ownedAavegotchis}
          selectedERC20Address={selectedERC20Address || ghstContractAddress}
          selectedERC20Symbol={selectedERC20Symbol}
          selectedERC20Decimals={selectedERC20Decimals}
          showToast={showToast}
          fetchAndDisplayAavegotchis={fetchAndDisplayAavegotchis}
        />
      </main>
      <Toast toasts={toasts} />
    </div>
  );
}

export default App;