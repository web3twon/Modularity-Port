import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getFacetMethods, predefinedTokens } from '../utils/helpers';

function MethodForms({
  contract,
  ghstContract,
  userAddress,
  ownedAavegotchis,
  selectedERC20Address,
  selectedERC20Symbol,
  selectedERC20Decimals,
  showToast,
  fetchAndDisplayAavegotchis
}) {
  const [facetMethods, setFacetMethods] = useState({});
  const [formData, setFormData] = useState({});
  const [maxValue, setMaxValue] = useState('0');

  useEffect(() => {
    setFacetMethods(getFacetMethods('EscrowFacet'));
  }, []);

  useEffect(() => {
    updateMaxButton();
  }, [selectedERC20Address, formData._tokenId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const updateMaxButton = async () => {
    if (!selectedERC20Address || !ethers.isAddress(selectedERC20Address)) return;

    const tokenIdValue = formData._tokenId;
    if (!tokenIdValue) return;

    try {
      let totalBalance = 0n;
      const tokenContract = new ethers.Contract(selectedERC20Address, ghstContract.interface, ghstContract.provider);

      if (tokenIdValue === 'all') {
        const balancePromises = ownedAavegotchis.map(async (gotchi) => {
          const escrowWallet = gotchi.escrow;
          const balance = await tokenContract.balanceOf(escrowWallet);
          return balance;
        });

        const balances = await Promise.all(balancePromises);
        totalBalance = balances.reduce((acc, balance) => acc + balance, 0n);
      } else {
        const gotchi = ownedAavegotchis.find((g) => g.tokenId && g.tokenId.toString() === tokenIdValue);
        if (gotchi) {
          totalBalance = await tokenContract.balanceOf(gotchi.escrow);
        }
      }

      setMaxValue(totalBalance.toString());
    } catch (error) {
      console.error('Error fetching token balance:', error);
      showToast('Error fetching token balance.', 'error');
    }
  };

  const handleMaxButtonClick = () => {
    setFormData(prev => ({ ...prev, _transferAmount: ethers.formatUnits(maxValue, selectedERC20Decimals) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const methodName = e.target.getAttribute('data-method');
    const method = facetMethods[methodName];

    try {
      let args = [];
      for (const input of method.inputs) {
        let value = formData[input.name];

        if (input.type === 'uint256') {
          value = ethers.parseUnits(value, selectedERC20Decimals);
        } else if (input.type.endsWith('[]')) {
          value = value.split(',').map(v => v.trim());
          if (input.type.startsWith('uint')) {
            value = value.map(v => ethers.parseUnits(v, selectedERC20Decimals));
          }
        }

        args.push(value);
      }

      const tx = await contract[methodName](...args);
      showToast(`Transaction submitted. Hash: ${tx.hash}`, 'success');
      await tx.wait();
      showToast('Transaction confirmed!', 'success');

      await fetchAndDisplayAavegotchis(userAddress);
    } catch (error) {
      console.error(error);
      showToast(`Error: ${error.message}`, 'error');
    }
  };

  return (
    <div id="method-forms">
      {Object.entries(facetMethods).map(([methodName, method]) => (
        <div key={methodName} className="form-container">
          <h3>{methodName}</h3>
          <form onSubmit={handleSubmit} data-method={methodName}>
            {method.inputs.map((input) => (
              <div key={input.name} className="form-group">
                <label htmlFor={input.name}>{`${input.name} (${input.type}):`}</label>
                {input.name === '_tokenId' ? (
                  <select
                    id={input.name}
                    name={input.name}
                    value={formData[input.name] || ''}
                    onChange={handleInputChange}
                    className="select"
                  >
                    <option value="">Select an Aavegotchi</option>
                    {ownedAavegotchis && ownedAavegotchis.length > 1 && <option value="all">All Owned Aavegotchis</option>}
                    {ownedAavegotchis && ownedAavegotchis.map((gotchi, index) => (
                      <option key={gotchi.tokenId ? gotchi.tokenId.toString() : `unknown-${index}`} value={gotchi.tokenId ? gotchi.tokenId.toString() : ''}>
                        {`Aavegotchi ID ${gotchi.tokenId ? gotchi.tokenId.toString() : 'unknown'} (${gotchi.name || 'No Name'})`}
                      </option>
                    ))}
                  </select>
                ) : input.name === '_erc20Contract' ? (
                  <>
                    <select
                      id={input.name}
                      name={input.name}
                      value={formData[input.name] || ''}
                      onChange={handleInputChange}
                      className="select"
                    >
                      {predefinedTokens.map((token) => (
                        <option key={token.address} value={token.address}>
                          {token.name}
                        </option>
                      ))}
                      <option value="custom">Add Your Own Token</option>
                    </select>
                    {formData[input.name] === 'custom' && (
                      <input
                        type="text"
                        id="custom-erc20-address"
                        name="custom-erc20-address"
                        placeholder="0x..."
                        value={formData['custom-erc20-address'] || ''}
                        onChange={handleInputChange}
                        className="input"
                      />
                    )}
                  </>
                ) : (
                  <div className="input-wrapper">
                    <input
                      type={input.type.startsWith('uint') ? 'number' : 'text'}
                      id={input.name}
                      name={input.name}
                      value={formData[input.name] || ''}
                      onChange={handleInputChange}
                      className="input"
                    />
                    {input.name === '_transferAmount' && (
                      <button type="button" className="max-button" onClick={handleMaxButtonClick}>
                        Max
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            <button type="submit" className="button submit-button">Submit</button>
          </form>
        </div>
      ))}
    </div>
  );
}

export default MethodForms;