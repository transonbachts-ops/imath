/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    '26.170.136.218', 
    'localhost:3000', 
    '*.ngrok-free.app', 
    '*.ngrok.io'
  ],
  serverExternalPackages: ['mysql2', 'jsonwebtoken'],
};

export default nextConfig;
