const buildErrorPayload = (details) =>
  details.map((detail) => ({
    path: detail.path.join("."),
    message: detail.message,
  }));

const validateRequest =
  ({ body, query, params } = {}) =>
  (req, res, next) => {
    const targets = [
      ["params", params],
      ["query", query],
      ["body", body],
    ];

    for (const [segment, schema] of targets) {
      if (!schema) continue;

      const { error, value } = schema.validate(req[segment], {
        abortEarly: false,
        allowUnknown: false,
        convert: true,
        stripUnknown: true,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          details: buildErrorPayload(error.details),
        });
      }

      req[segment] = value;
    }

    return next();
  };

module.exports = validateRequest;
