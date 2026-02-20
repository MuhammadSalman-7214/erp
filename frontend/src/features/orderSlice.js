import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";

const initialState = {
  getorder: [],
  isgetorder: false,
  isorderadd: true,
  isorderremove: true,
  editorder: null,
  iseditorder: false,
  issearchdata: true,
  searchdata: null,
  isshowgraph: false,
  statusgraph: [],
  errorGraph: null,
};

const normalizeOrdersPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.order)) return payload.order;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};
export const createdOrder = createAsyncThunk(
  "order/createorder",
  async (order, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("order/createorder", order, {
        withCredentials: true,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "order adding failed");
    }
  },
);
export const Removedorder = createAsyncThunk(
  "order/removeorder/",
  async (OrderId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(
        `order/removeorder/${OrderId}`,
        OrderId,
        { withCredentials: true },
      );
      return response.data;
    } catch (error) {
      console.log(error);
      return rejectWithValue(
        error.response?.data?.message || "Order remove failed",
      );
    }
  },
);

export const updatestatusOrder = createAsyncThunk(
  "order/updatestatusOrder",
  async ({ OrderId, updatedData }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(
        `order/updatestatusOrder/${OrderId}`,
        updatedData,
        { withCredentials: true },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Order edit failed",
      );
    }
  },
);

export const SearchOrder = createAsyncThunk(
  "order/Searchdata",
  async (query, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `order/Searchdata?query=${query}`,
        { withCredentials: true },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Order getting failed",
      );
    }
  },
);

export const gettingallOrder = createAsyncThunk(
  "order/getorders",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("order/getorders", {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "order getting failed",
      );
    }
  },
);

export const getstatusgraphOrder = createAsyncThunk(
  "order/graphstatusorder",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("order/graphstatusorder", {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "order getting graph failed",
      );
    }
  },
);

const orderSlice = createSlice({
  name: "order",
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder

      .addCase(gettingallOrder.pending, (state) => {
        state.isgetorder = true;
      })
      .addCase(gettingallOrder.fulfilled, (state, action) => {
        state.isgetorder = false;
        state.getorder = normalizeOrdersPayload(action.payload);
      })

      .addCase(gettingallOrder.rejected, (state, action) => {
        state.isgetorder = false;
      })

      .addCase(createdOrder.pending, (state) => {
        state.isorderadd = true;
      })

      .addCase(createdOrder.fulfilled, (state, action) => {
        state.isorderadd = false;
        const createdOrderRecord =
          action.payload?.order ||
          action.payload?.displayOrder?.[0] ||
          action.payload?.data?.order;
        if (createdOrderRecord?._id) {
          state.getorder.unshift(createdOrderRecord);
        }
      })

      .addCase(createdOrder.rejected, (state, action) => {
        state.isorderadd = false;
      })

      .addCase(Removedorder.pending, (state) => {
        state.isorderremove = true;
      })
      .addCase(Removedorder.fulfilled, (state, action) => {
        state.isorderremove = false;
        state.getorder = state.getorder.filter(
          (order) => order._id !== action.meta.arg,
        );
      })

      .addCase(Removedorder.rejected, (state, action) => {
        state.isorderremove = false;
      })

      .addCase(updatestatusOrder.pending, (state) => {
        state.iseditorder = true;
      })
      .addCase(updatestatusOrder.fulfilled, (state, action) => {
        state.iseditorder = false;
        state.editorder = action.payload;
        const updatedOrder = action.payload?.order || action.payload;
        if (updatedOrder?._id) {
          state.getorder = state.getorder.map((order) =>
            order._id === updatedOrder._id ? updatedOrder : order,
          );
        }
      })

      .addCase(updatestatusOrder.rejected, (state, action) => {
        state.iseditorder = false;
      })

      .addCase(SearchOrder.pending, (state) => {
        state.issearchdata = true;
      })
      .addCase(SearchOrder.fulfilled, (state, action) => {
        state.issearchdata = false;
        if (Array.isArray(action.payload)) {
          state.searchdata = action.payload;
        } else if (Array.isArray(action.payload?.searchdata)) {
          state.searchdata = action.payload.searchdata;
        } else if (Array.isArray(action.payload?.displayOrder)) {
          state.searchdata = action.payload.displayOrder;
        } else {
          state.searchdata = []; // fallback to empty array
        }
      })

      .addCase(SearchOrder.rejected, (state, action) => {
        state.issearchdata = false;
      })

      .addCase(getstatusgraphOrder.pending, (state) => {
        state.isshowgraph = true;
      })
      .addCase(getstatusgraphOrder.fulfilled, (state, action) => {
        state.isshowgraph = false;
        state.statusgraph = Array.isArray(action.payload)
          ? action.payload
          : action.payload?.statusgraph || [];
        state.errorGraph = null; // reset error if success
      })
      .addCase(getstatusgraphOrder.rejected, (state, action) => {
        state.isshowgraph = false;
        state.statusgraph = []; // empty array ensures chart can render
        state.errorGraph = action.payload || "Failed to fetch order graph";
        toast.error(state.errorGraph);
      });
  },
});

export default orderSlice.reducer;
