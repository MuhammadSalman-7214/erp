// import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
// import axiosInstance from "../lib/axios";
// import toast from "react-hot-toast";

// const initialState = {
//   activityLogs: [],
//   isFetching: false,
//   isAdding: false,
//   userdata: [],
//   recentuser: null,
// };

// export const getAllActivityLogs = createAsyncThunk(
//   "activitylogs/getAllLogs",
//   async (_, { rejectWithValue }) => {
//     try {
//       const response = await axiosInstance.get("/activitylogs", {
//         withCredentials: true,
//       });
//       return response.data;
//     } catch (error) {
//       return rejectWithValue(
//         error.response?.data?.message || "Failed to fetch activity logs",
//       );
//     }
//   },
// );

// export const getsingleUserActivityLogs = createAsyncThunk(
//   "activitylogs/getLogs",
//   async (userid, { rejectWithValue }) => {
//     try {
//       const response = await axiosInstance.get(`activitylogs/${userid}`, {
//         withCredentials: true,
//       });
//       return response.data;
//     } catch (error) {
//       return rejectWithValue(
//         error.response?.data?.message || "Failed to fetch activity logs",
//       );
//     }
//   },
// );

// export const getrecentActivityLogs = createAsyncThunk(
//   "activitylogs/getrecentActivitys",
//   async (_, { rejectWithValue }) => {
//     try {
//       const response = await axiosInstance.get(`activitylogs`, {
//         withCredentials: true,
//       });
//       return response.data;
//     } catch (error) {
//       return rejectWithValue(
//         error.response?.data?.message || "Failed to fetch activity logs",
//       );
//     }
//   },
// );

// export const addActivityLog = createAsyncThunk(
//   "activitylogs/addLog",
//   async (logData, { rejectWithValue }) => {
//     try {
//       const response = await axiosInstance.post("activity-logs", logData, {
//         withCredentials: true,
//       });
//       return response.data;
//     } catch (error) {
//       return rejectWithValue(
//         error.response?.data?.message || "Failed to add activity log",
//       );
//     }
//   },
// );

// const activitySlice = createSlice({
//   name: "activity",
//   initialState,
//   reducers: {},
//   extraReducers: (builder) => {
//     builder

//       .addCase(getAllActivityLogs.pending, (state) => {
//         state.isFetching = true;
//       })
//       .addCase(getAllActivityLogs.fulfilled, (state, action) => {
//         state.activityLogs = action.payload.logs ?? [];
//       })

//       .addCase(getAllActivityLogs.rejected, (state, action) => {
//         state.isFetching = false;
//         state.error = action.payload;
//         toast.error(action.payload || "Error fetching activity logs");
//       })

//       .addCase(addActivityLog.pending, (state) => {
//         state.isAdding = true;
//       })
//       .addCase(addActivityLog.fulfilled, (state, action) => {
//         state.isAdding = false;
//         state.activityLogs.push(action.payload);
//       })
//       .addCase(addActivityLog.rejected, (state, action) => {
//         state.isAdding = false;
//         state.error = action.payload;
//       })

//       .addCase(getsingleUserActivityLogs.pending, (state) => {})
//       .addCase(getsingleUserActivityLogs.fulfilled, (state, action) => {
//         state.userdata.push(action.payload);
//       })
//       .addCase(getsingleUserActivityLogs.rejected, (state, action) => {
//         state.error = action.payload;
//       })

//       .addCase(getrecentActivityLogs.fulfilled, (state, action) => {
//         state.recentuser = action.payload;
//       })
//       .addCase(getrecentActivityLogs.rejected, (state, action) => {
//         state.error = action.payload;
//       });
//   },
// });

// export default activitySlice.reducer;
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";

const initialState = {
  activityLogs: [], // Admin: all logs
  myLogs: [], // User: own logs
  recentLogs: [], // Dashboard: recent logs for admin/manager
  isFetching: false,
  error: null,
};

// 🔹 ADMIN: all logs
export const getAllActivityLogs = createAsyncThunk(
  "activity/getAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/activitylogs", {
        withCredentials: true,
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

// 🔹 USER: own logs
export const getsingleUserActivityLogs = createAsyncThunk(
  "activity/me",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/activitylogs/me", {
        withCredentials: true,
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

// 🔹 DASHBOARD: recent logs
export const getRecentActivityLogs = createAsyncThunk(
  "activity/recent",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/activitylogs/recent", {
        withCredentials: true,
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

const slice = createSlice({
  name: "activity",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getAllActivityLogs.fulfilled, (state, action) => {
        state.activityLogs = action.payload;
      })
      .addCase(getAllActivityLogs.rejected, (state, action) => {
        state.error = action.payload;
      })

      .addCase(getsingleUserActivityLogs.fulfilled, (state, action) => {
        state.myLogs = action.payload;
      })
      .addCase(getsingleUserActivityLogs.rejected, (state, action) => {
        state.error = action.payload;
      })

      .addCase(getRecentActivityLogs.fulfilled, (state, action) => {
        state.recentLogs = action.payload;
      })
      .addCase(getRecentActivityLogs.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export default slice.reducer;
