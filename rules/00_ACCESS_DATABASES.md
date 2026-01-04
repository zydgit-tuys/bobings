# 🚨 CRITICAL RULE FOR DATABASE ACCESS 🚨

Environment: Windows + Docker Desktop + Supabase Local.

PROBLEM:
Windows saya TIDAK memiliki 'psql' binary.
JANGAN PERNAH menjalankan perintah diawali `psql ...` di terminal. Itu pasti error.

SOLUTION:
Setiap kali kamu mau menjalankan Query SQL atau mengecek tabel, GUNAKAN PATTERN INI:

docker exec -i <nama_container_db> psql -U postgres -d postgres -c "QUERY_KAMU_DISINI"

Contoh Benar:
docker exec -i supabase_db_mmynikcisbwuqqyzqgkt psql -U postgres -d postgres -c "SELECT * FROM product_variants;"

Jika query terlalu panjang/kompleks:
1. Tuliskan query SQL-nya saja.
2. Minta saya paste ke Supabase Studio (http://127.0.0.1:54323).