import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";

const initialState = {
  getallSupplier: null,
  isallSupplier: false,
  isSupplieradd: false,
  isSupplierremove: false,
  searchdata: null,
  issearchdata: false,
  editedSupplier: null,
  iseditedSupplier: false,
  editedsupplier: null,
};

export const CreateSupplier = createAsyncThunk(
  "supplier/createsupplier",
  async (Supplier, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("supplier", {
        vendorCode: Supplier.vendorCode,
        name: Supplier.name,
        contactInfo: Supplier.contactInfo,
        openingBalance: Supplier.openingBalance,
        paymentTerms: Supplier.paymentTerms,
        productsSupplied: Supplier.productsSupplied || [],
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "supplier creation failed",
      );
    }
  },
);

export const gettingallSupplier = createAsyncThunk(
  "supplier/getallsupplier",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("supplier", {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Supplier retrieval failed",
      );
    }
  },
);

export const deleteSupplier = createAsyncThunk(
  "supplier/delete",
  async (supplierId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(
        `supplier/${supplierId}`, // just pass ID in URL
        { withCredentials: true }, // config object
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Supplier remove failed",
      );
    }
  },
);

export const SearchSupplier = createAsyncThunk(
  "supplier/searchSupplier",
  async (query, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `supplier/searchSupplier?query=${query}`,
        { withCredentials: true },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Supplier search failed",
      );
    }
  },
);

export const EditSupplier = createAsyncThunk(
  "supplier/updatesupplier",
  async ({ supplierId, updatedData }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(
        `supplier/${supplierId}`,
        updatedData,
        { withCredentials: true },
      );
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to update supplier. Please try again.";
      toast.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  },
);

const supplierSlice = createSlice({
  name: "supplier",
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder

      .addCase(CreateSupplier.pending, (state) => {
        state.isSupplieradd = true;
      })
      .addCase(CreateSupplier.fulfilled, (state, action) => {
        state.isSupplieradd = false;
      })
      .addCase(CreateSupplier.rejected, (state, action) => {
        state.isSupplieradd = false;
        toast.error("Error creating Supplier");
      })

      .addCase(gettingallSupplier.pending, (state) => {
        state.isallSupplier = true;
      })
      .addCase(gettingallSupplier.fulfilled, (state, action) => {
        state.isallSupplier = false;
        state.getallSupplier = action.payload || [];
      })

      .addCase(gettingallSupplier.rejected, (state, action) => {
        state.isallSupplier = false;
      })

      .addCase(deleteSupplier.pending, (state) => {
        state.isSupplierremove = true;
      })
      .addCase(deleteSupplier.fulfilled, (state, action) => {
        state.isSupplierremove = false;
        state.getallSupplier = state.getallSupplier.filter(
          (supplier) => supplier._id !== action.meta.arg,
        );
      })

      .addCase(deleteSupplier.rejected, (state, action) => {
        state.isSupplierremove = false;
      })
      .addCase(SearchSupplier.fulfilled, (state, action) => {
        state.searchdata = action.payload.suppliers || [];
      })

      .addCase(SearchSupplier.rejected, (state, action) => {})
      .addCase(EditSupplier.fulfilled, (state, action) => {
        state.editedsupplier = action.payload.vendor;
        const index = state.getallSupplier.findIndex(
          (s) => s._id === action.payload.vendor._id,
        );
        if (index !== -1) {
          state.getallSupplier[index] = action.payload.vendor;
        }
      })

      .addCase(EditSupplier.rejected, (state, action) => {});
  },
});

export default supplierSlice.reducer;
