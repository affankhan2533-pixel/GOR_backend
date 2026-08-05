/**
 * Standardized API Response Helper
 */
function sendSuccess(res, data = {}, message = "Success", statusCode = 200, pagination = null) {
  const response = {
    success: true,
    message,
    data,
  };
  if (pagination) {
    response.pagination = pagination;
  }
  return res.status(statusCode).json(response);
}

function sendError(res, error = "An error occurred", statusCode = 500, details = null) {
  const response = {
    success: false,
    error: typeof error === "string" ? error : error.message || "An error occurred",
  };
  if (details) {
    response.details = details;
  }
  return res.status(statusCode).json(response);
}

module.exports = {
  sendSuccess,
  sendError,
};
