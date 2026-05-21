const Joi = require("joi");

const positiveId = Joi.number().integer().positive();
const nonNegativeNumber = Joi.number().min(0);
const anyText = Joi.string().trim().min(1);
const optionalText = Joi.string().trim().allow("");

const idParam = (key) =>
  Joi.object({
    [key]: positiveId.required(),
  });

const queryParam = (key = "query") =>
  Joi.object({
    [key]: anyText.required(),
  });

const contactInfoSchema = Joi.object({
  phone: anyText.required(),
  address: optionalText.default(""),
}).required();

const productCodeItemSchema = Joi.object({
  code: anyText.required(),
  variantName: optionalText.default(""),
  quantity: Joi.number().integer().min(0).required(),
}).unknown(true);

const productCodeCreateBody = Joi.object({
  code: anyText.required(),
  variantName: optionalText.optional(),
  quantity: Joi.number().integer().min(0).optional(),
}).unknown(true);

const productCodeUpdateBody = Joi.object({
  code: anyText.optional(),
  variantName: optionalText.optional(),
  quantity: Joi.number().integer().min(0).optional(),
})
  .min(1)
  .unknown(true);

const invoiceItemSchema = Joi.object({
  name: anyText.required(),
  quantity: Joi.number().integer().min(1).required(),
  unitPrice: nonNegativeNumber.required(),
}).unknown(true);

const saleItemSchema = Joi.object({
  productCode: positiveId.required(),
  quantity: Joi.number().integer().min(1).required(),
  product: positiveId.optional(),
  price: nonNegativeNumber.optional(),
}).unknown(true);

const orderItemSchema = Joi.object({
  productCode: positiveId.required(),
  quantity: Joi.number().integer().min(1).required(),
  product: positiveId.optional(),
  price: nonNegativeNumber.optional(),
}).unknown(true);

const productBody = Joi.object({
  name: anyText.required(),
  description: optionalText.default(""),
  company: anyText.optional(),
  brand: anyText.optional(),
  Category: Joi.alternatives().try(positiveId, anyText).optional(),
  purchasePrice: nonNegativeNumber.optional(),
  tradePrice: nonNegativeNumber.optional(),
  salePrice: nonNegativeNumber.optional(),
  salesPrice: nonNegativeNumber.optional(),
  Price: nonNegativeNumber.optional(),
  productCodes: Joi.array().items(productCodeItemSchema).optional(),
  productCode: anyText.optional(),
  variantName: optionalText.optional(),
  quantity: Joi.number().integer().min(0).optional(),
})
  .xor("company", "brand")
  .unknown(true);

const productUpdateBody = Joi.object({
  name: anyText.required(),
  description: optionalText.default(""),
  company: anyText.optional(),
  brand: anyText.optional(),
  Category: Joi.alternatives().try(positiveId, anyText).optional(),
  purchasePrice: nonNegativeNumber.optional(),
  tradePrice: nonNegativeNumber.optional(),
  salePrice: nonNegativeNumber.optional(),
  salesPrice: nonNegativeNumber.optional(),
  Price: nonNegativeNumber.optional(),
  productCodes: Joi.array().items(productCodeItemSchema).optional(),
  productCode: anyText.optional(),
  variantName: optionalText.optional(),
  quantity: Joi.number().integer().min(0).optional(),
})
  .min(1)
  .unknown(true);

const categoryBody = Joi.object({
  name: anyText.required(),
});

const categoryUpdateBody = Joi.object({
  updatedCategory: Joi.object({
    name: anyText.required(),
  }).required(),
});

const customerBody = Joi.object({
  name: anyText.required(),
  contactInfo: Joi.object({
    phone: optionalText.required(),
    address: anyText.required(),
  })
    .required()
    .unknown(true),
  openingBalance: Joi.number().optional(),
  openingBalanceNote: optionalText.optional(),
}).unknown(true);

const customerUpdateBody = Joi.object({
  name: anyText.optional(),
  contactInfo: Joi.object({
    phone: optionalText.optional(),
    address: optionalText.optional(),
  })
    .optional()
    .unknown(true),
  openingBalance: Joi.number().optional(),
  openingBalanceNote: optionalText.optional(),
})
  .min(1)
  .unknown(true);

const customerOpeningBalanceBody = Joi.object({
  amount: Joi.number().positive().required(),
  notes: optionalText.optional(),
});

const supplierBody = Joi.object({
  name: anyText.required(),
  contactInfo: contactInfoSchema.optional(),
  productsSupplied: Joi.array()
    .items(Joi.alternatives().try(positiveId, anyText))
    .optional(),
  openingBalance: Joi.number().optional(),
  paymentTerms: optionalText.optional(),
})
  .min(1)
  .unknown(true);

const supplierUpdateBody = Joi.object({
  name: anyText.optional(),
  contactInfo: Joi.object({
    phone: optionalText.optional(),
    address: optionalText.optional(),
  })
    .optional()
    .unknown(true),
  productsSupplied: Joi.array()
    .items(Joi.alternatives().try(positiveId, anyText))
    .optional(),
  openingBalance: Joi.number().optional(),
  paymentTerms: optionalText.optional(),
})
  .min(1)
  .unknown(true);

const inventoryBody = Joi.object({
  productCode: positiveId.required(),
  quantity: Joi.number().integer().min(0).required(),
}).unknown(true);

const stockTransactionBody = Joi.object({
  productCode: positiveId.required(),
  type: Joi.string().valid("Stock-in", "Stock-out").required(),
  quantity: Joi.number().integer().min(1).required(),
  supplier: positiveId.optional(),
  vendor: positiveId.optional(),
  product: positiveId.optional(),
}).unknown(true);

const stockSearchQuery = queryParam();

const priceListBody = Joi.object({
  productName: anyText.required(),
  size: optionalText.optional(),
  price: nonNegativeNumber.required(),
}).unknown(true);

const priceListUpdateBody = Joi.object({
  productName: anyText.required(),
  size: optionalText.optional(),
  price: nonNegativeNumber.required(),
}).unknown(true);

const paymentBody = Joi.object({
  type: Joi.string().valid("paid", "received", "debit").required(),
  amount: Joi.number().positive().required(),
  method: optionalText.optional(),
  invoice: positiveId.optional(),
  partyType: Joi.string().valid("customer", "vendor").required(),
  customer: Joi.object().unknown(true).optional(),
  customerId: Joi.alternatives().try(positiveId, anyText).optional(),
  vendor: positiveId.optional(),
  paidAt: Joi.date().iso().optional(),
  description: optionalText.optional(),
  notes: optionalText.optional(),
}).unknown(true);

const ledgerParam = idParam;

const subscriptionPaymentBody = Joi.object({
  userId: positiveId.required(),
  amount: Joi.number().positive().required(),
}).unknown(true);

const invoiceBody = Joi.object({
  invoiceNumber: optionalText.optional(),
  invoiceType: Joi.string().valid("sales", "purchase").required(),
  customer: Joi.object().unknown(true).optional(),
  customerId: Joi.alternatives().try(positiveId, anyText).optional(),
  client: Joi.object().unknown(true).optional(),
  vendor: positiveId.optional(),
  items: Joi.array().items(invoiceItemSchema).min(1).required(),
  taxRate: nonNegativeNumber.optional(),
  discount: nonNegativeNumber.optional(),
  currency: anyText.optional(),
  dueDate: Joi.date().iso().optional(),
  notes: optionalText.optional(),
  paymentMethod: optionalText.optional(),
  status: optionalText.optional(),
  carage: nonNegativeNumber.optional(),
}).unknown(true);

const invoiceUpdateBody = Joi.object({
  invoiceNumber: optionalText.optional(),
  invoiceType: Joi.string().valid("sales", "purchase").optional(),
  customer: Joi.object().unknown(true).optional(),
  customerId: Joi.alternatives().try(positiveId, anyText).optional(),
  client: Joi.object().unknown(true).optional(),
  vendor: positiveId.optional(),
  items: Joi.array().items(invoiceItemSchema).min(1).optional(),
  taxRate: nonNegativeNumber.optional(),
  discount: nonNegativeNumber.optional(),
  currency: anyText.optional(),
  dueDate: Joi.date().iso().optional(),
  notes: optionalText.optional(),
  paymentMethod: optionalText.optional(),
  status: optionalText.optional(),
  carage: nonNegativeNumber.optional(),
})
  .min(1)
  .unknown(true);

const saleBody = Joi.object({
  customerId: positiveId.required(),
  products: Joi.array().items(saleItemSchema).min(1).required(),
  paymentMethod: optionalText.optional(),
  status: optionalText.optional(),
  receivedAmount: nonNegativeNumber.optional(),
  carage: nonNegativeNumber.optional(),
}).unknown(true);

const saleUpdateBody = Joi.object({
  customerId: positiveId.optional(),
  products: Joi.array().items(saleItemSchema).min(1).optional(),
  paymentMethod: optionalText.optional(),
  status: optionalText.optional(),
  receivedAmount: nonNegativeNumber.optional(),
  carage: nonNegativeNumber.optional(),
})
  .min(1)
  .unknown(true);

const orderBody = Joi.object({
  Product: orderItemSchema.optional(),
  products: Joi.array().items(orderItemSchema).min(1).optional(),
  status: anyText.required(),
  supplier: positiveId.optional(),
  vendor: positiveId.optional(),
})
  .custom((value, helpers) => {
    if (
      !value.Product &&
      (!Array.isArray(value.products) || !value.products.length)
    ) {
      return helpers.error("any.custom", {
        message: "Either Product or products is required",
      });
    }
    return value;
  })
  .unknown(true);

const orderStatusBody = Joi.object({
  status: anyText.required(),
}).unknown(true);

const activityBody = Joi.object({
  action: anyText.required(),
  entity: anyText.required(),
  entityId: positiveId.required(),
  ipAddress: optionalText.optional(),
}).unknown(true);

const authSignupBody = Joi.object({
  name: anyText.required(),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .trim()
    .lowercase()
    .required(),
  password: Joi.string().min(6).required(),
  ProfilePic: optionalText.optional(),
  role: Joi.string()
    .valid("admin", "staff", "manager", "super_admin")
    .optional(),
}).unknown(true);

const authLoginBody = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .trim()
    .lowercase()
    .required(),
  password: Joi.string().min(6).required(),
}).unknown(true);

const authOtpBody = Joi.object({
  challengeId: positiveId.required(),
  otp: Joi.string()
    .pattern(/^\d{6}$/)
    .required(),
}).unknown(true);

const authForgotPasswordBody = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .trim()
    .lowercase()
    .required(),
}).unknown(true);

const authResetPasswordBody = Joi.object({
  challengeId: positiveId.required(),
  otp: Joi.string()
    .pattern(/^\d{6}$/)
    .required(),
  password: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
}).unknown(true);

const profileBody = Joi.object({
  ProfilePic: anyText.required(),
}).unknown(true);

const paymentParam = idParam("id");

module.exports = {
  activityBody,
  authLoginBody,
  authForgotPasswordBody,
  authOtpBody,
  authSignupBody,
  authResetPasswordBody,
  categoryBody,
  categoryUpdateBody,
  customerBody,
  customerOpeningBalanceBody,
  customerUpdateBody,
  idParam,
  invoiceBody,
  invoiceUpdateBody,
  inventoryBody,
  ledgerParam,
  orderBody,
  orderStatusBody,
  paymentBody,
  paymentParam,
  priceListBody,
  priceListUpdateBody,
  productBody,
  productCodeCreateBody,
  productCodeUpdateBody,
  productUpdateBody,
  profileBody,
  queryParam,
  saleBody,
  saleUpdateBody,
  stockSearchQuery,
  stockTransactionBody,
  subscriptionPaymentBody,
  supplierBody,
  supplierUpdateBody,
};
