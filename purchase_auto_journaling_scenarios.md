# Panduan Auto-Journaling Modul Purchase

Dokumen ini menjelaskan alur akuntansi otomatis (Auto-Journaling) untuk berbagai skenario di sistem ERP, mulai dari penerimaan barang hingga retur.

## 1. Konsep Dasar Akun
Sistem menggunakan tiga akun utama untuk modul pembelian:
- **Persediaan Barang**: Akun Aset untuk mencatat nilai fisik barang di gudang.
- **Hutang Supplier**: Akun Kewajiban (Liability) untuk mencatat kewajiban bayar ke vendor.
- **Kas / Bank**: Akun Aset untuk mencatat pengeluaran uang.

---

## 2. Deskripsi Skenario Auto-Journaling

### A. Penerimaan Barang Partial (Penerimaan Bertahap)
Terjadi saat barang yang dipesan datang sebagian (misal: pesan 10, datang 5).
- **Jurnal Otomatis:**
    - **DEBIT**: Persediaan Barang Dagang (+ Nilai 5 barang)
    - **CREDIT**: Hutang Supplier (+ Nilai 5 barang)
- **Logika**: Sistem mengakui penambahan stok dan mencatat "Janji Bayar" (Hutang) hanya untuk jumlah barang yang sudah diterima secara fisik.

### B. Pembayaran Partial (Cicilan)
Terjadi saat Anda membayar sebagian tagihan kepada supplier (misal: bayar Rp 1jt dari total Rp 5jt).
- **Jurnal Otomatis:**
    - **DEBIT**: Hutang Supplier (- Rp 1jt)
    - **CREDIT**: Kas / Bank (- Rp 1jt)
- **Logika**: Kewajiban hutang Anda berkurang seiring dengan keluarnya uang dari kas/bank perusahaan.

### C. Barang Retur SEBELUM Pembayaran Lunas
Terjadi saat Anda mengembalikan barang rusak sementara Anda masih punya sisa hutang ke supplier tersebut.
- **Jurnal Otomatis:**
    - **DEBIT**: Hutang Supplier (- Nilai Retur)
    - **CREDIT**: Persediaan Barang Dagang (- Nilai Retur)
- **Logika**: Ini adalah skenario **"Potong Tagihan"**. Karena barang dikembalikan, sistem secara otomatis mengurangi kewajiban hutang Anda. Total yang harus dibayar ke supplier menjadi: `(Total Awal - Nilai Retur)`. Anda cukup membayar sisanya saja.

### D. Barang Retur SETELAH Pembayaran Lunas
Terjadi saat barang diretur namun Anda sudah terlanjur membayar lunas seluruh pesanan.
- **Jurnal Otomatis:**
    - **DEBIT**: Hutang Supplier (- Nilai Retur / Menjadi Saldo Debit)
    - **CREDIT**: Persediaan Barang Dagang (- Nilai Retur)
- **Logika**: Stok berkurang. Karena hutang awal sudah 0, akun Hutang Supplier akan memiliki **saldo Debit**. Dalam akuntansi, saldo debit di akun hutang berarti **Supplier berhutang kepada Anda** (berfungsi sebagai Deposit atau Piutang Supplier). Saldo ini bisa digunakan untuk memotong pembayaran di transaksi berikutnya.

---

## 3. Matriks Kondisi & Status Purchase

| Kondisi | Status PO | Dampak Akuntansi |
| :--- | :--- | :--- |
| **Pesan Barang** | `Ordered` | Belum ada jurnal (Baru komitmen). |
| **Terima Sebagian** | `Partial` | Hutang ↑, Persediaan ↑ (Sesuai qty datang). |
| **Bayar DP / Cicil** | `Partial` | Hutang ↓, Kas/Bank ↓. |
| **Barang Sampai Semua** | `Received` | Hutang ↑, Persediaan ↑ (Sampai total PO terpenuhi). |
| **Retur Sebagian** | `Partial` / `Completed`* | Hutang ↓, Persediaan ↓. |
| **Semua Diterima & Lunas**| `Completed` | Saldo Hutang kembali ke 0. |

> [!NOTE]  
> \*Jika Retur menyebabkan total yang diterima (Diterima - Retur) sama dengan yang dipesan, dan pembayaran sudah sesuai nilai neto tersebut, maka status akan otomatis berubah menjadi `Completed`.

---

## 4. Contoh Kombinasi Kasus (End-to-End)

**Skenario**: Pesan 10 barang @Rp 100.000 (Total Rp 1.000.000).

1.  **Terima 5 barang**:
    - Jurnal: Persediaan (+500rb) \| Hutang (+500rb)
2.  **Bayar 700rb (Overpayment/DP)**:
    - Jurnal: Hutang (-700rb) \| Kas (-700rb)
    - *Status Hutang*: Saldo -200rb (Anda punya deposit 200rb di supplier).
3.  **Terima sisa 5 barang**:
    - Jurnal: Persediaan (+500rb) \| Hutang (+500rb)
    - *Status Hutang*: Saldo 300rb (Kekurangan yang harus dibayar).
4.  **Retur 1 barang rusak**:
    - Jurnal: Hutang (-100rb) \| Persediaan (-100rb)
    - *Status Hutang*: Saldo 200rb.
5.  **Pelunasan Sisa (200rb)**:
    - Jurnal: Hutang (-200rb) \| Kas (-200rb)
    - *Status Akhir*: Hutang 0, Persediaan (9 barang), Kas keluar (900rb). **LUNAS & SELESAI**.
