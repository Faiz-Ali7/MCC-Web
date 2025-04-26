import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { CummulativeProvider } from './context/CummulativeDataContext.jsx';
import { BrowserRouter } from 'react-router-dom';

function Main() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <BrowserRouter>
      <CummulativeProvider refreshTrigger={refreshTrigger}>
        <App setRefreshTrigger={setRefreshTrigger} />
      </CummulativeProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>
);
