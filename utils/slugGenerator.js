/**
 * Generate a URL-friendly slug from a title
 * @param {string} title - The title to convert to slug
 * @returns {string} - URL-friendly slug
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    // Replace special characters and spaces with hyphens
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate a unique slug by appending a number if the slug already exists
 * @param {string} title - The title to convert to slug
 * @param {Array} existingSlugs - Array of existing slugs to check against
 * @returns {string} - Unique URL-friendly slug
 */
function generateUniqueSlug(title, existingSlugs = []) {
  let slug = generateSlug(title);
  let counter = 1;
  let uniqueSlug = slug;

  while (existingSlugs.includes(uniqueSlug)) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
}

module.exports = {
  generateSlug,
  generateUniqueSlug
}; 