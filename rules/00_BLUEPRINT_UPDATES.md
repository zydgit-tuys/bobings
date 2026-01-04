Ini bisa Anda anggap sebagai **“blueprint final ERP UMKM Anda”**.

---

## 🎯 PRINSIP INTI (TIDAK BOLEH DILANGGAR)

1. **Ledger-based** (Inventory & Accounting)
2. **Event-driven** (Confirm / Reverse)
3. **COA berdasar sifat ekonomi**, bukan channel
4. **Channel = atribut transaksi**, bukan akun
5. **Harga & diskon frozen di transaksi**
6. **User tidak pernah memilih akun**

---

# 1️⃣ MASTER DATA LAYER

## 🧾 Products

**Fungsi:** Mendefinisikan *apa* yang dijual / dibeli

```
products
- id
- name
- category_id
- product_type      (production | purchased | service)
- is_sellable
- is_purchasable
- is_stockable
- has_variant
- default_price     (reference only)
- is_active

```

📌 **product_type = KUNCI**

- menentukan akun revenue
- menentukan akun HPP
- menentukan alur inventory

---

## 🧾 Product Variants

**Fungsi:** Identitas fisik (SKU)

```
product_variants
- id
- product_id
- sku_variant
- attributes (size, color, dll)
- price               (base reference)
- stock_qty           (CACHE)
- reserved_qty
- is_active

```

❌ Tidak ada:

- HPP
- stock_in / stock_out
- available_qty

---

## 🧾 Customers

**Fungsi:** Pihak pembeli

```
customers
- id
- code
- name
- customer_type_id
- is_active

```

---

## 🧾 Customer Types

**Fungsi:** Diskon default

```
customer_types
- id
- code
- name
- discount_percentage

```

📌 **Customer pricing per item = V2 (opsional)**

---

# 2️⃣ TRANSACTION LAYER

## 🧾 Sales Orders

```
sales_orders
- id
- order_no (auto sequence)
- customer_id
- channel        (manual | shopee | tokopedia | dll)
- status         (draft | pending | confirmed | reversed)
- confirmed_at

```

---

## 🧾 Sales Order Items

```
sales_order_items
- id
- sales_order_id
- product_variant_id
- product_type          (snapshot!)
- qty
- unit_price            (snapshot!)
- discount_percent
- discount_amount
- final_price

```

📌 **Semua angka di sini FROZEN**

---

# 3️⃣ INVENTORY LAYER (LEDGER)

## 📦 Inventory Moves

```
inventory_moves
- id
- product_variant_id
- qty (+ / -)
- unit_cost
- source_type
- source_id
- created_at

```

📌 **Satu-satunya sumber kebenaran stok**

---

# 4️⃣ ACCOUNTING LAYER

## 🧾 Chart of Accounts (LOCKED PATTERN)

### Revenue (berdasar SIFAT)

```
4001 Penjualan Produk Produksi
4002 Penjualan Produk Beli Jadi
4200 Pendapatan Jasa

```

### Contra Revenue

```
6010 Diskon Penjualan

```

### Other Income

```
7-101 Pendapatan Selisih Stok

```

📌 **Tidak ada akun channel**

---

## 🧾 Journal Entries

```
journal_entries
- id
- source_type
- source_id
- event_type
- created_at

```

## 🧾 Journal Lines

```
journal_lines
- journal_entry_id
- account_id
- debit
- credit

```

---

# 5️⃣ JOURNAL ACCOUNT MAPPING (V2 – ACTIVE)

## 🧠 journal_account_mappings

**Ini OTaknya**

```
journal_account_mappings
- event_type
- event_context      (manual | marketplace)
- product_type       (production | purchased | service)
- side               (debit | credit)
- account_id
- priority

```

📌 Edge function **SELALU resolve akun dari sini**

---

# 6️⃣ EVENT FLOW (REAL)

## ✅ Confirm Sales Order

**Event:** `confirm_sales_order`

### Revenue

- product_type = production → **4001**
- product_type = purchased → **4002**
- product_type = service → **4200**

### Jurnal

1. 
- Dr Piutang
- Cr Revenue (gross)
1. 
- Dr Diskon Penjualan
- Cr Piutang
1. 
- Dr HPP
- Cr Persediaan (jika stockable)

---

## 🔁 Reverse Sales Order

**Mirror exact**, tanpa hitung ulang.

---

# 7️⃣ PRICING LOGIC (LOCKED)

Urutan:

1. Customer pricing (v2)
2. Customer type discount
3. Variant base price

📌 **Harga & diskon disimpan di item**

---

# 8️⃣ CHANNEL HANDLING (LOCKED)

```
sales_orders.channel

```

Dipakai untuk:

- reporting
- filter
- dashboard

❌ Tidak mempengaruhi COA

---

# 9️⃣ UI / UX RULE (RINGKAS)

- User **tidak pernah pilih akun**
- Status jelas (pending / confirmed)
- Order no auto
- Harga readonly setelah confirm
- Reverse, bukan delete

---

# 🔟 REPORTING MODEL

- Revenue by Product Type
- Revenue by Channel (filter)
- Gross → Discount → Net Sales
- Inventory valuation from ledger
- Audit drill-down → journal → transaksi

---

## 🧱 KESIMPULAN FINAL

Dengan pola ini:

- ✅ ERP-safe
- ✅ Tidak redundant
- ✅ Mudah scaling
- ✅ Tidak perlu refactor besar
- ✅ Cocok produksi + marketplace

> COA stabil.Event jelas.Data menentukan akun.Channel hanya atribut.
>