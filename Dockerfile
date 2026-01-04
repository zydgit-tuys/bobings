# Gunakan image Node.js versi ringan
FROM node:18-alpine

# Set working directory di dalam container
WORKDIR /app

# Copy package.json dan package-lock.json (jika ada)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy seluruh source code ke dalam container
COPY . .

# Expose port yang digunakan Vite (default 5173)
EXPOSE 5173

# Jalankan perintah dev dengan flag --host agar bisa diakses dari luar container
CMD ["npm", "run", "dev", "--", "--host"]