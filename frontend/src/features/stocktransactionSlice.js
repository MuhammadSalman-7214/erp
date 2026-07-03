import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";
import { uppercasePayload } from "../lib/uppercasePayload";

const initialState = {
  getallStocks: [],
  pagination: { page: 1, pageSize: 5, totalItems: 0, totalPages: 1 },
  isgetallStocks: false,
  iscreatedStocks: false,
  searchdata: [],
  products: [],
};

export const createStockTransaction = createAsyncThunk(
  "stocktransaction/createStockTransaction",
  async (Stocks, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "stocktransaction",
        uppercasePayload(Stocks, { excludeKeys: ["type"] }),
        {
          withCredentials: true,
        },
      );
      return response.data.transaction; // backend returns { transaction }
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Stocks creation failed",
      );
    }
  },
);

export const getAllStockTransactions = createAsyncThunk(
  "stocktransaction/getallStockTransaction",
  async (
    { page = 1, pageSize = 5, sortDir = "asc" } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await axiosInstance.get("stocktransaction", {
        params: { page, pageSize, sortDir },
        withCredentials: true,
      });

      return response.data; // now { success, transactions, pagination }
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Stock retrieval failed",
      );
    }
  },
);

export const searchstockdata = createAsyncThunk(
  "stocktransaction/searchstocks",
  async (query, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `stocktransaction/searchstocks?query=${query}`,
        { withCredentials: true },
      );
      return response.data.transactions; // backend returns { transactions }
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Stock search failed",
      );
    }
  },
);

const stocktransactionSlice = createSlice({
  name: "stocktransaction",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getAllStockTransactions.pending, (state) => {
        state.isgetallStocks = true;
      })
      .addCase(getAllStockTransactions.fulfilled, (state, action) => {
        state.isgetallStocks = false;
        state.getallStocks = action.payload.transactions || [];
        state.pagination = action.payload.pagination || state.pagination;
      })
      .addCase(getAllStockTransactions.rejected, (state) => {
        state.isgetallStocks = false;
      })
      .addCase(createStockTransaction.pending, (state) => {
        state.iscreatedStocks = true;
      })
      .addCase(createStockTransaction.fulfilled, (state, action) => {
        state.iscreatedStocks = false;

        // Add transaction to top
        state.getallStocks.unshift(action.payload);
      })
      .addCase(createStockTransaction.rejected, (state) => {
        state.iscreatedStocks = false;
      })
      .addCase(searchstockdata.fulfilled, (state, action) => {
        state.searchdata = action.payload;
      })
      .addCase(searchstockdata.rejected, (state) => {});
  },
});

export default stocktransactionSlice.reducer;
