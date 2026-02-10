import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";

const initialState = {
  bills: [],
  isLoading: false,
  error: null,
};

export const fetchPurchaseBills = createAsyncThunk(
  "purchaseBills/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("purchase-bill", {
        withCredentials: true,
      });
      return res.data.bills || [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch purchase bills",
      );
    }
  },
);

export const createPurchaseBill = createAsyncThunk(
  "purchaseBills/create",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("purchase-bill", payload, {
        withCredentials: true,
      });
      return res.data.bill;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create purchase bill",
      );
    }
  },
);

export const approvePurchaseBill = createAsyncThunk(
  "purchaseBills/approve",
  async (id, { rejectWithValue }) => {
    try {
      console.log("i am called");
      const res = await axiosInstance.patch(
        `purchase-bill/${id}/approve`,
        null,
        {
          withCredentials: true,
        },
      );
      console.log("result");

      return res.data.bill;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to approve purchase bill",
      );
    }
  },
);

export const payPurchaseBill = createAsyncThunk(
  "purchaseBills/pay",
  async (id, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.patch(`purchase-bill/${id}/pay`, null, {
        withCredentials: true,
      });
      return res.data.bill;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to mark bill paid",
      );
    }
  },
);

export const deletePurchaseBill = createAsyncThunk(
  "purchaseBills/delete",
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`purchase-bill/${id}`, {
        withCredentials: true,
      });
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete purchase bill",
      );
    }
  },
);

const purchaseBillSlice = createSlice({
  name: "purchaseBills",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPurchaseBills.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPurchaseBills.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bills = action.payload;
      })
      .addCase(fetchPurchaseBills.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createPurchaseBill.fulfilled, (state, action) => {
        state.bills.unshift(action.payload);
      })
      .addCase(approvePurchaseBill.fulfilled, (state, action) => {
        const idx = state.bills.findIndex((b) => b._id === action.payload._id);
        if (idx !== -1) state.bills[idx] = action.payload;
      })
      .addCase(payPurchaseBill.fulfilled, (state, action) => {
        const idx = state.bills.findIndex((b) => b._id === action.payload._id);
        if (idx !== -1) state.bills[idx] = action.payload;
      })
      .addCase(deletePurchaseBill.fulfilled, (state, action) => {
        state.bills = state.bills.filter((b) => b._id !== action.payload);
      });
  },
});

export default purchaseBillSlice.reducer;
