import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";

const initialState = {
  customers: [],
  isLoading: false,
  error: null,
};

export const fetchCustomers = createAsyncThunk(
  "customers/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("customer", {
        withCredentials: true,
      });
      return res.data.customers || [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch customers",
      );
    }
  },
);

export const createCustomer = createAsyncThunk(
  "customers/create",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("customer", payload, {
        withCredentials: true,
      });
      return res.data.customer;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create customer",
      );
    }
  },
);

export const updateCustomer = createAsyncThunk(
  "customers/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.put(`customer/${id}`, payload, {
        withCredentials: true,
      });
      return res.data.customer;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update customer",
      );
    }
  },
);

export const deleteCustomer = createAsyncThunk(
  "customers/delete",
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`customer/${id}`, { withCredentials: true });
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete customer",
      );
    }
  },
);

const customerSlice = createSlice({
  name: "customers",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customers = action.payload;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.customers.unshift(action.payload);
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        const idx = state.customers.findIndex(
          (c) => c._id === action.payload._id,
        );
        if (idx !== -1) state.customers[idx] = action.payload;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.customers = state.customers.filter(
          (c) => c._id !== action.payload,
        );
      });
  },
});

export default customerSlice.reducer;
