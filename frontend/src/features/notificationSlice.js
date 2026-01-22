import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";

const initialState = {
  notifications: [],
  isLoading: false,
};
export const createNotification = createAsyncThunk(
  "notification/createNotification",
  async (notification, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("notification", notification, {
        withCredentials: true,
      });
      console.log({ fdsfsd: res.data });

      return res.data.notification;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Notification creation failed",
      );
    }
  },
);

export const getAllNotifications = createAsyncThunk(
  "notification/getAllNotifications",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("notification", {
        withCredentials: true,
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Notification retrieval failed",
      );
    }
  },
);

export const deleteNotification = createAsyncThunk(
  "notification/deleteNotification",
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`notification/${id}`, {
        withCredentials: true,
      });
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Notification removal failed",
      );
    }
  },
);

const notificationSlice = createSlice({
  name: "notification",
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder

      .addCase(getAllNotifications.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getAllNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload || [];
        toast.success("Notifications fetched successfully");
      })
      .addCase(getAllNotifications.rejected, (state, action) => {
        state.isLoading = false;
        toast.error(action.payload || "Error fetching notifications");
      })

      .addCase(createNotification.fulfilled, (state, action) => {
        toast.success("Notification created successfully");
        state.notifications.unshift(action.payload);
      })
      .addCase(createNotification.rejected, (state, action) => {
        toast.error(action.payload || "Error creating notification");
      })

      .addCase(deleteNotification.fulfilled, (state, action) => {
        toast.success("Notification deleted successfully");
        state.notifications = state.notifications.filter(
          (notification) => notification._id !== action.payload,
        );
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        toast.error(action.payload || "Error deleting notification");
      });
  },
});

export default notificationSlice.reducer;
export const { addNotification } = notificationSlice.actions;
