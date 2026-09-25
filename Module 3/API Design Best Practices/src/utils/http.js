'use strict';

/**
 * Standardized HTTP response helper functions enforcing envelope design.
 */

function sendOk(res, data) {
  return res.status(200).json({ data });
}

function sendCreated(res, data) {
  return res.status(201).json({ data });
}

function sendList(res, data, meta) {
  return res.status(200).json({ data, meta });
}

function sendError(res, status, code, message, details) {
  const error = { code, message };
  if (details) {
    error.details = details;
  }
  return res.status(status).json({ error });
}

module.exports = {
  sendList,
  sendCreated,
  sendOk,
  sendError,
};
