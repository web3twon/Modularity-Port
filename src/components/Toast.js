import React from 'react';

function Toast({ toasts }) {
  return (
    <div id="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.message}
          <button className="toast-close">&times;</button>
        </div>
      ))}
    </div>
  );
}

export default Toast;