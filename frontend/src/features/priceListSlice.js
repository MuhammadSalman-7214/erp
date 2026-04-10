import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";

const initialState = {
  items: [],
  loading: false,
  saving: false,
  updating: false,
  deleting: false,
};

export const fetchPriceListItems = createAsyncThunk(
  "priceList/fetchItems",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/price-list");
      return response.data.items || [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load price list",
      );
    }
  },
);

export const createPriceListItem = createAsyncThunk(
  "priceList/createItem",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/price-list", payload);
      return response.data.item;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to save price list item",
      );
    }
  },
);

export const updatePriceListItem = createAsyncThunk(
  "priceList/updateItem",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/price-list/${id}`, payload);
      return response.data.item;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update price list item",
      );
    }
  },
);

export const deletePriceListItem = createAsyncThunk(
  "priceList/deleteItem",
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/price-list/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete price list item",
      );
    }
  },
);

const priceListSlice = createSlice({
  name: "priceList",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPriceListItems.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPriceListItems.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchPriceListItems.rejected, (state) => {
        state.loading = false;
      })
      .addCase(createPriceListItem.pending, (state) => {
        state.saving = true;
      })
      .addCase(createPriceListItem.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(createPriceListItem.rejected, (state) => {
        state.saving = false;
      })
      .addCase(updatePriceListItem.pending, (state) => {
        state.updating = true;
      })
      .addCase(updatePriceListItem.fulfilled, (state) => {
        state.updating = false;
      })
      .addCase(updatePriceListItem.rejected, (state) => {
        state.updating = false;
      })
      .addCase(deletePriceListItem.pending, (state) => {
        state.deleting = true;
      })
      .addCase(deletePriceListItem.fulfilled, (state) => {
        state.deleting = false;
      })
      .addCase(deletePriceListItem.rejected, (state) => {
        state.deleting = false;
      });
  },
});

export default priceListSlice.reducer;
