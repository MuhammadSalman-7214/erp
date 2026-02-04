import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";

const initialState = {
  getallproduct: [],
  isallproductget: false,
  isproductadd: false,
  isproductremove: false,
  searchdata: null,
  issearchdata: false,
  editedProduct: null,
  iseditedProduct: false,
  gettopproduct: null,
};

export const Addproduct = createAsyncThunk(
  "product/addproduct",
  async (product, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axiosInstance.post("product", product, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      }); // <-- updated
      return response.data.product;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Product adding failed",
      );
    }
  },
);

// export const EditProduct = createAsyncThunk(
//   "product/editproduct",
//   async ({ id, updatedData }, { rejectWithValue }) => {
//     try {
//       const token = localStorage.getItem("token");

//       const response = await axiosInstance.put(
//         `product/${id}`, // <-- updated
//         updatedData, // send only the updated data
//         {
//           headers: { Authorization: `Bearer ${token}` },
//           withCredentials: true,
//         },
//       );
//       return response.data;
//     } catch (error) {
//       const errorMessage =
//         error.response?.data?.message ||
//         "Failed to update product. Please try again.";
//       toast.error(errorMessage);
//       return rejectWithValue(errorMessage);
//     }
//   },
// );
export const EditProduct = createAsyncThunk(
  "product/editproduct",
  async ({ id, updatedData }, { rejectWithValue }) => {
    if (!updatedData) {
      return rejectWithValue("No updated data provided");
    }

    try {
      const token = localStorage.getItem("token");

      const response = await axiosInstance.put(
        `/product/${id}`,
        updatedData, // just send updatedData
        { headers: { Authorization: `Bearer ${token}` } },
      );

      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to update product";
      toast.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  },
);

export const Removeproduct = createAsyncThunk(
  "product/removeproduct",
  async (productId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axiosInstance.delete(`product/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      }); // <-- updated
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Product remove failed",
      );
    }
  },
);

export const gettingallproducts = createAsyncThunk(
  "product/getproduct",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axiosInstance.get("product", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data.message || "Product getting failed",
      );
    }
  },
);

export const Searchproduct = createAsyncThunk(
  "product/searchproduct",
  async (query, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axiosInstance.get(
        `product/searchproduct?query=${query}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        },
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Product adding failed",
      );
    }
  },
);

export const getTopProductsByQuantity = createAsyncThunk(
  "product/getTopProductsByQuantity",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axiosInstance.get(
        `product/getTopProductsByQuantity`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Product getting failed",
      );
    }
  },
);

const productSlice = createSlice({
  name: "product",
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder

      .addCase(gettingallproducts.pending, (state) => {
        state.isallproductget = true;
      })
      .addCase(gettingallproducts.fulfilled, (state, action) => {
        state.isallproductget = false;
        state.getallproduct = action.payload.Products || [];
        // toast.success("Products fetched successfully");
      })

      .addCase(gettingallproducts.rejected, (state, action) => {
        state.isallproductget = false;
      })

      .addCase(Removeproduct.pending, (state) => {
        state.isproductremove = true;
      })

      .addCase(Removeproduct.fulfilled, (state, action) => {
        state.isproductremove = false;
        state.getallproduct = state.getallproduct.filter(
          (product) => product._id !== action.meta.arg,
        );
      })

      .addCase(Removeproduct.rejected, (state, action) => {
        state.isproductremove = false;
      })

      .addCase(Addproduct.pending, (state) => {
        state.isproductadd = true;
      })
      .addCase(Addproduct.fulfilled, (state, action) => {
        state.isproductadd = false;
        state.getallproduct.push(action.payload);
      })

      .addCase(Addproduct.rejected, (state, action) => {
        state.isproductadd = false;
      })

      .addCase(Searchproduct.pending, (state) => {
        state.issearchdata = true;
      })
      .addCase(Searchproduct.fulfilled, (state, action) => {
        state.issearchdata = false;
        state.searchdata = action.payload;
      })

      .addCase(Searchproduct.rejected, (state, action) => {
        state.issearchdata = false;
      })

      .addCase(EditProduct.pending, (state) => {
        state.iseditedProduct = true;
      })
      .addCase(EditProduct.fulfilled, (state, action) => {
        state.iseditedProduct = false;
        state.editedProduct = action.payload;
      })

      .addCase(EditProduct.rejected, (state, action) => {
        state.iseditedProduct = false;
      })
      .addCase(getTopProductsByQuantity.fulfilled, (state, action) => {
        const products = action.payload.topProducts || [];
        state.gettopproduct = products;
      })
      .addCase(getTopProductsByQuantity.rejected, (state, action) => {
        toast.error("Error fetching products");
      });
  },
});

export default productSlice.reducer;
