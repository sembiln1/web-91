// ==========================================
// 1. KONFIGURASI FIREBASE & GLOBAL STATE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDlucMVwMUbw7Ab3t2AVzI13EOHUrqDNZw",
    authDomain: "web-kelas-5b83a.firebaseapp.com",
    databaseURL: "https://web-kelas-5b83a-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "web-kelas-5b83a",
    storageBucket: "web-kelas-5b83a.firebasestorage.app",
    messagingSenderId: "711947014423",
    appId: "1:711947014423:web:d8cb787c503d7d7538e752",
    measurementId: "G-RYNNLZCGY5"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// State Global
const me = localStorage.getItem('savedUser') || "Guest";
let isMaintenanceActive = false;

/** * Daftar bypass penulisan */
const bypassUsers = ["admin", "Tya", "9¹", "Kontol"]; 

// ==========================================
// 2. SISTEM PING ONLINE (SETIAP 5 DETIK)
// ==========================================
// Jalankan hanya jika user sudah login dan bukan di halaman login
if (me !== "Guest" && window.location.href.includes("page91.html")) {
    const userStatusRef = database.ref('log_online/' + me);
    
    // Ping awal
    userStatusRef.set({
        username: me,
        last_seen: firebase.database.ServerValue.TIMESTAMP
    });

    // Ping rutin setiap 5 detik
    setInterval(() => {
        userStatusRef.update({
            last_seen: firebase.database.ServerValue.TIMESTAMP
        });
    }, 5000);

    // Otomatis hapus jika tab ditutup atau koneksi putus
    userStatusRef.onDisconnect().remove();
}

// ==========================================
// 3. MONITORING MAINTENANCE (LIVE KICK)
// ==========================================
database.ref('maintenance/isLive').on('value', snap => {
    isMaintenanceActive = snap.val();
    
    const elStatus = document.getElementById('mtStatus');
    if (elStatus) {
        elStatus.innerText = isMaintenanceActive ? "Status: AKTIF" : "Status: NON-AKTIF";
        elStatus.style.color = isMaintenanceActive ? "#ff4d4d" : "#2ecc71";
        elStatus.style.fontWeight = "bold";
    }

    if (isMaintenanceActive === true) {
        if (!bypassUsers.includes(me)) {
            if (!window.location.href.includes("index.html")) {
                alert("🚨 SERVER MAINTENANCE!\nSistem sedang diperbarui, Anda dialihkan ke halaman utama.");
                window.location.href = "index.html";
            }
        }
    }
});

// ==========================================
// 4. SISTEM LOGIN (HARD-LOCKED SECURITY)
// ==========================================
const defaultUsers = [
    { user: "9¹", pass: "91" }, 
    { user: "admin", pass: "admin123" }, 
    { user: "Tya", pass: "tya123" }
];
for (let i = 1; i <= 25; i++) { defaultUsers.push({ user: "user" + i, pass: "pass" + i }); }

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const uInput = document.getElementById('username').value.trim();
        const pInput = document.getElementById('password').value.trim();

        const snapM = await database.ref('maintenance/isLive').once('value');
        if (snapM.val() === true && !bypassUsers.includes(uInput)) {
            return alert("⛔ MAINTENANCE MODE\nMaaf, hanya Admin & Staf Khusus yang bisa masuk.");
        }

        const snapCustom = await database.ref('users_custom/' + uInput).once('value');
        const customData = snapCustom.val();
        
        const isDefault = defaultUsers.find(u => u.user === uInput && u.pass === pInput);
        const isCustom = customData && customData.pass === pInput;

        if (isDefault || isCustom) {
            const snapBan = await database.ref('status_user/' + uInput).once('value');
            if (snapBan.val() === "banned") return alert("AKSES DIBLOKIR!");

            localStorage.setItem('savedUser', uInput);
            
            // Log online awal saat klik login
            database.ref('log_online/' + uInput).set({
                username: uInput, 
                last_seen: firebase.database.ServerValue.TIMESTAMP
            });

            if (uInput === "admin") { 
                tampilkanLogAdmin(); 
            } else { 
                window.location.href = "page91.html"; 
            }
        } else {
            alert('Username atau Password Salah!');
        }
    });
}

// ==========================================
// 5. ADMIN CONTROL FUNCTIONS (UPDATE)
// ==========================================

window.updateWebSekarang = function() {
    const teks = document.getElementById('inputTeks').value;
    if (!teks) return alert("Pesan kosong!");
    database.ref('konten_web').update({
        pesan: teks,
        waktu: new Date().toLocaleTimeString()
    }).then(() => alert("📢 Pengumuman berhasil di-update!"));
};

window.tambahUserCustom = function() {
    const user = document.getElementById('customUser').value.trim();
    const pass = document.getElementById('customPass').value.trim();
    if (!user || !pass) return alert("User/Pass tidak boleh kosong!");
    database.ref('users_custom/' + user).set({ pass: pass }).then(() => {
        alert("✅ User " + user + " berhasil didaftarkan!");
        document.getElementById('customUser').value = "";
        document.getElementById('customPass').value = "";
    });
};

window.updateJadwalSistem = function() {
    const jenis = document.getElementById('pilihJenisJadwal').value;
    const hari = document.getElementById('pilihHari').value;
    const isi = document.getElementById('isiJadwalBaru').value;
    if (!isi) return alert("Isi jadwal kosong!");
    database.ref('data_kelas/' + jenis + '/' + hari).set(isi).then(() => {
        alert("📅 Jadwal " + jenis + " hari " + hari + " diperbarui!");
    });
};

window.setRole = function(role) {
    const user = document.getElementById('adminUser').value.trim();
    if(!user) return alert("Masukkan nama user!");
    database.ref('roles/' + user).set(role).then(() => {
        alert("👑 " + user + " sekarang: " + role);
    });
};

window.setMaintenance = function(status) {
    database.ref('maintenance/isLive').set(status).then(() => {
        alert("Maintenance Mode: " + (status ? "ON" : "OFF"));
    });
};

// Monitoring User Online UI (List Admin)
database.ref('log_online').on('value', snap => {
    const list = document.getElementById('onlineList');
    if (list) {
        list.innerHTML = "";
        snap.forEach(c => {
            list.innerHTML += `<li class="list-item">🟢 ${c.key} <button onclick="banUser('${c.key}')" style="background:red; color:white; border:none; border-radius:3px; font-size:9px; cursor:pointer;">BAN</button></li>`;
        });
    }
});

window.banUser = (u) => {
    if(confirm("Ban " + u + "?")) database.ref('status_user/' + u).set('banned');
};

function tampilkanLogAdmin() {
    const p = document.getElementById('adminPanel');
    if (p) p.style.display = 'block';
}

// Cleanup Log Online (Sinkron dengan Ping 5 Detik)
setInterval(() => {
    const skrg = Date.now();
    database.ref('log_online').once('value', s => {
        s.forEach(c => { 
            // Toleransi 10 detik agar list tetap stabil
            if (skrg - (c.val().last_seen || 0) > 10000) { 
                c.ref.remove(); 
            } 
        });
    });
}, 5000);
