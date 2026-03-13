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
  isproductcodeadd: false,
  isproductcodeupdate: false,
  isproductcodedelete: false,
};

export const Addproduct = createAsyncThunk(
  "product/addproduct",
  async (product, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axiosInstance.post("product", product, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      return response.data.product;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Product adding failed",
      );
    }
  },
);

export const EditProduct = createAsyncThunk(
  "product/editproduct",
  async ({ id, updatedData }, { rejectWithValue }) => {
    if (!updatedData) {
      console.log("No data to update!");
      return rejectWithValue("No updated data provided");
    }

    try {
      const token = localStorage.getItem("token");

      const response = await axiosInstance.put(
        `/product/${id}`,
        updatedData,
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
      });
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

export const addProductCode = createAsyncThunk(
  "product/addProductCode",
  async ({ productId, codeData }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axiosInstance.post(
        `product/${productId}/codes`,
        codeData,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return { productId, productCode: response.data.productCode };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Product code creation failed",
      );
    }
  },
);

export const updateProductCode = createAsyncThunk(
  "product/updateProductCode",
  async ({ codeId, updates }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axiosInstance.put(
        `product/code/${codeId}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return response.data.productCode;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Product code update failed",
      );
    }
  },
);

export const deleteProductCode = createAsyncThunk(
  "product/deleteProductCode",
  async ({ codeId, productId }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      await axiosInstance.delete(`product/code/${codeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { codeId, productId };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Product code delete failed",
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
      })
      .addCase(gettingallproducts.rejected, (state) => {
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
      .addCase(Removeproduct.rejected, (state) => {
        state.isproductremove = false;
      })

      .addCase(Addproduct.pending, (state) => {
        state.isproductadd = true;
      })
      .addCase(Addproduct.fulfilled, (state, action) => {
        state.isproductadd = false;
        state.getallproduct.push(action.payload);
      })
      .addCase(Addproduct.rejected, (state) => {
        state.isproductadd = false;
      })

      .addCase(Searchproduct.pending, (state) => {
        state.issearchdata = true;
      })
      .addCase(Searchproduct.fulfilled, (state, action) => {
        state.issearchdata = false;
        state.searchdata = action.payload;
      })
      .addCase(Searchproduct.rejected, (state) => {
        state.issearchdata = false;
      })

      .addCase(EditProduct.pending, (state) => {
        state.iseditedProduct = true;
      })
      .addCase(EditProduct.fulfilled, (state, action) => {
        state.iseditedProduct = false;
        state.editedProduct = action.payload;
      })
      .addCase(EditProduct.rejected, (state) => {
        state.iseditedProduct = false;
      })

      .addCase(getTopProductsByQuantity.fulfilled, (state, action) => {
        const products = action.payload.topProducts || [];
        state.gettopproduct = products;
      })
      .addCase(getTopProductsByQuantity.rejected, () => {
        toast.error("Error fetching products");
      })

      .addCase(addProductCode.pending, (state) => {
        state.isproductcodeadd = true;
      })
      .addCase(addProductCode.fulfilled, (state, action) => {
        state.isproductcodeadd = false;
        const { productId, productCode } = action.payload || {};
        if (!productId || !productCode) return;
        const productIndex = state.getallproduct.findIndex(
          (product) => product._id === productId,
        );
        if (productIndex !== -1) {
          const existing = state.getallproduct[productIndex].productCodes || [];
          state.getallproduct[productIndex].productCodes = [
            productCode,
            ...existing,
          ];
          state.getallproduct[productIndex].totalQuantity =
            (state.getallproduct[productIndex].totalQuantity || 0) +
            Number(productCode.quantity || 0);
        }
      })
      .addCase(addProductCode.rejected, (state) => {
        state.isproductcodeadd = false;
      });

    builder
      .addCase(updateProductCode.pending, (state) => {
        state.isproductcodeupdate = true;
      })
      .addCase(updateProductCode.fulfilled, (state, action) => {
        state.isproductcodeupdate = false;
        const productCode = action.payload;
        if (!productCode?.product) return;
        const productIndex = state.getallproduct.findIndex(
          (product) => String(product._id) === String(productCode.product),
        );
        if (productIndex === -1) return;
        const codes = state.getallproduct[productIndex].productCodes || [];
        const updatedCodes = codes.map((code) =>
          String(code._id) === String(productCode._id) ? productCode : code,
        );
        state.getallproduct[productIndex].productCodes = updatedCodes;
        state.getallproduct[productIndex].totalQuantity = updatedCodes.reduce(
          (sum, code) => sum + Number(code.quantity || 0),
          0,
        );
      })
      .addCase(updateProductCode.rejected, (state) => {
        state.isproductcodeupdate = false;
      });

    builder
      .addCase(deleteProductCode.pending, (state) => {
        state.isproductcodedelete = true;
      })
      .addCase(deleteProductCode.fulfilled, (state, action) => {
        state.isproductcodedelete = false;
        const { codeId, productId } = action.payload || {};
        if (!codeId || !productId) return;
        const productIndex = state.getallproduct.findIndex(
          (product) => String(product._id) === String(productId),
        );
        if (productIndex === -1) return;
        const codes = state.getallproduct[productIndex].productCodes || [];
        const updatedCodes = codes.filter(
          (code) => String(code._id) !== String(codeId),
        );
        state.getallproduct[productIndex].productCodes = updatedCodes;
        state.getallproduct[productIndex].totalQuantity = updatedCodes.reduce(
          (sum, code) => sum + Number(code.quantity || 0),
          0,
        );
      })
      .addCase(deleteProductCode.rejected, (state) => {
        state.isproductcodedelete = false;
      });
  },
});

export default productSlice.reducer;
