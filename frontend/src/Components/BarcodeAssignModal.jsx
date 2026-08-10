import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import { addProductCode } from "../features/productSlice";
import Button from "../UI/Button";
import Inputfield from "../UI/Inputfield";
import SelectDropdown from "../UI/SelectDropdown";

const getId = (value) => value?.id ?? value;

/**
 * Shown when a scanned code has no product_codes match. Lets the person who is
 * physically holding the item pick which product it belongs to, right where the
 * scan failed, instead of sending them off to Productpage to add it separately.
 */
const BarcodeAssignModal = ({ open, onClose, code, products = [], onAssigned }) => {
  const dispatch = useDispatch();
  const [productId, setProductId] = useState("");
  const [variantName, setVariantName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setProductId("");
      setVariantName("");
      setQuantity("");
    }
  }, [open, code]);

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: getId(product),
        label: `${product.name || "Unnamed"}${
          product.company || product.brand
            ? ` • ${product.company || product.brand}`
            : ""
        }`,
      })),
    [products],
  );

  if (!open) return null;

  const handleAssign = () => {
    if (!productId) {
      toast.error("Select which product this barcode belongs to");
      return;
    }

    setIsSubmitting(true);
    dispatch(
      addProductCode({
        productId,
        codeData: {
          code,
          variantName: variantName.trim(),
          quantity: Number(quantity || 0),
        },
      }),
    )
      .unwrap()
      .then((result) => {
        const product = products.find((item) => getId(item) === productId);
        toast.success(`"${code}" linked to ${product?.name || "product"}`);
        onAssigned?.(product, result.productCode);
      })
      .catch((error) => toast.error(error || "Failed to link barcode"))
      .finally(() => setIsSubmitting(false));
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
      role="presentation"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-slate-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Unknown barcode
            </h3>
            <p className="text-xs text-slate-500">
              This code isn't linked to any product yet.
            </p>
          </div>
          <Button onClick={onClose} variant="outline" size="sm" aria-label="Close">
            <FiX size={16} />
          </Button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            {code}
          </div>

          <SelectDropdown
            label="Link to product"
            placeholder="Select the product you scanned"
            options={productOptions}
            value={productId}
            onChange={setProductId}
            uppercase={false}
          />

          <div className="grid grid-cols-2 gap-3">
            <Inputfield
              label="Variant / shade (optional)"
              type="text"
              value={variantName}
              onChange={(event) => setVariantName(event.target.value)}
            />
            <Inputfield
              label="Starting quantity"
              type="number"
              min="0"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAssign}
              loading={isSubmitting}
              loadingText="Linking..."
              variant="primary"
              className="flex-1"
            >
              Link & Continue
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default BarcodeAssignModal;
