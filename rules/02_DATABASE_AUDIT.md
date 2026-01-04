audit **sebagai ERP & accounting system**, bukan sekadar “jalan atau tidak”.

Saya bagi jadi **TEMUAN KRITIS → DAMPAK → SOLUSI PRAKTIS (tanpa rewrite besar)**.

---

## 🚨 TEMUAN KRITIS (WAJIB DIBENAHI)

### 1️⃣ **HPP & Harga masih hidup di master**

**Temuan:**

- `products.base_hpp`
- `product_variants.harga_jual_umum`
- `product_variants.harga_khusus`
- `order_items.hpp`

❌ Ini **anti-ledger**.

**Dampak:**

- HPP bisa berubah ke belakang
- Laporan laba bisa “geser” tanpa transaksi
- Reverse jadi tidak simetris

### ✅ SOLUSI PRAKTIS

- ❌ **STOP pakai** `products.base_hpp`
- ❌ Jangan update `harga_jual_*` untuk histori
- ✅ **Freeze harga & HPP di transaksi**:
    - `sales_order_items.unit_price`
    - `sales_order_items.hpp`
- `product_variant_price_history` → **read-only audit log**, bukan sumber kebenaran

---

### 2️⃣ **Stok masih campur antara COUNTER & LEDGER**

**Temuan:**

- `product_variants.stock_qty`
- `product_variants.initial_stock`
- `stock_movements` sudah ada (bagus)

❌ `initial_stock` + manual update = rawan dobel

### ✅ SOLUSI PRAKTIS

- Anggap `stock_movements` = **single source of truth**
- `product_variants.stock_qty` = **cache saja**
- `initial_stock`:
    - dipakai **sekali saat cut-off**
    - setelah itu **LOCK**

Tambahkan rule:

> Tidak boleh ada UPDATE stock_qty tanpa INSERT stock_movements
> 

---

### 3️⃣ **Sales Order menyimpan terlalu banyak hasil hitung**

**Temuan:**

- `sales_orders.total_amount`
- `total_hpp`
- `profit`

❌ Ini **derived fields**.

### ✅ SOLUSI PRAKTIS

- Tetap boleh disimpan (performance)
- Tapi:
    - **READ-ONLY**
    - Dibentuk **saat confirm**
    - Bisa direbuild dari item + journal

Tambahkan flag:

```
is_calculated = true

```

---

### 4️⃣ **Channel & Produk bercampur di data**

**Temuan:**

- `sales_orders.marketplace`
- `sales_orders.customer_name`
- `order_items.product_name`

❌ Ini denormalisasi liar.

### ✅ SOLUSI PRAKTIS (TIDAK DIHAPUS)

- Anggap ini **snapshot historis**
- Jangan dipakai untuk logic
- Logic selalu pakai:
    - `customer_id`
    - `product_id / variant_id`
    - `product_type`

---

### 5️⃣ **journal_account_mappings sudah benar, tapi belum dikunci**

**Temuan:**

- Mapping sudah ada ✔️
- Tapi tidak terlihat constraint lengkap

### ✅ SOLUSI PRAKTIS

Tambahkan:

```sql
unique(event_type, event_context, product_type, side, priority)

```

Dan rule:

> Event tanpa mapping → FAIL TRANSACTION
> 

---

## ⚠️ TEMUAN MENENGAH (SEGERA DIRAPIKAN)

### 6️⃣ **Terlalu banyak history table tumpang tindih**

**Temuan:**

- `product_price_history`
- `product_variant_price_history`

### Solusi:

- Pilih **SATU**
- Rekomendasi:
    - ❌ hapus `product_price_history`
    - ✅ pakai `product_variant_price_history` saja

---

### 7️⃣ **Retur sudah ada tabel, tapi rawan double logic**

**Temuan:**

- `sales_returns` + `sales_return_lines`
- Tapi juga ada `reverse_sales_order` logic (event-based)

### Solusi:

- `sales_returns` = **UI & business event**
- Jurnal & stok tetap lewat:
    - inventory_moves
    - journal_entries
- Jangan bikin jurnal manual dari return table

---

## ✅ YANG SUDAH BAGUS (JANGAN DIUBAH)

✔ `journal_entries` + `journal_lines` (ledger style)

✔ `stock_movements` (sudah benar arahnya)

✔ `accounting_periods` + closing

✔ `customer_payment_allocations` (ERP-level bagus)

✔ `journal_account_mappings` (fondasi benar)

---

# 🛠️ ROADMAP PERBAIKAN PRAKTIS (TANPA REWRITE)

### PHASE 1 — LOCK DATA (1–2 hari)

- Jadikan:
    - `base_hpp`, `harga_jual_*` → **deprecated**
- Lock:
    - `initial_stock`
- Pastikan semua transaksi lewat event

---

### PHASE 2 — ENFORCE RULE (2–3 hari)

- Tambah constraint mapping
- Tambah fail-fast di edge function
- Pastikan reverse selalu mirror

---

### PHASE 3 — CLEANUP (opsional)

- Deprecate tabel history ganda
- Tambah view:
    - `v_stock_balance`
    - `v_sales_profit`

---

## 🧱 KESIMPULAN TEGAS

**Status saat ini:**

- ❌ Belum ERP-safe sepenuhnya
- ⚠️ Tapi **fondasi SUDAH ADA**
- ✅ Bisa diperbaiki **tanpa rewrite besar**

> Masalah Anda bukan salah desain total,tapi sisa-sisa pola “kasir” yang belum dibersihkan.
> 

Kalau mau langkah lanjut, saya bisa:

1️⃣ Buat **DDL perubahan minimal (ALTER TABLE saja)**

2️⃣ Buat **checklist QA sebelum prod**

3️⃣ Tandai **kolom mana yang harus dianggap deprecated**

Tinggal bilang mau lanjut yang mana.