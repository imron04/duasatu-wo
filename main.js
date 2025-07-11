// Data Global
let cartItems = [];
let totalAmount = 0;

// Format Rupiah
function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(amount);
}

// Update UI Keranjang
function updateCartUI() {
  const cartItemList = document.querySelector(".cart-items");
  const cartTotal = document.getElementById("cart-total");
  const cartCount = document.querySelector(".cart-icon span");

  // Kosongkan isi sebelumnya
  cartItemList.innerHTML = "";

  // Tampilkan ulang item
  cartItems.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "individual-cart-item cart-item";
    div.innerHTML = `
      <span>(${item.quantity}x) ${item.name}</span>
      <span class="cart-item-price">
        ${formatRupiah(item.price * item.quantity)}
        <button class="remove-item" data-index="${index}">
          <i class="fa-solid fa-times"></i>
        </button>
      </span>
    `;
    cartItemList.appendChild(div);
  });

  // Update total & count
  cartTotal.textContent = formatRupiah(totalAmount);
  cartCount.textContent = cartItems.length;

  // Hitung Fee 15% dan Grand Total
  const fee = totalAmount * 0.15;
  const grandTotal = totalAmount + fee;

  const feeTotal = document.getElementById("fee-total");
  const grandTotalEl = document.getElementById("grand-total");

  if (feeTotal && grandTotalEl) {
    feeTotal.textContent = formatRupiah(fee);
    grandTotalEl.textContent = formatRupiah(grandTotal);
  }

  // Fungsi hapus item
  document.querySelectorAll(".remove-item").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = e.currentTarget.dataset.index;
      removeItemFromCart(index);
    });
  });
}

// Tambahkan item ke keranjang
function addToCart(name, price) {
  const existingItem = cartItems.find((item) => item.name === name);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cartItems.push({ name, price, quantity: 1 });
  }
  totalAmount += price;
  updateCartUI();
}

// Hapus item dari keranjang
function removeItemFromCart(index) {
  const item = cartItems[index];
  totalAmount -= item.price * item.quantity;
  cartItems.splice(index, 1);
  updateCartUI();
}

// Buka modal keranjang
function openCartModal() {
  document.getElementById("cart-modal").classList.add("show");
}

// Tutup modal keranjang
function closeCartModal() {
  document.getElementById("cart-modal").classList.remove("show");
}

let isSubmitting = false;
// Kirim data ke Google Sheets
function kirimPesanKeSheets() {
  if (isSubmitting) return;
  isSubmitting = true;

  const namaInput = document.getElementById("nama-pemesan").value.trim();
  const nomorInput = document.getElementById("nomor-hp").value.trim();

  // Validasi data kosong - tutup modal langsung dan tampilkan alert
  if (cartItems.length === 0 || namaInput === "" || nomorInput === "") {
    isSubmitting = false;
    closeCartModal(); // Tutup modal segera
    Swal.fire({
      icon: "warning",
      title: "Data belum lengkap",
      text: "Silakan isi nama, nomor HP, dan pilih layanan.",
    });
    return;
  }

  const fee = Math.round(totalAmount * 0.15);
  const grandTotal = totalAmount + fee;

  let layanan = "";
  cartItems.forEach((item) => {
    const totalPrice = item.price * item.quantity;
    layanan += `(${item.quantity}x) ${item.name} - Rp${totalPrice}\n`;
  });

  const params = new URLSearchParams();
  params.append("nama", namaInput);
  params.append("nomor", nomorInput);
  params.append("layanan", layanan.trim());
  params.append("total", totalAmount);
  params.append("fee", fee);
  params.append("grand", grandTotal);

  const url = `https://script.google.com/macros/s/AKfycbxtTXYDpFa0QOQc5cHbbL3e1ZQZMmfDY3QbZBEGndcO_4KoinazZg5aIMWGjHCDScuL/exec?${params.toString()}`;
  const submitBtn = document.getElementById("kirim-btn");

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = "Mengirim...";
  }

  const xhr = new XMLHttpRequest();
  xhr.open("GET", url);

  xhr.onload = function () {
    isSubmitting = false;

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Kirim Pesanan";
    }

    try {
      const res = JSON.parse(xhr.responseText);
      if (res.status === "success") {
        // Tampilkan alert sukses dulu
        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: res.message,
        });

        // Tunggu 2 detik baru tutup modal dan reset form
        setTimeout(() => {
          closeCartModal();
          cartItems = [];
          totalAmount = 0;
          document.getElementById("nama-pemesan").value = "";
          document.getElementById("nomor-hp").value = "";
          updateCartUI();
        }, 1000);
      } else {
        closeCartModal(); // Tutup modal langsung jika error
        throw new Error(res.message || "Terjadi kesalahan");
      }
    } catch (error) {
      closeCartModal(); // Tutup modal langsung jika error
      Swal.fire({
        icon: "error",
        title: "Gagal",
        html: `<div>${error.message}</div>`,
      });
    }
  };

  xhr.onerror = function () {
    isSubmitting = false;

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Kirim Pesanan";
    }

    closeCartModal(); // Tutup modal langsung jika error koneksi
    Swal.fire({
      icon: "error",
      title: "Gagal",
      html: `
        <div>Tidak dapat terhubung ke server</div>
        <small>
          <a href="${url}" target="_blank">Klik di sini</a> untuk kirim manual.
        </small>`,
    });
  };

  xhr.send();
}

// ========== DOM Loaded ==========
document.addEventListener("DOMContentLoaded", () => {
  // Tambah ke keranjang
  document.querySelectorAll(".add-to-cart").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".card");
      const name = card.querySelector(".card-title").textContent;
      const priceText = card.querySelector(".price").getAttribute("data-price");
      const price = parseInt(priceText);
      addToCart(name, price);
    });
  });

  // Tombol buka keranjang
  const cartBtn = document.getElementById("cart-btn");
  if (cartBtn) cartBtn.addEventListener("click", openCartModal);

  // Tombol tutup keranjang
  const closeCart = document.querySelector(".close-cart");
  if (closeCart) closeCart.addEventListener("click", closeCartModal);

  // Tombol kirim
  const kirimBtn = document.getElementById("kirim-btn");
  if (kirimBtn) kirimBtn.addEventListener("click", kirimPesanKeSheets);

  // Burger menu toggle (mobile)
  const burgerBtn = document.getElementById("burger-btn");
  const sidebar = document.getElementById("mobile-sidebar");
  const closeSidebar = document.getElementById("close-sidebar");

  if (burgerBtn && sidebar && closeSidebar) {
    burgerBtn.addEventListener("click", () => {
      sidebar.classList.add("open");
    });

    closeSidebar.addEventListener("click", () => {
      sidebar.classList.remove("open");
    });
  }
});
