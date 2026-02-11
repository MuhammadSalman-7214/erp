import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";

const initialState = {
  getAllCustomer: null,
  isAllCustomer: false,
  isCustomerAdd: false,
  isCustomerRemove: false,
  searchData: null,
  editedCustomer: null,
};

export const createCustomer = createAsyncThunk(
  "customer/create",
  async (customer, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("customer", customer, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Customer creation failed",
      );
    }
  },
);

export const getAllCustomers = createAsyncThunk(
  "customer/getAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("customer", {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Customer retrieval failed",
      );
    }
  },
);

export const removeCustomer = createAsyncThunk(
  "customer/delete",
  async (customerId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`customer/${customerId}`, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Customer remove failed",
      );
    }
  },
);

export const searchCustomer = createAsyncThunk(
  "customer/search",
  async (query, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `customer/searchCustomer?query=${query}`,
        { withCredentials: true },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Customer search failed",
      );
    }
  },
);

export const editCustomer = createAsyncThunk(
  "customer/update",
  async ({ customerId, updatedData }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(
        `customer/${customerId}`,
        updatedData,
        { withCredentials: true },
      );
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to update customer";
      toast.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  },
);

const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createCustomer.pending, (state) => {
        state.isCustomerAdd = true;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.isCustomerAdd = false;
        if (state.getAllCustomer) {
          state.getAllCustomer.unshift(action.payload.customer);
        }
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.isCustomerAdd = false;
        toast.error(action.payload || "Error creating customer");
      })
      .addCase(getAllCustomers.pending, (state) => {
        state.isAllCustomer = true;
      })
      .addCase(getAllCustomers.fulfilled, (state, action) => {
        state.isAllCustomer = false;
        state.getAllCustomer = action.payload || [];
      })
      .addCase(getAllCustomers.rejected, (state, action) => {
        state.isAllCustomer = false;
        toast.error(action.payload || "Error retrieving customers");
      })
      .addCase(removeCustomer.pending, (state) => {
        state.isCustomerRemove = true;
      })
      .addCase(removeCustomer.fulfilled, (state, action) => {
        state.isCustomerRemove = false;
        state.getAllCustomer = state.getAllCustomer?.filter(
          (customer) => customer._id !== action.meta.arg,
        );
      })
      .addCase(removeCustomer.rejected, (state, action) => {
        state.isCustomerRemove = false;
        toast.error(action.payload || "Error removing customer");
      })
      .addCase(searchCustomer.fulfilled, (state, action) => {
        state.searchData = action.payload.customers || [];
      })
      .addCase(editCustomer.fulfilled, (state, action) => {
        state.editedCustomer = action.payload.customer;
        const index = state.getAllCustomer?.findIndex(
          (customer) => customer._id === action.payload.customer._id,
        );
        if (index !== undefined && index > -1) {
          state.getAllCustomer[index] = action.payload.customer;
        }
      });
  },
});

export default customerSlice.reducer;
