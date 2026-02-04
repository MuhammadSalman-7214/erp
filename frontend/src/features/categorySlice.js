import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";

const initialState = {
  getallCategory: [],
  isgetallCategory: false,
  iscreatedCategory: false,
  iscategoryremove: false,
  searchdata: null,
};

export const CreateCategory = createAsyncThunk(
  "category/createcategory",
  async (Category, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("category", Category, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      console.error("CreateCategory error:", error.response || error);
      return rejectWithValue(
        error.response?.data?.message || "Category add failed",
      );
    }
  },
);

export const gettingallCategory = createAsyncThunk(
  "category/getcategory",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("category");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const RemoveCategory = createAsyncThunk(
  "category/removecategory",
  async (CategoryId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`category/${CategoryId}`);
      return CategoryId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const SearchCategory = createAsyncThunk(
  "category/searchcategory",
  async (query, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `category/search?query=${query}`,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

const categorySlice = createSlice({
  name: "category",
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder

      .addCase(gettingallCategory.pending, (state) => {
        state.isgetallCategory = true;
      })
      .addCase(gettingallCategory.fulfilled, (state, action) => {
        state.isgetallCategory = false;
        state.getallCategory = action.payload.categoriesWithCount;
      })

      .addCase(gettingallCategory.rejected, (state, action) => {
        state.isgetallCategory = false;
      })

      .addCase(CreateCategory.pending, (state) => {
        state.iscreatedCategory = true;
      })
      .addCase(CreateCategory.fulfilled, (state, action) => {
        state.iscreatedCategory = false;
        if (Array.isArray(state.getallCategory)) {
          state.getallCategory.unshift(action.payload);
        }
      })

      .addCase(CreateCategory.rejected, (state, action) => {
        state.iscreatedCategory = false;
      })

      .addCase(RemoveCategory.pending, (state) => {
        state.iscategoryremove = true;
      })

      .addCase(RemoveCategory.fulfilled, (state, action) => {
        state.iscategoryremove = true;
        state.getallCategory = state.getallCategory.filter(
          (category) => category._id !== action.meta.arg,
        );
      })

      .addCase(RemoveCategory.rejected, (state, action) => {
        state.iscategoryremove = true;
      })

      .addCase(SearchCategory.fulfilled, (state, action) => {
        state.searchdata = action.payload;
      })

      .addCase(SearchCategory.rejected, (state, action) => {});
  },
});

export default categorySlice.reducer;
