import { useMemo } from "react";
import { useSelector } from "react-redux";

const fallbackBranding = {
  companyName: "InventorySouq",
  companyDescription: "",
  companyLogo: "",
};

export function useCompanyBranding() {
  const { user } = useSelector((state) => state.auth);

  return useMemo(
    () => ({
      companyName: String(user?.companyName || fallbackBranding.companyName),
      companyDescription: String(user?.companyDescription || ""),
      companyLogo: String(user?.companyLogo || ""),
    }),
    [user?.companyName, user?.companyDescription, user?.companyLogo],
  );
}

export default useCompanyBranding;
