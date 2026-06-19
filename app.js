const products = [
  { id: 1, name: "Hamburger", price: 120 },
  { id: 2, name: "Pizza", price: 180 },
  { id: 3, name: "Patates Kızartması", price: 60 },
  { id: 4, name: "Kola", price: 35 },
  { id: 5, name: "Kahve", price: 45 },
];

let cart = [];
let posOrders = [];
let activePosOrderId = null;
let nextOrderNo = 1;
let nextReceiptNo = 1;
let posAnimation = null;
let paymentDoneAnimation = null;

$(document).ready(function () {
  loadState();
  renderProducts();
  renderCart();
  renderPosOrders();
  renderKitchenOrders();
  loadPosAnimation();
  loadPaymentDoneAnimation();

  $("#sendToPosBtn").on("click", sendCartToPos);
  $("#payBtn").on("click", makePayment);
});

function loadPosAnimation() {
  posAnimation = lottie.loadAnimation({
    container: document.getElementById("posAnimation"),
    renderer: "svg",
    loop: true,
    autoplay: true,
    path: "pos-animation.json",
  });
}

function renderProducts() {
  const productList = $("#productList");
  productList.empty();

  products.forEach((product) => {
    productList.append(`
      <div class="product-card" data-id="${product.id}">
        <div class="product-name">${product.name}</div>
        <div class="product-price">₺${product.price}</div>
      </div>
    `);
  });

  $(".product-card").on("click", function () {
    const productId = Number($(this).data("id"));
    addToCart(productId);
  });
}

function addToCart(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  const existingItem = cart.find((item) => item.id === productId);

  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({
      ...product,
      quantity: 1,
    });
  }

  renderCart();
  showToast(`${product.name} sepete eklendi`, "success");
  saveState();
}

function renderCart() {
  const cartList = $("#cartList");
  cartList.empty();

  if (cart.length === 0) {
    cartList.html(`<p class="empty-text">Sepet boş</p>`);
    $("#cartTotal").text("₺0");
    return;
  }

  cart.forEach((item) => {
    cartList.append(`
      <div class="cart-item">
        <div>
          <div class="cart-item-title">${item.name}</div>
          <small>₺${item.price} x ${item.quantity}</small>
        </div>

        <div class="cart-actions">
          <button class="qty-btn decrease-btn" data-id="${item.id}">-</button>
          <span class="qty-text">${item.quantity}</span>
          <button class="qty-btn increase-btn" data-id="${item.id}">+</button>
          <button class="remove-btn" data-id="${item.id}">Sil</button>
        </div>
      </div>
    `);
  });

  $("#cartTotal").text(`₺${calculateTotal(cart)}`);

  $(".increase-btn").on("click", function () {
    increaseCartItem(Number($(this).data("id")));
  });

  $(".decrease-btn").on("click", function () {
    decreaseCartItem(Number($(this).data("id")));
  });

  $(".remove-btn").on("click", function () {
    removeCartItem(Number($(this).data("id")));
  });
}

function increaseCartItem(productId) {
  const item = cart.find((x) => x.id === productId);
  if (!item) return;

  item.quantity++;
  renderCart();
}

function decreaseCartItem(productId) {
  const item = cart.find((x) => x.id === productId);
  if (!item) return;

  item.quantity--;

  if (item.quantity <= 0) {
    cart = cart.filter((x) => x.id !== productId);
  }

  renderCart();
}

function removeCartItem(productId) {
  cart = cart.filter((x) => x.id !== productId);
  renderCart();
}

function calculateTotal(list) {
  return list.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
}

function sendCartToPos() {
  if (cart.length === 0) {
    alert("Önce sepete ürün eklemelisin.");
    return;
  }

  const newOrder = {
    id: Date.now(),
    orderNo: nextOrderNo++,
    receiptNo: `POS-${String(nextReceiptNo++).padStart(4, "0")}`,
    items: structuredClone(cart),
    status: "waiting",
    kitchenStatus: "waiting",
    createdAt: new Date(),
  };

  posOrders.push(newOrder);

  cart = [];
  renderCart();

  renderPosOrders();
  renderKitchenOrders();
  saveState();
  showToast("Sipariş POS ekranına gönderildi", "info");
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderPosOrders() {
  const posOrderList = $("#posOrderList");
  posOrderList.empty();

  if (posOrders.length === 0) {
    posOrderList.html(`<p class="text-muted">Henüz sipariş yok</p>`);
    $("#posTotal").text("₺0");
    activePosOrderId = null;
    return;
  }

  posOrders.forEach((order) => {
    const total = calculateTotal(order.items);
    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const isActive = order.id === activePosOrderId;

    posOrderList.append(`
  <div class="pos-order-card ${isActive ? "active" : ""}" data-id="${order.id}">
    <div>
      <strong>Sipariş #${order.orderNo}</strong>
      <small>${formatTime(order.createdAt)} • ${itemCount} ürün</small>
    </div>

    <strong>₺${total}</strong>
  </div>
`);
  });

  $(".pos-order-card").on("click", function () {
    activePosOrderId = Number($(this).data("id"));
    renderActiveOrderDetail();
  });
}

function renderActiveOrderDetail() {
  const order = posOrders.find((x) => x.id === activePosOrderId);
  if (!order) return;

  const posOrderList = $("#posOrderList");
  posOrderList.empty();

  const total = calculateTotal(order.items);

  posOrderList.append(`
    <button class="back-to-orders-btn">← Siparişlere dön</button>

    <div class="terminal-screen">
      <div class="terminal-header">
        <span>SATIŞ</span>
        <strong>#${order.orderNo}</strong>
      </div>

      <div class="terminal-meta">
        <span>${formatTime(order.createdAt)}</span>
        <span>${order.receiptNo}</span>
      </div>

      <div class="terminal-divider"></div>

      <div class="terminal-items"></div>

      <div class="terminal-divider"></div>

      <div class="terminal-total">
        <span>TOPLAM</span>
        <strong>₺${total}</strong>
      </div>

      <div class="terminal-message">
        Ödeme için aşağıdaki 'Ödeme Al' butona basınız
      </div>
    </div>
  `);

  const terminalItems = $(".terminal-items");

  order.items.forEach((item) => {
    terminalItems.append(`
      <div class="terminal-item">
        <span>${item.name}</span>
        <strong>${item.quantity} x ₺${item.price}</strong>
      </div>
    `);
  });

  $("#posTotal").text(`₺${total}`);

  $(".back-to-orders-btn").on("click", function () {
    activePosOrderId = null;
    $("#posTotal").text("₺0");
    renderPosOrders();
  });
}

function makePayment() {
  const order = posOrders.find((x) => x.id === activePosOrderId);

  if (!order) {
    alert("Ödeme almak için önce POS ekranından bir sipariş seçmelisin.");
    return;
  }

  $("#payBtn")
    .prop("disabled", true)
    .text("Kart Bekleniyor...");

  $("#paymentOverlay").removeClass("d-none");

  $("#paymentWaiting").removeClass("d-none");
  $("#paymentLoading").addClass("d-none");
  $("#paymentSuccess").addClass("d-none");

  setTimeout(() => {
    $("#payBtn").text("Ödeme Alınıyor...");

    $("#paymentWaiting").addClass("d-none");
    $("#paymentLoading").removeClass("d-none");
    $("#paymentSuccess").addClass("d-none");
  }, 3500);

  setTimeout(() => {
    $("#paymentLoading").addClass("d-none");
    $("#paymentSuccess").removeClass("d-none");

    if (paymentDoneAnimation) {
      paymentDoneAnimation.goToAndPlay(0, true);
    }

    $("#payBtn").text("Ödeme Başarılı");
    showToast("Ödeme başarıyla alındı", "success");
  }, 5200);

  setTimeout(() => {
    $("#paymentOverlay").addClass("d-none");

    renderReceipt(order);

    posOrders = posOrders.filter((x) => x.id !== activePosOrderId);
    activePosOrderId = null;
    renderKitchenOrders();
    saveState();

    $("#posTotal").text("₺0");

    $("#payBtn")
      .prop("disabled", false)
      .text("Ödeme Al");

    setTimeout(() => {
      renderPosOrders();
    }, 7000);
  }, 7200);
}

function renderReceipt(order) {
  const now = new Date().toLocaleString("tr-TR");

  const total = calculateTotal(order.items);
  const vat = Math.round(total * 0.20);
  const subTotal = total - vat;

  let receiptHtml = `
    <div class="receipt">
      <h5>Ödeme Başarılı</h5>
      <p class="receipt-success">Temassız ödeme alındı</p>

      <div class="receipt-info">
        <span>Fiş No</span>
        <strong>${order.receiptNo}</strong>
      </div>

      <div class="receipt-info">
        <span>Sipariş No</span>
        <strong>#${order.orderNo}</strong>
      </div>

      <div class="receipt-info">
        <span>Tarih</span>
        <strong>${now}</strong>
      </div>

      <hr />
  `;

  order.items.forEach((item) => {
    receiptHtml += `
      <div class="receipt-item">
        <span>${item.name} x ${item.quantity}</span>
        <strong>₺${item.price * item.quantity}</strong>
      </div>
    `;
  });

  receiptHtml += `
      <hr />

      <div class="receipt-item">
        <span>Ara Toplam</span>
        <strong>₺${subTotal}</strong>
      </div>

      <div class="receipt-item">
        <span>KDV %20</span>
        <strong>₺${vat}</strong>
      </div>

      <div class="receipt-total">
        <span>Toplam</span>
        <strong>₺${total}</strong>
      </div>
    </div>
  `;

  $("#posOrderList").html(receiptHtml);
}


function loadPaymentDoneAnimation() {
  paymentDoneAnimation = lottie.loadAnimation({
    container: document.getElementById("paymentDoneAnimation"),
    renderer: "svg",
    loop: false,
    autoplay: false,
    path: "animations/payment-done.json",
  });
}

function showToast(message, type = "info") {
  const toastId = `toast-${Date.now()}`;

  $("#toastContainer").append(`
    <div id="${toastId}" class="custom-toast toast-${type}">
      ${message}
    </div>
  `);

  setTimeout(() => {
    $(`#${toastId}`).fadeOut(250, function () {
      $(this).remove();
    });
  }, 2500);
}

function saveState() {
  const state = {
    cart,
    posOrders,
    activePosOrderId,
    nextOrderNo,
    nextReceiptNo,
  };

  localStorage.setItem("pos_order_simulator_state", JSON.stringify(state));
}

function loadState() {
  const saveState = localStorage.getItem("pos_order_simulator_state");

  if (!saveState) return;

  const state = JSON.parse(saveState);

  cart = state.cart || [];
  posOrders = state.posOrders || [];
  activePosOrderId = state.activePosOrderId || null;
  nextOrderNo = state.newOrder || 1;
  nextOrderNo = state.nextOrderNo || 1;
}

function renderKitchenOrders() {
  const kitchenOrders = $("#kitchenOrders");
  kitchenOrders.empty();

  if (posOrders.length === 0) {
    kitchenOrders.html(`<p class="empty-text">Mutfakta sipariş yok</p>`);
    return;
  }

  posOrders.forEach((order) => {
    const statusText = getKitchenStatusText(order.kitchenStatus);
    const statusClass = getKitchenStatusClass(order.kitchenStatus);

    let itemsHtml = "";

    order.items.forEach((item) => {
      itemsHtml += `
        <div class="kitchen-item">
          ${item.quantity}x ${item.name}
        </div>
      `;
    });

    kitchenOrders.append(`
      <div class="kitchen-card">
        <div class="kitchen-card-header">
          <div>
            <strong>Sipariş #${order.orderNo}</strong>
            <div class="kitchen-time">${formatTime(order.createdAt)}</div>
          </div>

          <span class="kitchen-status ${statusClass}">
            ${statusText}
          </span>
        </div>

        <div class="kitchen-items">
          ${itemsHtml}
        </div>

        <button class="kitchen-action-btn" data-id="${order.id}">
          ${getKitchenButtonText(order.kitchenStatus)}
        </button>
      </div>
    `);
  });

  $(".kitchen-action-btn").on("click", function () {
    const orderId = Number($(this).data("id"));
    updateKitchenStatus(orderId);
  });
}

function getKitchenStatusText(status) {
  if (status === "waiting") return "Bekliyor";
  if (status === "preparing") return "Hazırlanıyor";
  if (status === "ready") return "Hazır";
  return "Bekliyor";
}

function getKitchenStatusClass(status) {
  if (status === "waiting") return "kitchen-waiting";
  if (status === "preparing") return "kitchen-preparing";
  if (status === "ready") return "kitchen-ready";
  return "kitchen-waiting";
}

function getKitchenButtonText(status) {
  if (status === "waiting") return "Hazırlamaya Başla";
  if (status === "preparing") return "Hazır Olarak İşaretle";
  if (status === "ready") return "Hazır";
  return "Hazırlamaya Başla";
}

function updateKitchenStatus(orderId) {
  const order = posOrders.find((x) => x.id === orderId);
  if (!order) return;

  if (order.kitchenStatus === "waiting") {
    order.kitchenStatus = "preparing";
    showToast(`Sipariş #${order.orderNo} hazırlanıyor`, "info");
  } else if (order.kitchenStatus === "preparing") {
    order.kitchenStatus = "ready";
    showToast(`Sipariş #${order.orderNo} hazır`, "success");
  }

  renderKitchenOrders();
  saveState();
}

