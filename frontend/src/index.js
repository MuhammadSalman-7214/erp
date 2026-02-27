import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Provider } from "react-redux";
import store from "./store/store";

const detectBrowserEngine = () => {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  const isSafari =
    /Safari/.test(ua) && !/Chrome|CriOS|Edg|OPR|Firefox/.test(ua);
  const isChromium = /Chrome|CriOS|Edg|OPR/.test(ua);
  if (isSafari) return "safari";
  if (isChromium) return "chromium";
  return "other";
};

document.documentElement.setAttribute(
  "data-browser-engine",
  detectBrowserEngine(),
);


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    
      <Provider store={store}>
    <App />
    </Provider>
  
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
