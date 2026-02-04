import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";

const initialState = {
  summary: null,
  byCountry: null,
  shipmentPnl: null,
  isLoadingSummary: false,
  isLoadingByCountry: false,
  isLoadingShipmentPnl: false,
  error: null,
};

export const fetchSummaryReport = createAsyncThunk(
  "reports/summary",
  async ({ startDate, endDate } = {}, { rejectWithValue }) => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await axiosInstance.get("reports/summary", {
        params,
        withCredentials: true,
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch summary report",
      );
    }
  },
);

export const fetchCountryReport = createAsyncThunk(
  "reports/byCountry",
  async ({ startDate, endDate } = {}, { rejectWithValue }) => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await axiosInstance.get("reports/by-country", {
        params,
        withCredentials: true,
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to fetch country consolidation report",
      );
    }
  },
);

export const fetchShipmentPnlReport = createAsyncThunk(
  "reports/shipmentPnl",
  async ({ startDate, endDate, page, limit, status } = {}, { rejectWithValue }) => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (page) params.page = page;
      if (limit) params.limit = limit;
      if (status) params.status = status;
      const res = await axiosInstance.get("reports/shipment-pnl", {
        params,
        withCredentials: true,
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch shipment P&L report",
      );
    }
  },
);

const reportSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSummaryReport.pending, (state) => {
        state.isLoadingSummary = true;
        state.error = null;
      })
      .addCase(fetchSummaryReport.fulfilled, (state, action) => {
        state.isLoadingSummary = false;
        state.summary = action.payload;
      })
      .addCase(fetchSummaryReport.rejected, (state, action) => {
        state.isLoadingSummary = false;
        state.error = action.payload;
      })
      .addCase(fetchCountryReport.pending, (state) => {
        state.isLoadingByCountry = true;
        state.error = null;
      })
      .addCase(fetchCountryReport.fulfilled, (state, action) => {
        state.isLoadingByCountry = false;
        state.byCountry = action.payload;
      })
      .addCase(fetchCountryReport.rejected, (state, action) => {
        state.isLoadingByCountry = false;
        state.error = action.payload;
      })
      .addCase(fetchShipmentPnlReport.pending, (state) => {
        state.isLoadingShipmentPnl = true;
        state.error = null;
      })
      .addCase(fetchShipmentPnlReport.fulfilled, (state, action) => {
        state.isLoadingShipmentPnl = false;
        state.shipmentPnl = action.payload;
      })
      .addCase(fetchShipmentPnlReport.rejected, (state, action) => {
        state.isLoadingShipmentPnl = false;
        state.error = action.payload;
      });
  },
});

export default reportSlice.reducer;
