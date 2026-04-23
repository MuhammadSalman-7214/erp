import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";

const sanitizeUser = (user) => {
  if (!user) return null;
  const { token, ...safeUser } = user;
  return safeUser;
};

const readStoredUser = () => {
  try {
    return sanitizeUser(JSON.parse(localStorage.getItem("user")));
  } catch {
    return null;
  }
};

const readStoredOtpSession = () => {
  try {
    return JSON.parse(localStorage.getItem("pendingOtpSession"));
  } catch {
    return null;
  }
};

const initialState = {
  user: readStoredUser(),
  isUserSignup: false,
  staffuser: null,
  manageruser: null,
  adminuser: null,
  token: null,
  pendingOtpSession: readStoredOtpSession(),
  isupdateProfile: false,
  isAuthenticated: !!readStoredUser(),
  isAuthChecked: false,
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
      const user = sanitizeUser(response.data.savedUser);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.removeItem("token");
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
      } else if (response.data?.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(sanitizeUser(response.data.user)),
        );
        localStorage.removeItem("token");
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
      const user = sanitizeUser(response.data.user);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.removeItem("token");

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
      await axiosInstance.post(
        "auth/logout",
        {},
        {
          withCredentials: true,
          skipAuthRedirect: true,
        },
      );
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

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("auth/me", {
        withCredentials: true,
        skipAuthRedirect: true,
      });
      if (response.data?.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(sanitizeUser(response.data.user)),
        );
      }
      return response.data;
    } catch (error) {
      if (error?.response?.status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        return { user: null };
      }
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      return rejectWithValue(error.response?.data?.message || "Not authenticated");
    }
  },
);

export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (base64Image, { rejectWithValue, getState }) => {
    try {
      const storedUser = getState()?.auth?.user;

      if (!storedUser) {
        return rejectWithValue("User not authenticated. Please log in again.");
      }

      const response = await axiosInstance.put(
        "auth/updateProfile",
        { ProfilePic: base64Image },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        },
      );

      const updatedData = response.data;

      if (updatedData && updatedData.updatedUser) {
        localStorage.setItem(
          "user",
          JSON.stringify(sanitizeUser(updatedData.updatedUser)),
        );
        return updatedData.updatedUser;
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
        state.user = sanitizeUser(action.payload.savedUser);
        state.token = null;
        state.isAuthenticated = true;
        state.isAuthChecked = true;
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
          state.user = sanitizeUser(action.payload.user);
          state.token = null;
          state.isAuthenticated = true;
          state.pendingOtpSession = null;
          state.isAuthChecked = true;
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
        state.user = sanitizeUser(action.payload.user);
        state.token = null;
        state.isAuthenticated = true;
        state.pendingOtpSession = null;
        state.isAuthChecked = true;
      })
      .addCase(verifyOtp.rejected, (state) => {
        state.isOtpVerifying = false;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.pendingOtpSession = null;
        state.isAuthChecked = true;
      })
      .addCase(logout.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.pendingOtpSession = null;
        state.isAuthChecked = true;
      })

      .addCase(fetchCurrentUser.pending, (state) => {
        state.isAuthChecked = false;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = sanitizeUser(action.payload?.user);
        state.token = null;
        state.isAuthenticated = !!action.payload?.user;
        state.isAuthChecked = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isAuthChecked = true;
      })

      .addCase(updateProfile.pending, (state) => {
        state.isupdateProfile = true;
      });

    builder
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isupdateProfile = false;
        state.user = { ...state.user, ...action.payload };
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
