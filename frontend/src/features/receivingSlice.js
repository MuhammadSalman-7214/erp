import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";

const initialState = {
  receipts: [],
  isLoadingReceipts: false,
  activeReceipt: null,
  activeLines: [],
  isLoadingReceipt: false,
  isSubmittingLine: false,
  isCompleting: false,
};

export const fetchReceipts = createAsyncThunk(
  "receiving/fetchReceipts",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("receiving", { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load receiving tasks",
      );
    }
  },
);

export const fetchReceiptById = createAsyncThunk(
  "receiving/fetchReceiptById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`receiving/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load goods receipt",
      );
    }
  },
);

export const createReceipt = createAsyncThunk(
  "receiving/createReceipt",
  async ({ orderId, warehouseId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("receiving", {
        orderId,
        warehouseId,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to start goods receipt",
      );
    }
  },
);

export const updateReceiptLine = createAsyncThunk(
  "receiving/updateReceiptLine",
  async ({ receiptId, lineId, ...body }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        `receiving/${receiptId}/lines/${lineId}`,
        body,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to update receipt line" },
      );
    }
  },
);

export const completeReceipt = createAsyncThunk(
  "receiving/completeReceipt",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`receiving/${id}/complete`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to complete goods receipt",
      );
    }
  },
);

const receivingSlice = createSlice({
  name: "receiving",
  initialState,
  reducers: {
    clearActiveReceipt: (state) => {
      state.activeReceipt = null;
      state.activeLines = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReceipts.pending, (state) => {
        state.isLoadingReceipts = true;
      })
      .addCase(fetchReceipts.fulfilled, (state, action) => {
        state.isLoadingReceipts = false;
        state.receipts = action.payload.receipts || [];
      })
      .addCase(fetchReceipts.rejected, (state) => {
        state.isLoadingReceipts = false;
      })

      .addCase(fetchReceiptById.pending, (state) => {
        state.isLoadingReceipt = true;
      })
      .addCase(fetchReceiptById.fulfilled, (state, action) => {
        state.isLoadingReceipt = false;
        state.activeReceipt = action.payload.receipt;
        state.activeLines = action.payload.lines || [];
      })
      .addCase(fetchReceiptById.rejected, (state) => {
        state.isLoadingReceipt = false;
      })

      .addCase(createReceipt.fulfilled, (state, action) => {
        state.activeReceipt = action.payload.receipt;
        state.activeLines = action.payload.lines || [];
      })

      .addCase(updateReceiptLine.pending, (state) => {
        state.isSubmittingLine = true;
      })
      .addCase(updateReceiptLine.fulfilled, (state, action) => {
        state.isSubmittingLine = false;
        const updated = action.payload.line;
        if (updated) {
          state.activeLines = state.activeLines.map((line) =>
            line.id === updated.id ? updated : line,
          );
        }
      })
      .addCase(updateReceiptLine.rejected, (state) => {
        state.isSubmittingLine = false;
      })

      .addCase(completeReceipt.pending, (state) => {
        state.isCompleting = true;
      })
      .addCase(completeReceipt.fulfilled, (state, action) => {
        state.isCompleting = false;
        state.activeReceipt = action.payload.receipt;
        state.activeLines = action.payload.lines || [];
      })
      .addCase(completeReceipt.rejected, (state) => {
        state.isCompleting = false;
      });
  },
});

export const { clearActiveReceipt } = receivingSlice.actions;
export default receivingSlice.reducer;
