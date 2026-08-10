import axiosInstance from "./axios";

export const lookupProductCodeByCode = async (code) => {
  const response = await axiosInstance.get("product/codes/lookup", {
    params: { code },
  });
  return response.data;
};

export const generateProductCode = async (productId, payload = {}) => {
  const response = await axiosInstance.post(
    `product/${productId}/codes/generate`,
    payload,
  );
  return response.data;
};
