import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";

const initialState = {
  getallStocks: [],
  isgetallStocks: false,
  iscreatedStocks: false,
  searchdata: [],
};

export const createStockTransaction = createAsyncThunk(
  "stocktransaction/createStockTransaction",
  async (Stocks, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("stocktransaction", Stocks, {
        withCredentials: true,
      });
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
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("stocktransaction", {
        withCredentials: true,
      });

      return response.data.transactions; // backend returns { transactions }
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
        state.getallStocks = action.payload;
      })
      .addCase(getAllStockTransactions.rejected, (state) => {
        state.isgetallStocks = false;
      })

      .addCase(createStockTransaction.pending, (state) => {
        state.iscreatedStocks = true;
      })
      .addCase(createStockTransaction.fulfilled, (state, action) => {
        state.iscreatedStocks = false;
        state.getallStocks.unshift(action.payload); // add new stock to top
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
