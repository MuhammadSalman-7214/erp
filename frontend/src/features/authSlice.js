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
  pendingOtpSession: JSON.parse(localStorage.getItem("pendingOtpSession")),
  isupdateProfile: false,
  isAuthenticated: !!localStorage.getItem("token"),
  isLoginLoading: false,
  isOtpVerifying: false,
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

      if (response.data?.otpRequired) {
        localStorage.setItem(
          "pendingOtpSession",
          JSON.stringify({
            challengeId: response.data.challengeId,
            email: response.data.email,
            maskedEmail: response.data.maskedEmail,
            expiresIn: response.data.expiresIn,
            createdAt: Date.now(),
          }),
        );
      }

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Login failed");
    }
  },
);

export const verifyOtp = createAsyncThunk(
  "auth/verifyOtp",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "auth/verify-otp",
        payload,
        {
          withCredentials: true,
        },
      );

      localStorage.removeItem("pendingOtpSession");
      localStorage.setItem("user", JSON.stringify(response.data.user));
      localStorage.setItem("token", response.data.user.token);

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "OTP verification failed");
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
      localStorage.removeItem("pendingOtpSession");
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      }
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

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearPendingOtpSession: (state) => {
      state.pendingOtpSession = null;
      state.isOtpVerifying = false;
    },
  },
  extraReducers: (builder) => {
    builder

      .addCase(signup.pending, (state) => {
        state.isUserSignup = true;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.isUserSignup = false;
        state.user = action.payload.savedUser;
        state.token = action.payload.savedUser.token;
        state.isAuthenticated = true;
      })
      .addCase(signup.rejected, (state, action) => {
        state.isUserSignup = false;
      })

      .addCase(login.pending, (state) => {
        state.isLoginLoading = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoginLoading = false;
        if (action.payload?.otpRequired) {
          state.pendingOtpSession = {
            challengeId: action.payload.challengeId,
            email: action.payload.email,
            maskedEmail: action.payload.maskedEmail,
            expiresIn: action.payload.expiresIn,
            createdAt: Date.now(),
          };
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
        } else if (action.payload?.user) {
          state.user = action.payload.user;
          state.token = action.payload.user.token;
          state.isAuthenticated = true;
          state.pendingOtpSession = null;
        }
      })

      .addCase(login.rejected, (state) => {
        state.isLoginLoading = false;
        state.isAuthenticated = false;
      })
      .addCase(verifyOtp.pending, (state) => {
        state.isOtpVerifying = true;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.isOtpVerifying = false;
        state.user = action.payload.user;
        state.token = action.payload.user.token;
        state.isAuthenticated = true;
        state.pendingOtpSession = null;
      })
      .addCase(verifyOtp.rejected, (state) => {
        state.isOtpVerifying = false;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.pendingOtpSession = null;
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

      .addCase(removeusers.rejected, (state, action) => {});
  },
});

export const { clearPendingOtpSession } = authSlice.actions;
export default authSlice.reducer;
