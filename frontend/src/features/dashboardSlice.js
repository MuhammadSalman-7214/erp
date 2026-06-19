import { createSlice } from "@reduxjs/toolkit";

const storageKey = "dashboardShowFinancialAmounts";

const readStoredShowFinancialAmounts = () => {
  try {
    const storedValue = localStorage.getItem(storageKey);
    if (storedValue === null) return true;
    return JSON.parse(storedValue);
  } catch {
    return true;
  }
};

const initialState = {
  showFinancialAmounts: readStoredShowFinancialAmounts(),
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    setShowFinancialAmounts(state, action) {
      state.showFinancialAmounts = Boolean(action.payload);
    },
  },
});

export const { setShowFinancialAmounts } = dashboardSlice.actions;
export default dashboardSlice.reducer;
export { storageKey as dashboardShowFinancialAmountsStorageKey };
