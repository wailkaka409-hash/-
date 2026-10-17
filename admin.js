const $ = s => document.querySelector(s);
let adminPassword = "";
const labels = { basic:"عضو المعرض (عادي)", "team-red":"التيم الأساسي", "team-elite":"عضو النخبة", "team-gold":"عضو مميز" };
async function adminApi(action, data = {}) {
  const res = await fetch(`/.netlify/functions/api?action=${encodeURIComponent(action)}`, {
    method:"POST", headers:{"Content-Type":"application/json","x-admin-password":adminPassword}, body:JSON.stringify(data)
  });
  const body = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(body.error || "تعذر تنفيذ الطلب.");
  return body;
}
$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  adminPassword = $("#adminPassword").value;
  $("#loginError").textContent = "جارٍ التحقق…";
  try {
    await adminApi("admin-list");
    $("#loginPanel").hidden = true;
    $("#dashboard").hidden = false;
    $("#loginError").textContent = "";
    await loadMembers();
  } catch(err) { $("#loginError").textContent = err.message; adminPassword = ""; }
});
$("#refreshBtn").addEventListener("click", loadMembers);
async function loadMembers() {
  const holder = $("#memberList");
  holder.innerHTML = '<p class="muted">جارٍ تحميل الأعضاء…</p>';
  $("#memberError").textContent = "";
  try {
    const data = await adminApi("admin-list");
    holder.innerHTML = "";
    if (!data.members.length) { holder.innerHTML = '<p class="muted">لا يوجد أعضاء بعد. سجّل اسمًا من الصفحة الرئيسية أولًا.</p>'; return; }
    for (const member of data.members) {
      const row = document.createElement("div");
      row.className = "member-row";
      const created = member.created_at ? new Date(member.created_at).toLocaleDateString("ar") : "";
      const info = document.createElement("div");
      info.innerHTML = `<div class="member-name"></div><div class="member-sub"></div>`;
      info.querySelector(".member-name").textContent = member.nickname;
      info.querySelector(".member-sub").textContent = `بنره الحالي: ${labels[member.banner_id] || "عضو المعرض"}${created ? " · انضم " + created : ""}`;
      const select = document.createElement("select");
      select.setAttribute("aria-label", `بنر ${member.nickname}`);
      for (const [value,label] of Object.entries(labels)) { const opt=document.createElement("option");opt.value=value;opt.textContent=label;if(value===member.banner_id)opt.selected=true;select.append(opt); }
      const button = document.createElement("button");
      button.className = "btn btn-primary"; button.textContent = "حفظ البنر";
      button.addEventListener("click", async () => {
        button.disabled = true; button.textContent = "جارٍ الحفظ…";
        try { await adminApi("admin-assign", { member_id: member.id, banner_id: select.value }); button.textContent = "تم الحفظ ✓"; await loadMembers(); }
        catch(err) { $("#memberError").textContent = err.message; button.disabled=false; button.textContent="حفظ البنر"; }
      });
      row.append(info, select, button); holder.append(row);
    }
  } catch(err) { holder.innerHTML=""; $("#memberError").textContent = err.message; if (String(err.message).includes("غير صحيحة")) { $("#dashboard").hidden=true;$("#loginPanel").hidden=false;adminPassword=""; } }
}
