import React from 'react';
import GotchiBankingServices from './components/GotchiBankingServices';
import { MetaMaskContextProvider } from './hooks/useMetaMask';
import './App.css';

function App() {
  return (
    <MetaMaskContextProvider>
      <div className="App">
        <GotchiBankingServices />
      </div>
    </MetaMaskContextProvider>
  );
}

export default App;
