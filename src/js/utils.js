// utils.js

// Toast Notification Function
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.classList.add('toast');
  toast.classList.add(type === 'success' ? 'toast-success' : 'toast-error');
  toast.innerText = message;

  const closeButton = document.createElement('button');
  closeButton.classList.add('toast-close');
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', () => {
    toastContainer.removeChild(toast);
  });

  toast.appendChild(closeButton);
  toastContainer.appendChild(toast);

  // Automatically remove the toast after 3 seconds
  setTimeout(() => {
    if (toastContainer.contains(toast)) {
      toastContainer.removeChild(toast);
    }
  }, 3000);
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Memoized getTokenImageUrl function
const memoizedGetTokenImageUrl = (() => {
  const cache = new Map();
  return async (tokenAddress) => {
    if (cache.has(tokenAddress)) {
      return cache.get(tokenAddress);
    }
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/polygon-pos/contract/${tokenAddress}`);
      if (!response.ok) throw new Error('Failed to fetch token data');
      const data = await response.json();
      const imageUrl = data.image.small;
      cache.set(tokenAddress, imageUrl);
      return imageUrl;
    } catch (error) {
      console.error('Error fetching token image:', error);
      return 'path/to/default/token/image.png'; // Use a default image path
    }
  };
})();

// Function to Capitalize First Letter
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

console.log('utils.js loaded');