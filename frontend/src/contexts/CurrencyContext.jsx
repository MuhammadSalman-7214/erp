import { createContext, useContext, useEffect, useState } from "react";
import { useSelector } from "react-redux";

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const [currency, setCurrency] = useState({
    code: "USD",
    symbol: "$",
    exchangeRate: 1,
  });

  useEffect(() => {
    if (user?.country) {
      setCurrency({
        code: user.country.currency || "USD",
        symbol: user.country.currencySymbol || "$",
        exchangeRate: user.country.exchangeRate || 1,
      });
    }
  }, [user]);

  const formatAmount = (amount, inUSD = false) => {
    if (inUSD) {
      return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    }
    const localAmount = amount * currency.exchangeRate;
    return `${currency.symbol}${localAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
    })}`;
  };

  const convertToUSD = (localAmount) => {
    return localAmount / currency.exchangeRate;
  };

  return (
    <CurrencyContext.Provider value={{ currency, formatAmount, convertToUSD }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
