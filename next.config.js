/** @type {import('next').NextConfig} */
module.exports = {
  experimental: { serverComponentsExternalPackages: ['pg', 'mongodb', 'bcryptjs'] },
};
