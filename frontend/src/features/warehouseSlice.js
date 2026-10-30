import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";

const initialState = {
  warehouses: [],
  isLoadingWarehouses: false,
  locations: [],
  isLoadingLocations: false,
  access: [],
  isLoadingAccess: false,
};

export const fetchWarehouses = createAsyncThunk(
  "warehouse/fetchWarehouses",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("warehouse");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load warehouses",
      );
    }
  },
);

export const fetchLocations = createAsyncThunk(
  "warehouse/fetchLocations",
  async (warehouseId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `warehouse/${warehouseId}/locations`,
        { params: { flat: true } },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load locations",
      );
    }
  },
);

export const createWarehouse = createAsyncThunk(
  "warehouse/createWarehouse",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("warehouse", payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create warehouse",
      );
    }
  },
);

export const createLocation = createAsyncThunk(
  "warehouse/createLocation",
  async ({ warehouseId, ...body }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `warehouse/${warehouseId}/locations`,
        body,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create location",
      );
    }
  },
);

export const fetchWarehouseAccess = createAsyncThunk(
  "warehouse/fetchWarehouseAccess",
  async (warehouseId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`warehouse/${warehouseId}/access`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load warehouse access",
      );
    }
  },
);

export const grantWarehouseAccess = createAsyncThunk(
  "warehouse/grantWarehouseAccess",
  async ({ warehouseId, staffUserId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`warehouse/${warehouseId}/access`, {
        staffUserId,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to grant warehouse access",
      );
    }
  },
);

export const revokeWarehouseAccess = createAsyncThunk(
  "warehouse/revokeWarehouseAccess",
  async ({ warehouseId, staffUserId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(
        `warehouse/${warehouseId}/access/${staffUserId}`,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to revoke warehouse access",
      );
    }
  },
);

const warehouseSlice = createSlice({
  name: "warehouse",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWarehouses.pending, (state) => {
        state.isLoadingWarehouses = true;
      })
      .addCase(fetchWarehouses.fulfilled, (state, action) => {
        state.isLoadingWarehouses = false;
        state.warehouses = action.payload.warehouses || [];
      })
      .addCase(fetchWarehouses.rejected, (state) => {
        state.isLoadingWarehouses = false;
      })
      .addCase(fetchLocations.pending, (state) => {
        state.isLoadingLocations = true;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.isLoadingLocations = false;
        state.locations = action.payload.locations || [];
      })
      .addCase(fetchLocations.rejected, (state) => {
        state.isLoadingLocations = false;
      })

      .addCase(createWarehouse.fulfilled, (state, action) => {
        state.warehouses.push(action.payload.warehouse);
      })

      .addCase(createLocation.fulfilled, (state, action) => {
        state.locations.push(action.payload.location);
      })

      .addCase(fetchWarehouseAccess.pending, (state) => {
        state.isLoadingAccess = true;
      })
      .addCase(fetchWarehouseAccess.fulfilled, (state, action) => {
        state.isLoadingAccess = false;
        state.access = action.payload.access || [];
      })
      .addCase(fetchWarehouseAccess.rejected, (state) => {
        state.isLoadingAccess = false;
      })

      .addCase(grantWarehouseAccess.fulfilled, (state, action) => {
        // Refetched by the component (needs the joined user name/email),
        // this just avoids a stale/empty flash before that refetch lands.
      })

      .addCase(revokeWarehouseAccess.fulfilled, (state, action) => {
        state.access = state.access.filter(
          (a) => String(a.staff_user_id) !== String(action.meta.arg.staffUserId),
        );
      });
  },
});

export default warehouseSlice.reducer;
