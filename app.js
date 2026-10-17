const $ = (s) => document.querySelector(s);
const nameDialog = $("#nameDialog");
const nameForm = $("#nameForm");
const nicknameInput = $("#nicknameInput");
const nameError = $("#nameError");
const artDialog = $("#artDialog");
let currentProfile = null;
let allPhotos = [];

function safeText(value) { return String(value ?? ""); }
function setProfileUI(profile) {
  currentProfile = profile;
  const name = profile?.nickname || "زائر";
  $("#profileName").textContent = name;
  $(".avatar").textContent = name.trim().slice(0, 1) || "؟";
  $("#welcomeTitle").textContent = `أهلًا بك، ${name}`;
  const isTeam = profile?.banner_id && profile.banner_id !== "basic";
  $("#welcomeText").textContent = isTeam ? "عضو مميز من التيم الأساسي." : "أنت عضو في المعرض ببنر عادي.";
  const badge = $("#bannerBadge");
  badge.textContent = isTeam ? bannerLabel(profile.banner_id) : "عضو المعرض";
  badge.className = `banner-badge ${isTeam ? "banner-team" : "banner-basic"}`;
}
function bannerLabel(id) {
  return ({ "team-red": "التيم الأساسي", "team-elite": "عضو النخبة", "team-gold": "عضو مميز" })[id] || "عضو المعرض";
}
function getToken() { return localStorage.getItem("maared_member_token") || ""; }
async function api(action, data = {}) {
  const headers = { "Content-Type": "application/json" };
  if (getToken()) headers["x-member-token"] = getToken();
  const res = await fetch(`/.netlify/functions/api?action=${encodeURIComponent(action)}`, { method: "POST", headers, body: JSON.stringify(data) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "حدث خطأ. حاول مجددًا.");
  return body;
}
async function loadProfile() {
  if (!getToken()) return null;
  try { const data = await api("profile"); return data.member || null; }
  catch { localStorage.removeItem("maared_member_token"); return null; }
}
async function registerNickname(nickname) {
  return api("register", { nickname });
}
function renderPhotos() {
  const term = $("#searchInput").value.trim().toLocaleLowerCase();
  const sort = $("#sortSelect").value;
  let photos = allPhotos.filter(p => `${p.title} ${p.description || ""} ${p.artist || ""}`.toLocaleLowerCase().includes(term));
  if (sort === "az") photos.sort((a,b) => a.title.localeCompare(b.title, "ar"));
  else photos.sort((a,b) => (b.date || "").localeCompare(a.date || ""));
  $("#galleryGrid").innerHTML = "";
  $("#resultsCount").textContent = `${photos.length} نتيجة`;
  $("#artCount").textContent = allPhotos.length;
  $("#emptyState").hidden = photos.length > 0;
  for (const photo of photos) {
    const card = document.createElement("article");
    card.className = "art-card";
    card.tabIndex = 0;
    const image = photo.image ? `<img class="art-image" src="${escapeAttr(photo.image)}" alt="${escapeAttr(photo.title)}" loading="lazy">` : `<div class="art-placeholder" aria-hidden="true">M<span style="font-size:18px">✦</span></div>`;
    card.innerHTML = `${image}<div class="art-info"><h3>${escapeHtml(photo.title)}</h3><p>${escapeHtml(photo.description || "عمل فني من المعرض")}</p><div class="art-meta"><span>${escapeHtml(photo.artist || "فنان المعرض")}</span><span>عرض العمل ↗</span></div></div>`;
    const open = () => showArt(photo);
    card.addEventListener("click", open);
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    $("#galleryGrid").append(card);
  }
}
function escapeHtml(s) { return safeText(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[c]); }
function escapeAttr(s) { return escapeHtml(s); }
function showArt(photo) {
  $("#modalTitle").textContent = photo.title;
  $("#modalDescription").textContent = photo.description || "";
  const img = $("#modalImage");
  if (photo.image) { img.src = photo.image; img.hidden = false; $("#modalDownload").href = photo.download || photo.image; $("#modalDownload").hidden = false; }
  else { img.removeAttribute("src"); img.hidden = true; $("#modalDownload").hidden = true; }
  artDialog.showModal();
}
function openNameDialog() {
  nameError.textContent = "";
  nicknameInput.value = currentProfile?.nickname || "";
  nameDialog.showModal();
}
nameForm.addEventListener("submit", async e => {
  e.preventDefault();
  const nickname = nicknameInput.value.trim();
  if (nickname.length < 2 || nickname.length > 24) { nameError.textContent = "اكتب اسمًا من حرفين إلى 24 حرفًا."; return; }
  nameError.textContent = "جارٍ الحفظ…";
  try {
    const result = await registerNickname(nickname);
    localStorage.setItem("maared_member_token", result.token);
    setProfileUI(result.member);
    nameDialog.close();
  } catch (err) { nameError.textContent = err.message; }
});
$("#profileBtn").addEventListener("click", openNameDialog);
$("#changeNameBtn").addEventListener("click", openNameDialog);
$("#closeNameDialog").addEventListener("click", () => nameDialog.close());
$("#closeArtDialog").addEventListener("click", () => artDialog.close());
nameDialog.addEventListener("click", e => { if (e.target === nameDialog) nameDialog.close(); });
artDialog.addEventListener("click", e => { if (e.target === artDialog) artDialog.close(); });
$("#searchInput").addEventListener("input", renderPhotos);
$("#sortSelect").addEventListener("change", renderPhotos);

async function init() {
  try {
    const response = await fetch("/photos.json", { cache: "no-store" });
    const data = await response.json();
    allPhotos = Array.isArray(data) ? data : [];
  } catch { allPhotos = []; }
  renderPhotos();
  const profile = await loadProfile();
  if (profile) setProfileUI(profile);
  else openNameDialog();
}
init();
