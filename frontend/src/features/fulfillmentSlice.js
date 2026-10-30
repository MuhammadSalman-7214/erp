import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";

const initialState = {
  fulfillments: [],
  isLoadingFulfillments: false,
  activeFulfillment: null,
  activeLines: [],
  isLoadingFulfillment: false,
  isSubmittingLine: false,
  isDispatching: false,
};

export const fetchFulfillments = createAsyncThunk(
  "fulfillment/fetchFulfillments",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("fulfillment", { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load fulfillment tasks",
      );
    }
  },
);

export const fetchFulfillmentById = createAsyncThunk(
  "fulfillment/fetchFulfillmentById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`fulfillment/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load fulfillment",
      );
    }
  },
);

export const createFulfillment = createAsyncThunk(
  "fulfillment/createFulfillment",
  async ({ saleId, warehouseId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("fulfillment", { saleId, warehouseId });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to start fulfillment",
      );
    }
  },
);

export const confirmPickLine = createAsyncThunk(
  "fulfillment/confirmPickLine",
  async ({ fulfillmentId, lineId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        `fulfillment/${fulfillmentId}/lines/${lineId}/pick`,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to confirm pick",
      );
    }
  },
);

export const dispatchFulfillment = createAsyncThunk(
  "fulfillment/dispatchFulfillment",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`fulfillment/${id}/dispatch`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to dispatch fulfillment",
      );
    }
  },
);

export const cancelFulfillment = createAsyncThunk(
  "fulfillment/cancelFulfillment",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`fulfillment/${id}/cancel`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to cancel fulfillment",
      );
    }
  },
);

const fulfillmentSlice = createSlice({
  name: "fulfillment",
  initialState,
  reducers: {
    clearActiveFulfillment: (state) => {
      state.activeFulfillment = null;
      state.activeLines = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFulfillments.pending, (state) => {
        state.isLoadingFulfillments = true;
      })
      .addCase(fetchFulfillments.fulfilled, (state, action) => {
        state.isLoadingFulfillments = false;
        state.fulfillments = action.payload.fulfillments || [];
      })
      .addCase(fetchFulfillments.rejected, (state) => {
        state.isLoadingFulfillments = false;
      })

      .addCase(fetchFulfillmentById.pending, (state) => {
        state.isLoadingFulfillment = true;
      })
      .addCase(fetchFulfillmentById.fulfilled, (state, action) => {
        state.isLoadingFulfillment = false;
        state.activeFulfillment = action.payload.fulfillment;
        state.activeLines = action.payload.lines || [];
      })
      .addCase(fetchFulfillmentById.rejected, (state) => {
        state.isLoadingFulfillment = false;
      })

      .addCase(createFulfillment.fulfilled, (state, action) => {
        state.activeFulfillment = action.payload.fulfillment;
        state.activeLines = action.payload.lines || [];
      })

      .addCase(confirmPickLine.pending, (state) => {
        state.isSubmittingLine = true;
      })
      .addCase(confirmPickLine.fulfilled, (state, action) => {
        state.isSubmittingLine = false;
        const updated = action.payload.line;
        if (updated) {
          state.activeLines = state.activeLines.map((line) =>
            line.id === updated.id ? updated : line,
          );
        }
        if (state.activeFulfillment && action.payload.fulfillmentStatus) {
          state.activeFulfillment.status = action.payload.fulfillmentStatus;
        }
      })
      .addCase(confirmPickLine.rejected, (state) => {
        state.isSubmittingLine = false;
      })

      .addCase(dispatchFulfillment.pending, (state) => {
        state.isDispatching = true;
      })
      .addCase(dispatchFulfillment.fulfilled, (state, action) => {
        state.isDispatching = false;
        state.activeFulfillment = action.payload.fulfillment;
        state.activeLines = action.payload.lines || [];
      })
      .addCase(dispatchFulfillment.rejected, (state) => {
        state.isDispatching = false;
      });
  },
});

export const { clearActiveFulfillment } = fulfillmentSlice.actions;
export default fulfillmentSlice.reducer;
