/**
 * Utility to get absolute URL for signatures to ensure they render correctly in PDFs
 * @param {string} location - The work location (e.g., 'Chennai', 'Bangalore')
 * @returns {string} - Absolute URL to the signature image
 */
export const getAbsoluteSignatureUrl = (location) => {
  const baseUrl = window.location.origin;
  const loc = (location || '').toLowerCase().trim();
  
  // Mapping locations to specific signatures
  if (loc === 'chennai') {
    return `${baseUrl}/signatures/uvaraj-sign.png`;
  } else if (loc === 'bangalore') {
    return `${baseUrl}/signatures/bala-sign.png`;
  }
  
  // Default fallback for other locations or if no location is provided
  return `${baseUrl}/signatures/default-sign.png`;
};
