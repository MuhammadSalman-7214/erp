import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";

const initialState = {
  entries: [],
  balance: 0,
  outstanding: [],
  isLoading: false,
  error: null,
};

export const fetchLedger = createAsyncThunk(
  "ledger/fetch",
  async ({ partyType, partyId }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(`ledger/${partyType}/${partyId}`, {
        withCredentials: true,
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch ledger",
      );
    }
  },
);

export const fetchOutstanding = createAsyncThunk(
  "ledger/outstanding",
  async (partyType, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(`ledger/outstanding/${partyType}`, {
        withCredentials: true,
      });
      return res.data.data || [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch outstanding",
      );
    }
  },
);

const ledgerSlice = createSlice({
  name: "ledger",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLedger.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLedger.fulfilled, (state, action) => {
        state.isLoading = false;
        state.entries = action.payload.entries || [];
        state.balance = action.payload.balance || 0;
      })
      .addCase(fetchLedger.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchOutstanding.fulfilled, (state, action) => {
        state.outstanding = action.payload || [];
      });
  },
});

export default ledgerSlice.reducer;
