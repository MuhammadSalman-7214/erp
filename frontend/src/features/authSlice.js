//authSlice
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";

const initialState = {
  // Authuser: JSON.parse(localStorage.getItem("user")) || null,
  user: JSON.parse(localStorage.getItem("user")),
  isUserSignup: false,
  staffuser: null,
  manageruser: null,
  adminuser: null,
  token: localStorage.getItem("token"),
  isupdateProfile: false,
  isAuthenticated: !!localStorage.getItem("token"),
  isLoginLoading: false,
};

export const signup = createAsyncThunk(
  "auth/signup",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("auth/signup", credentials, {
        withCredentials: true,
      });
      localStorage.setItem("user", JSON.stringify(response.data.savedUser));
      localStorage.setItem("token", response.data.savedUser.token);

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Signup failed");
    }
  },
);

// Login
export const login = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("auth/login", credentials, {
        withCredentials: true,
      });

      localStorage.setItem("user", JSON.stringify(response.data.user));

      localStorage.setItem("token", response.data.user.token);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Login failed");
    }
  },
);

// Logout
export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // localStorage.removeItem("authUser");
      return null;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Logout failed");
    }
  },
);
export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (base64Image, { rejectWithValue }) => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      if (!storedUser || !token) {
        return rejectWithValue("User not authenticated. Please log in again.");
      }

      const response = await axiosInstance.put(
        "auth/updateProfile",
        { ProfilePic: base64Image },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const updatedData = response.data;

      if (updatedData && updatedData.updatedUser) {
        localStorage.setItem("user", JSON.stringify(updatedData.updatedUser));
        return updatedData.updatedUser; // Return the updated user object
      } else {
        throw new Error("Unexpected response structure");
      }
    } catch (error) {
      console.error("Update profile error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to update profile",
      );
    }
  },
);

export const staffUser = createAsyncThunk(
  "auth/staffuser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("auth/staffuser", _, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to get staff user",
      );
    }
  },
);

export const managerUser = createAsyncThunk(
  "auth/manageruser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("auth/manageruser", _, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to get manager user",
      );
    }
  },
);

export const adminUser = createAsyncThunk(
  "auth/adminuser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("auth/adminuser", _, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to get admin  user",
      );
    }
  },
);

export const removeusers = createAsyncThunk(
  "auth/removeuser",
  async (UserId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(
        `auth/removeuser/${UserId}`,
        UserId,
        { withCredentials: true },
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete  user",
      );
    }
  },
);
export const getUserStats = createAsyncThunk(
  "auth/getUserStats",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("auth/users/stats");
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message);
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder

      .addCase(signup.pending, (state) => {
        state.isUserSignup = true;
      })
      .addCase(signup.fulfilled, (state, action) => {
        // state.user = action.payload.savedUser;
        // state.token = action.payload.savedUser.token;
        // state.isAuthenticated = true;
        state.isUserSignup = false;
      })
      .addCase(signup.rejected, (state, action) => {
        state.isUserSignup = false;
      })

      .addCase(login.pending, (state) => {
        state.isLoginLoading = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoginLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.user.token;
        state.isAuthenticated = true;
      })

      .addCase(login.rejected, (state) => {
        state.isLoginLoading = false;
        state.isAuthenticated = false;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      .addCase(logout.rejected, (state, action) => {})

      .addCase(updateProfile.pending, (state) => {
        state.isupdateProfile = true;
      });

    builder
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isupdateProfile = false;
        state.user = { ...state.user, user: action.payload };
      })

      .addCase(staffUser.fulfilled, (state, action) => {
        state.staffuser = action.payload;
      })

      .addCase(staffUser.rejected, (state, action) => {})

      .addCase(managerUser.fulfilled, (state, action) => {
        state.manageruser = action.payload;
      })

      .addCase(managerUser.rejected, (state, action) => {})

      .addCase(adminUser.fulfilled, (state, action) => {
        state.adminuser = action.payload;
      })

      .addCase(adminUser.rejected, (state, action) => {})

      .addCase(removeusers.fulfilled, (state, action) => {})

      .addCase(removeusers.rejected, (state, action) => {})
      .addCase(getUserStats.fulfilled, (state, action) => {
        state.userStats = action.payload;
      });
  },
});

export default authSlice.reducer;
